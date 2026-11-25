import { Component, ElementRef, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subscription, catchError, combineLatest, firstValueFrom, of } from 'rxjs';

import { OutreachApiService, OutreachProvisioningState } from '../../services/outreach-api.service';
import { OutreachAuthService } from '../../services/outreach-auth.service';
import { WriteActionDirective } from '../../shared/write-access/write-action.directive';
import { errorMessage } from './maya-run.util';
import { SIMPLE_EMAIL, bulkSendingView, domainOf } from './bulk-sending.util';

/** The anchor the setup checklist's "Request" links to (/maya-settings#bulk-sending). */
export const BULK_SENDING_ANCHOR = 'bulk-sending';

/**
 * "Bulk sending" card on Marketing Assistant settings (2026-11-24): shows the
 * workspace's SendGrid provisioning in plain words and lets it ask for bulk
 * sending (POST /api/outreach/provisioning/request). The request goes to
 * the 16Ahead team's Admin › Provisioning queue, which approves it.
 */
@Component( {
  selector: 'app-bulk-sending-card',
  standalone: true,
  imports: [CommonModule, FormsModule, WriteActionDirective],
  templateUrl: './bulk-sending-card.component.html',
  styleUrls: ['./maya-run-cards.css', './bulk-sending-card.component.css'],
} )
export class BulkSendingCardComponent implements OnInit, OnDestroy {
  private readonly api = inject( OutreachApiService );
  private readonly auth = inject( OutreachAuthService );
  private readonly route = inject( ActivatedRoute );
  private readonly host = inject<ElementRef<HTMLElement>>( ElementRef );
  private subscription?: Subscription;
  private opts: { tenantId?: string; userId?: string; userEmail?: string; } = {};
  private scrolled = false;

  readonly anchor = BULK_SENDING_ANCHOR;
  readonly loading = signal( true );
  readonly loadError = signal( '' );
  readonly state = signal<Partial<OutreachProvisioningState> | null>( null );
  readonly formOpen = signal( false );
  readonly sending = signal( false );
  readonly submitError = signal( '' );
  readonly submitted = signal( '' );

  readonly senderEmail = signal( '' );
  readonly domain = signal( '' );
  readonly notes = signal( '' );
  /** The default sender: the connected inbox, else the signed-in email. */
  private readonly defaultSender = signal( '' );
  /** Once the domain is typed in, a new email no longer overwrites it. */
  private domainEdited = false;

  readonly view = computed( () => bulkSendingView( this.state() ) );
  readonly showRequestButton = computed( () => !this.loading() && !this.loadError() && this.view().canRequest && !this.formOpen() );
  readonly emailInvalid = computed( () => !!this.senderEmail().trim() && !SIMPLE_EMAIL.test( this.senderEmail().trim() ) );
  readonly canSubmit = computed( () => !this.sending() && SIMPLE_EMAIL.test( this.senderEmail().trim() ) && !!this.domain().trim() );

  ngOnInit (): void {
    this.subscription = combineLatest( [this.auth.getTenantId(), this.auth.getUser()] ).subscribe( ( [tenantId, user] ) => {
      if ( !tenantId || !user ) return;
      const next = { tenantId: String( tenantId ).trim(), userId: user.uid, userEmail: user.email || undefined };
      if ( next.tenantId === this.opts.tenantId && next.userId === this.opts.userId ) return;
      this.opts = next;
      this.defaultSender.set( String( user.email || '' ).trim().toLowerCase() );
      void this.load();
      void this.loadInbox();
    } );
  }

  ngOnDestroy (): void {
    this.subscription?.unsubscribe();
  }

  async load (): Promise<void> {
    this.loading.set( true );
    try {
      const response = await firstValueFrom( this.api.getOutreachProvisioning( this.opts ) );
      this.state.set( response?.data || null );
      this.loadError.set( '' );
    } catch ( err: any ) {
      this.loadError.set( errorMessage( err, "Couldn't load your bulk sending status." ) );
    } finally {
      this.loading.set( false );
      this.scrollIntoViewIfLinked();
    }
  }

  /** The connected inbox becomes the default sender. */
  private async loadInbox (): Promise<void> {
    const response = await firstValueFrom( this.api.listMailboxes( this.opts ).pipe( catchError( () => of( null ) ) ) );
    const connected = ( Array.isArray( response?.data ) ? response!.data : [] )
      .filter( ( m ) => m?.emailAddress && String( m.status || '' ).toLowerCase() !== 'disconnected' );
    const primary = connected.find( ( m ) => m.isPrimary ) || connected[0];
    if ( primary?.emailAddress ) this.defaultSender.set( String( primary.emailAddress ).trim().toLowerCase() );
  }

  openForm (): void {
    const email = String( this.state()?.senderEmail || '' ).trim() || this.defaultSender();
    this.senderEmail.set( email );
    this.domain.set( String( this.state()?.domain || '' ).trim() || domainOf( email ) );
    this.domainEdited = false;
    this.notes.set( '' );
    this.submitError.set( '' );
    this.submitted.set( '' );
    this.formOpen.set( true );
  }

  cancel (): void {
    this.formOpen.set( false );
    this.submitError.set( '' );
  }

  setEmail ( value: string ): void {
    this.senderEmail.set( value );
    if ( !this.domainEdited ) this.domain.set( domainOf( value ) );
  }

  setDomain ( value: string ): void {
    this.domainEdited = true;
    this.domain.set( value );
  }

  async submit (): Promise<void> {
    const senderEmail = this.senderEmail().trim().toLowerCase();
    const domain = this.domain().trim().toLowerCase().replace( /^@/, '' );
    if ( this.sending() ) return;
    if ( !SIMPLE_EMAIL.test( senderEmail ) ) {
      this.submitError.set( 'Enter the email address bulk emails should come from, like you@yourcompany.com.' );
      return;
    }
    if ( !domain ) {
      this.submitError.set( 'Enter the domain you send from, like yourcompany.com.' );
      return;
    }
    this.sending.set( true );
    this.submitError.set( '' );
    try {
      const response = await firstValueFrom( this.api.requestOutreachProvisioning( {
        senderEmail,
        domain,
        notes: this.notes().trim(),
      }, this.opts ) );
      const data = response?.data || ( {} as Partial<OutreachProvisioningState> );
      this.state.set( {
        ...( this.state() || {} ),
        provisioningStatus: data.provisioningStatus || 'requested',
        senderEmail: data.senderEmail || senderEmail,
        domain: data.domain || domain,
        requestedAt: data.requestedAt || new Date().toISOString(),
      } );
      this.formOpen.set( false );
      this.submitted.set( "Sent. The 16Ahead team has your request and you'll see it here once it's approved." );
    } catch ( err: any ) {
      this.submitError.set( errorMessage( err, "Couldn't send your request. Try again in a minute." ) );
    } finally {
      this.sending.set( false );
    }
  }

  /** /maya-settings#bulk-sending (the setup checklist's Request) lands on this card. */
  private scrollIntoViewIfLinked (): void {
    if ( this.scrolled || this.route.snapshot.fragment !== BULK_SENDING_ANCHOR ) return;
    this.scrolled = true;
    setTimeout( () => this.host.nativeElement.scrollIntoView?.( { behavior: 'smooth', block: 'start' } ), 0 );
  }
}
