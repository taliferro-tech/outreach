import { Component, EventEmitter, OnDestroy, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, combineLatest, firstValueFrom } from 'rxjs';

import { MayaDraftingDutyResult, MayaDraftingTimePreset, OutreachApiService } from '../../services/outreach-api.service';
import { OutreachAuthService } from '../../services/outreach-auth.service';
import { errorMessage } from './maya-run.util';

/**
 * "Catalyst drafting duty" card on Marketing Assistant settings: run the
 * hourly drafting chunk now - at the current time, pretending it's another
 * hour, or ignoring the window. Lifted from the 16Ahead hub's Admin >
 * Marketing Assistant page (2026-11-24) for the signed-in workspace. The
 * server runs it only for the caller's own workspace and needs the Marketing
 * Assistant or the 16Ahead Suite.
 */
@Component( {
  selector: 'app-catalyst-drafting-duty-card',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalyst-drafting-duty-card.component.html',
  styleUrls: ['./maya-run-cards.css'],
} )
export class CatalystDraftingDutyCardComponent implements OnInit, OnDestroy {
  private readonly api = inject( OutreachApiService );
  private readonly auth = inject( OutreachAuthService );
  private subscription?: Subscription;
  private opts: { tenantId?: string; userId?: string; userEmail?: string; } = {};

  /** After every run, so the page can refresh the latest-run activity. */
  @Output() readonly ran = new EventEmitter<void>();

  readonly tenantId = signal( '' );
  readonly draftingRunBusy = signal( false );
  readonly draftingRunStatus = signal( '' );
  readonly draftingRunResult = signal<MayaDraftingDutyResult | null>( null );
  readonly draftingTimePresets = signal<MayaDraftingTimePreset[]>( [] );
  readonly draftingSelectedPresetKey = signal( 'now' );
  readonly draftingPresetsLoading = signal( false );
  readonly draftingPresetsError = signal( '' );

  readonly canRunDraftingDuty = computed( () => !!this.tenantId() && !this.draftingRunBusy() );
  readonly presetsDisabled = computed( () => this.draftingPresetsLoading() || !this.draftingTimePresets().length );
  readonly draftingProgress = computed( () => {
    const result = this.draftingRunResult();
    const total = Number( result?.totalPlanned || 0 );
    const drafted = Number( result?.draftedSoFar || 0 );
    const window = result?.windowState;
    return {
      known: !!result && !result.skipped && total > 0,
      label: !!result && !result.skipped && total > 0 ? `${drafted} of ${total} drafted` : 'Progress shows after a run',
      percent: total ? Math.min( 100, Math.round( ( drafted / total ) * 100 ) ) : 0,
      windowLabel: window ? `Window ${window.rangeStartHour}:00–${window.rangeEndHour}:00` : '',
    };
  } );

  ngOnInit (): void {
    this.subscription = combineLatest( [this.auth.getTenantId(), this.auth.getUser()] ).subscribe( ( [tenantId, user] ) => {
      if ( !tenantId || !user ) return;
      const next = String( tenantId ).trim();
      this.opts = { tenantId: next, userId: user.uid, userEmail: user.email || undefined };
      if ( next === this.tenantId() ) return;
      this.tenantId.set( next );
      this.draftingRunResult.set( null );
      this.draftingRunStatus.set( '' );
      void this.loadDraftingTimePresets();
    } );
  }

  ngOnDestroy (): void {
    this.subscription?.unsubscribe();
  }

  async loadDraftingTimePresets (): Promise<void> {
    if ( !this.tenantId() || this.draftingPresetsLoading() ) return;

    this.draftingPresetsLoading.set( true );
    this.draftingPresetsError.set( '' );
    try {
      const response = await firstValueFrom( this.api.getMayaDraftingDutyTimePresets( this.opts ) );
      const presets = response?.data?.presets || [];
      this.draftingTimePresets.set( presets );
      if ( !presets.length ) {
        this.draftingPresetsError.set( 'No time presets were returned for your workspace.' );
      } else if ( !presets.some( preset => preset.key === this.draftingSelectedPresetKey() ) ) {
        this.draftingSelectedPresetKey.set( 'now' );
      }
    } catch ( err: any ) {
      this.draftingTimePresets.set( [] );
      this.draftingPresetsError.set( errorMessage( err, 'Unable to load time presets for your workspace.' ) );
    } finally {
      this.draftingPresetsLoading.set( false );
    }
  }

  async runDraftingDuty (): Promise<void> {
    const selected = this.draftingTimePresets().find( preset => preset.key === this.draftingSelectedPresetKey() );
    await this.executeDraftingDuty( {
      simulatedNow: selected?.simulatedNow || undefined,
      ignoreWindow: false,
      statusLabel: selected && selected.key !== 'now'
        ? `Running Catalyst drafting duty, simulating "${selected.label}"`
        : 'Running Catalyst drafting duty at the current time',
    } );
  }

  async forceDraftNow (): Promise<void> {
    await this.executeDraftingDuty( {
      simulatedNow: undefined,
      ignoreWindow: true,
      statusLabel: 'Force-drafting the next chunk right now (bypassing the window check)',
    } );
  }

  private async executeDraftingDuty ( options: { simulatedNow?: string; ignoreWindow: boolean; statusLabel: string; } ): Promise<void> {
    if ( !this.canRunDraftingDuty() ) return;

    this.draftingRunBusy.set( true );
    this.draftingRunResult.set( null );
    this.draftingRunStatus.set( `${options.statusLabel}...` );
    try {
      const response = await firstValueFrom( this.api.runMayaDraftingDuty( {
        simulatedNow: options.simulatedNow,
        ignoreWindow: options.ignoreWindow,
      }, this.opts ) );
      this.draftingRunResult.set( response?.data || null );
      this.draftingRunStatus.set( String( response?.message || 'Drafting duty run finished.' ) );
      this.ran.emit();
    } catch ( err: any ) {
      this.draftingRunStatus.set( errorMessage( err, 'Unable to run the drafting duty right now.' ) );
    } finally {
      this.draftingRunBusy.set( false );
    }
  }
}
