import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';

import { MayaActivityItem, OutreachApiService } from '../../services/outreach-api.service';
import { OutreachAuthService } from '../../services/outreach-auth.service';
import { HUB_BATCH_URL, buildRuns, errorMessage, filterBatchActivity, todayLabel } from './maya-run.util';

interface RunResultView {
  selectedLabel: string;
  runId: string;
  batchId: string;
  batchHref: string;
}

/**
 * "Run the Marketing Assistant" card on Marketing Assistant settings: run its
 * batch now (or stop it) for your workspace, and see the latest run with its
 * phases. Lifted from the 16Ahead hub's Admin > Marketing Assistant page
 * (2026-11-24) so a workspace owner can run it without an admin. The server
 * runs it only for the caller's own workspace and needs the Marketing
 * Assistant or the 16Ahead Suite.
 */
@Component( {
  selector: 'app-maya-run-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './maya-run-card.component.html',
  styleUrls: ['./maya-run-cards.css'],
} )
export class MayaRunCardComponent implements OnInit, OnDestroy {
  private readonly api = inject( OutreachApiService );
  private readonly auth = inject( OutreachAuthService );
  private subscription?: Subscription;
  private opts: { tenantId?: string; userId?: string; userEmail?: string; } = {};

  readonly tenantId = signal( '' );
  readonly runBusy = signal( false );
  readonly stopBusy = signal( false );
  readonly runStatus = signal( '' );
  readonly runResult = signal<any | null>( null );
  readonly currentRunId = signal( '' );
  readonly activity = signal<MayaActivityItem[]>( [] );
  readonly activityLoading = signal( false );

  readonly canRun = computed( () => !!this.tenantId() && !this.runBusy() );
  readonly canStop = computed( () => !!this.tenantId() && !this.stopBusy() && this.runBusy() );
  readonly latestRun = computed( () => {
    const run = buildRuns( this.activity() )[0];
    return run ? { ...run, batchHref: run.batchId ? `${HUB_BATCH_URL}?mayaBatch=${encodeURIComponent( run.batchId )}` : '' } : null;
  } );
  readonly resultView = computed<RunResultView | null>( () => {
    const result = this.runResult();
    if ( !result ) return null;
    const batchId = String( result.result?.mayaBatchId || '' );
    return {
      selectedLabel: result.result ? `Selected ${result.result?.selectedCount || 0} of ${result.result?.dailyDraftTarget || 0}` : '',
      runId: String( result.runId || 'n/a' ),
      batchId,
      batchHref: batchId ? `${HUB_BATCH_URL}?mayaBatch=${encodeURIComponent( batchId )}` : '',
    };
  } );

  ngOnInit (): void {
    this.subscription = combineLatest( [this.auth.getTenantId(), this.auth.getUser()] ).subscribe( ( [tenantId, user] ) => {
      if ( !tenantId || !user ) return;
      const next = String( tenantId ).trim();
      this.opts = { tenantId: next, userId: user.uid, userEmail: user.email || undefined };
      if ( next === this.tenantId() ) return;
      this.tenantId.set( next );
      this.currentRunId.set( '' );
      this.runResult.set( null );
      this.runStatus.set( '' );
      void this.refreshActivity();
    } );
  }

  ngOnDestroy (): void {
    this.subscription?.unsubscribe();
  }

  async runBatch (): Promise<void> {
    if ( !this.canRun() ) return;

    this.runBusy.set( true );
    this.currentRunId.set( '' );
    this.runResult.set( null );
    this.activity.set( [] );
    this.runStatus.set( `The Marketing Assistant started on ${todayLabel()}. The activity report will load after this run finishes.` );

    try {
      const response = await firstValueFrom( this.api.runMayaBatch( this.opts ) );
      this.runResult.set( response?.data || null );
      this.currentRunId.set( String( response?.data?.runId || '' ).trim() );
      this.runStatus.set( String( response?.message || 'Marketing Assistant run finished.' ) );
      await this.refreshActivity( this.currentRunId() || undefined );
    } catch ( err: any ) {
      this.runStatus.set( errorMessage( err, 'Unable to run the Marketing Assistant right now.' ) );
    } finally {
      this.runBusy.set( false );
    }
  }

  async stopBatch (): Promise<void> {
    if ( !this.tenantId() || this.stopBusy() ) return;

    this.stopBusy.set( true );
    this.runStatus.set( 'Stop requested for the Marketing Assistant. Waiting for the current run to acknowledge the stop request.' );
    try {
      const response = await firstValueFrom( this.api.stopMayaBatch( this.opts ) );
      this.runStatus.set( String( response?.message || 'Stop requested for the Marketing Assistant.' ) );
      await this.refreshActivity( this.currentRunId() || undefined );
    } catch ( err: any ) {
      this.runStatus.set( errorMessage( err, 'Unable to request a Marketing Assistant stop for your workspace.' ) );
    } finally {
      this.stopBusy.set( false );
    }
  }

  /** Also called after Catalyst's drafting duty runs (the page wires the card's `ran` output here). */
  async refreshActivity ( runIdOverride?: string ): Promise<void> {
    if ( !this.tenantId() ) {
      this.activity.set( [] );
      return;
    }

    const scopedRunId = String( runIdOverride || this.currentRunId() || '' ).trim();
    this.activityLoading.set( true );
    try {
      const activity = await firstValueFrom( this.api.getMayaBatchActivity( 100, !!scopedRunId, this.opts ) );
      this.activity.set( filterBatchActivity( activity, scopedRunId ) );
      if ( !this.activity().length && !this.runBusy() && !this.runResult() ) {
        this.runStatus.set( '' );
      }
    } catch ( err: any ) {
      this.activity.set( [] );
      this.runStatus.set( errorMessage( err, 'Unable to load Marketing Assistant activity for your workspace.' ) );
    } finally {
      this.activityLoading.set( false );
    }
  }
}
