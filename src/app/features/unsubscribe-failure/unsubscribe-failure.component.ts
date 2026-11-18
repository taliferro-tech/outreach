import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { environment } from '../../../environments/environment';

/** sha256 of the trimmed, lowercased address, as the unsubscribe link carries it. */
export async function emailHash ( email: string ): Promise<string> {
  const bytes = new TextEncoder().encode( String( email || '' ).trim().toLowerCase() );
  const digest = await crypto.subtle.digest( 'SHA-256', bytes );
  return Array.from( new Uint8Array( digest ) ).map( ( b ) => b.toString( 16 ).padStart( 2, '0' ) ).join( '' );
}

/**
 * Where the unsubscribe link lands when the backend couldn't record it. The
 * fallback form posts the typed address (hashed) to the same public one-click
 * unsubscribe endpoint the inbox button uses, which marks the contact and adds
 * the address to the workspace's do-not-email list. (Before 2026-11-17 it
 * wrote contacts straight from the browser, which Firestore rules refuse for
 * a visitor who isn't signed in, so it never worked.)
 */
@Component( {
  selector: 'app-unsubscribe-failure',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './unsubscribe-failure.component.html',
  styleUrl: './unsubscribe-failure.component.css'
} )
export class UnsubscribeFailureComponent implements OnInit {
  private readonly route = inject( ActivatedRoute );
  email = '';
  tenantId: string | null = null;
  busy = false;
  done = false;
  errorMessage: string | null = null;

  ngOnInit (): void {
    this.tenantId = this.route.snapshot.queryParamMap.get( 'tenantId' );
  }

  async onSubmit (): Promise<void> {
    const email = this.email.trim();
    if ( !email.includes( '@' ) ) {
      this.errorMessage = 'Enter the email address the message was sent to.';
      return;
    }
    if ( !this.tenantId ) {
      this.errorMessage = 'This link is missing the sender\'s details. Reply to the email with "unsubscribe" and you\'ll be removed.';
      return;
    }
    this.busy = true;
    this.errorMessage = null;
    try {
      const params = new URLSearchParams( { emailHash: await emailHash( email ), tenantId: this.tenantId } );
      const response = await fetch( `${ environment.backendURL }/unsubscribe?${ params }`, { method: 'POST' } );
      if ( !response.ok ) throw new Error( String( response.status ) );
      this.done = true;
    } catch {
      this.errorMessage = 'That didn\'t go through. Reply to the email with "unsubscribe" and you\'ll be removed.';
    } finally {
      this.busy = false;
    }
  }
}
