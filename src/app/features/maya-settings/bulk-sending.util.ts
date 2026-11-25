import { OutreachProvisioningState } from '../../services/outreach-api.service';

/**
 * What the "Bulk sending" card says about the workspace's SendGrid
 * provisioning (GET /api/outreach/provisioning). The statuses match the
 * backend's outreach/provisioningStatuses.js: Admin › Provisioning writes
 * requested / pending / manual_review / provisioned / blocked / suspended /
 * not_requested; active and ready are older spellings of provisioned.
 */

export type BulkSendingKind = 'off' | 'waiting' | 'on' | 'attention';

export interface BulkSendingView {
  kind: BulkSendingKind;
  /** Plain-words status line. */
  label: string;
  /** One line under it, or ''. */
  detail: string;
  tint: 'green' | 'yellow' | 'pink' | 'neutral';
  /** True when the workspace may ask (again). */
  canRequest: boolean;
}

const READY = ['provisioned', 'active', 'ready', 'approved'];
const WAITING = ['requested', 'pending', 'manual_review'];
const ATTENTION = ['blocked', 'suspended'];

export const SIMPLE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function shortDate ( iso: string | null | undefined ): string {
  const ms = Date.parse( String( iso || '' ) );
  return ms ? new Date( ms ).toLocaleDateString( 'en-US', { month: 'short', day: 'numeric', year: 'numeric' } ) : '';
}

export function bulkSendingView ( state: Partial<OutreachProvisioningState> | null | undefined ): BulkSendingView {
  const status = String( state?.provisioningStatus || '' ).trim().toLowerCase();
  const sender = String( state?.senderEmail || '' ).trim();
  const notes = String( state?.notes || '' ).trim();

  if ( READY.includes( status ) ) {
    return {
      kind: 'on',
      label: sender ? `Approved — sending from ${ sender }` : 'Approved',
      detail: 'Campaigns and drips can send through SendGrid.',
      tint: 'green',
      canRequest: false,
    };
  }
  if ( WAITING.includes( status ) ) {
    const requested = shortDate( state?.requestedAt );
    return {
      kind: 'waiting',
      label: requested ? `Waiting for approval (requested ${ requested })` : 'Waiting for approval',
      detail: `${ sender ? `Sender: ${ sender }. ` : '' }The 16Ahead team reviews it. One-to-one emails from your inbox keep working meanwhile.`,
      tint: 'yellow',
      canRequest: false,
    };
  }
  if ( ATTENTION.includes( status ) ) {
    const reason = notes || ( status === 'suspended' ? 'Bulk sending is suspended.' : 'Bulk sending is blocked.' );
    return {
      kind: 'attention',
      label: `Needs attention: ${ reason }`,
      detail: status === 'suspended'
        ? 'Write to support@16ahead.com to sort it out.'
        : 'Fix what the note says and ask again, or write to support@16ahead.com.',
      tint: 'pink',
      // Blocked can ask again (it goes back to the 16Ahead team); suspended can't.
      canRequest: status === 'blocked',
    };
  }
  return {
    kind: 'off',
    label: 'Not requested',
    detail: 'Only needed for campaigns and drips. 16Ahead sends them through SendGrid from your address after a short approval.',
    tint: 'neutral',
    canRequest: true,
  };
}

/** "acme.com" from "ty@acme.com", or ''. */
export function domainOf ( email: string ): string {
  const at = String( email || '' ).trim().lastIndexOf( '@' );
  return at >= 0 ? String( email ).trim().slice( at + 1 ).toLowerCase() : '';
}
