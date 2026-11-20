import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Subscription, combineLatest, firstValueFrom, map, merge } from 'rxjs';

import { OutreachApiService, OutreachLimits } from '../../services/outreach-api.service';
import { OutreachAuthService } from '../../services/outreach-auth.service';
import { WriteActionDirective } from '../../shared/write-access/write-action.directive';

type LimitField = 'dailyDraftTarget' | 'dailyAutoSendTarget';

const FIELD_LABELS: Record<keyof OutreachLimits, string> = {
  autoSendCcEmail: 'the auto-send BCC email',
  dailyDraftTarget: 'the daily draft target',
  dailyAutoSendTarget: 'the daily auto-send cap',
};

/**
 * "Limits and copies" card on Marketing Assistant settings: the auto-send
 * BCC address, daily draft target and daily auto-send cap. Lifted from the
 * 16Ahead Admin > Outreach settings page (2026-11-19) so a workspace owner can
 * change them without an admin. The stored field is still `autoSendCcEmail`.
 */
@Component( {
  selector: 'app-outreach-limits-card',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, WriteActionDirective],
  templateUrl: './outreach-limits-card.component.html',
  styleUrls: ['./outreach-limits-card.component.css'],
} )
export class OutreachLimitsCardComponent implements OnInit, OnDestroy {
  private readonly api = inject( OutreachApiService );
  private readonly auth = inject( OutreachAuthService );
  private subscription?: Subscription;
  private opts: { tenantId?: string; userId?: string; userEmail?: string; } = {};

  readonly form = inject( FormBuilder ).nonNullable.group( {
    autoSendCcEmail: ['', Validators.email],
    dailyDraftTarget: [100, [Validators.required, Validators.min( 1 ), Validators.max( 500 )]],
    dailyAutoSendTarget: [100, [Validators.required, Validators.min( 1 ), Validators.max( 500 )]],
  } );
  // statusChanges too, so a reset() (which can leave the values unchanged) still refreshes the save bar.
  private readonly values = toSignal(
    merge( this.form.valueChanges, this.form.statusChanges ).pipe( map( () => this.form.getRawValue() ) ),
    { initialValue: this.form.getRawValue() }
  );
  private readonly savedLimits = signal<OutreachLimits>( this.form.getRawValue() );

  readonly loading = signal( true );
  readonly saving = signal( false );
  readonly status = signal( '' );
  readonly statusIsError = signal( false );

  readonly ccEmail = computed( () => String( this.values().autoSendCcEmail || '' ).trim() );
  readonly ccValid = computed( () => !!this.ccEmail() && !this.form.controls.autoSendCcEmail.errors );
  readonly ccInvalid = computed( () => !!this.ccEmail() && !!( this.values(), this.form.controls.autoSendCcEmail.errors ) );
  readonly draftTarget = computed( () => Number( this.values().dailyDraftTarget ) || 0 );
  readonly autoSendTarget = computed( () => Number( this.values().dailyAutoSendTarget ) || 0 );

  /** What the three settings add up to. */
  readonly summary = computed( () => {
    const drafts = `Each morning the Marketing Assistant drafts up to ${this.draftTarget() || 100} emails.`;
    return this.ccValid()
      ? `${drafts} I send up to ${this.autoSendTarget() || 100} on my own, blind-copy (BCC) ${this.ccEmail()} on each, and hold the rest for you.`
      : `${drafts} Auto-send stays off until you add a BCC address, so every one waits for your review.`;
  } );

  /** Which settings differ from what's saved ('' when nothing changed). */
  readonly changedLabel = computed( () => {
    const v = this.values();
    const s = this.savedLimits();
    const changed = ( Object.keys( FIELD_LABELS ) as Array<keyof OutreachLimits> )
      .filter( key => String( v[key] ?? '' ).trim().toLowerCase() !== String( s[key] ?? '' ).trim().toLowerCase() )
      .map( key => FIELD_LABELS[key] );
    if ( !changed.length ) return '';
    if ( changed.length === 1 ) return `You changed ${changed[0]}`;
    return `You changed ${changed.length} settings`;
  } );

  ngOnInit (): void {
    this.subscription = combineLatest( [this.auth.getTenantId(), this.auth.getUser()] ).subscribe( ( [tenantId, user] ) => {
      if ( !tenantId || !user ) return;
      this.opts = { tenantId: String( tenantId ), userId: user.uid, userEmail: user.email || undefined };
      void this.load();
    } );
  }

  ngOnDestroy (): void {
    this.subscription?.unsubscribe();
  }

  async load (): Promise<void> {
    this.loading.set( true );
    try {
      const policy = ( await firstValueFrom( this.api.getOutreachLimits( this.opts ) ) ).data?.approvalPolicy || {};
      this.applySaved( policy );
      this.status.set( '' );
    } catch ( err: any ) {
      this.setStatus( String( err?.error?.message || err?.message || "Couldn't load the limits." ), true );
    } finally {
      this.loading.set( false );
    }
  }

  step ( field: LimitField, delta: number ): void {
    const control = this.form.controls[field];
    const next = Math.min( 500, Math.max( 1, ( Number( control.value ) || 0 ) + delta ) );
    control.setValue( next );
    control.markAsDirty();
  }

  discard (): void {
    this.form.reset( this.savedLimits() );
    this.status.set( '' );
  }

  async save (): Promise<void> {
    if ( this.saving() ) return;
    if ( this.form.invalid ) {
      this.setStatus( 'Check the highlighted fields: the BCC must be an email address and the limits between 1 and 500.', true );
      return;
    }
    this.saving.set( true );
    try {
      const v = this.form.getRawValue();
      const policy = ( await firstValueFrom( this.api.saveOutreachLimits( {
        autoSendCcEmail: v.autoSendCcEmail.trim().toLowerCase(),
        dailyDraftTarget: Number( v.dailyDraftTarget ),
        dailyAutoSendTarget: Number( v.dailyAutoSendTarget ),
      }, this.opts ) ) ).data?.approvalPolicy || {};
      this.applySaved( policy );
      this.setStatus( 'Saved.', false );
    } catch ( err: any ) {
      this.setStatus( String( err?.error?.message || err?.message || "Couldn't save that." ), true );
    } finally {
      this.saving.set( false );
    }
  }

  private applySaved ( policy: Partial<OutreachLimits> ): void {
    const limits: OutreachLimits = {
      autoSendCcEmail: String( policy.autoSendCcEmail || '' ),
      dailyDraftTarget: Number( policy.dailyDraftTarget ) || 100,
      dailyAutoSendTarget: Number( policy.dailyAutoSendTarget ) || 100,
    };
    this.savedLimits.set( limits );
    this.form.reset( limits );
  }

  private setStatus ( message: string, isError: boolean ): void {
    this.status.set( message );
    this.statusIsError.set( isError );
  }
}
