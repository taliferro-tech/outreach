/**
 * Whether Catalyst may email a contact at all - the same rule as a drip
 * audience (backend drips.audience.js mailableEmail) and the send gate
 * (emailValidation.service.js validateRecipientBeforeSend). Blocked contacts
 * (a bounce, "remove me", 10 emails with no engagement, an invalid address)
 * never appear in Up Next or the audience counts (Ty, 2026-11-10).
 */
const SUPPRESSED_STATUSES = new Set( ['deleted', 'unsubscribed', 'do not contact'] );

export function isContactMailable ( contact: any ): boolean {
  if ( !contact || contact.emailBlocked === true || contact.unsubscribed === true || contact.deleted === true || contact.blocked === true ) return false;
  if ( SUPPRESSED_STATUSES.has( String( contact.status || '' ).trim().toLowerCase() ) ) return false;
  const first = Array.isArray( contact.emailAddresses ) ? contact.emailAddresses[0] : null;
  return !!first && !!String( first.emailAddress || '' ).trim() && first.blocked !== true;
}
