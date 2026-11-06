/**
 * Email templates on drafts (step 3, 2026-11-06). Mirrors todd-backend
 * outreach/momentum/modules/momentum.template.js chosenTemplate(), so a card
 * can say which template its email goes out in without asking the server.
 */

export type DraftTemplateId = 'none' | 'personal-note' | 'newsletter' | 'announcement' | 'promotion' | 'event';

export interface DraftTemplateChoice {
  id: DraftTemplateId;
  label: string;
  detail: string;
  /** The AI fills the template's fields from the draft (takes a few seconds each). */
  filled: boolean;
}

export const DRAFT_TEMPLATE_CHOICES: DraftTemplateChoice[] = [
  { id: 'personal-note', label: 'Personal note', detail: 'The email as written, with your logo above and your address below. The default for the Marketing Assistant\'s emails.', filled: false },
  { id: 'announcement', label: 'Announcement', detail: 'News or a launch, with highlights.', filled: true },
  { id: 'newsletter', label: 'Newsletter', detail: 'A main story and short ones.', filled: true },
  { id: 'promotion', label: 'Promotion', detail: 'A sale or offer with a code.', filled: true },
  { id: 'event', label: 'Event invitation', detail: 'Date, place and RSVP.', filled: true },
  { id: 'none', label: 'No template', detail: 'A plain email, as before.', filled: false },
];

const LABELS: Record<string, string> = Object.fromEntries( DRAFT_TEMPLATE_CHOICES.map( ( choice ) => [choice.id, choice.label] ) );
const DESIGNED = new Set( ['newsletter', 'announcement', 'promotion', 'event'] );

export interface DraftTemplateThread {
  origin?: string;
  senderName?: string;
  sendVia?: string;
  mailboxId?: string;
  draftBody?: string;
  draftTemplate?: { templateId?: string; bodyHash?: string; } | null;
}

/** FNV-1a, 32 bit, hex: the same as the backend's bodyHash(). */
export function bodyHash ( value: string | undefined ): string {
  const text = String( value || '' ).trim();
  let hash = 0x811c9dc5;
  for ( let i = 0; i < text.length; i += 1 ) {
    hash ^= text.charCodeAt( i );
    hash = Math.imul( hash, 0x01000193 ) >>> 0;
  }
  return hash.toString( 16 ).padStart( 8, '0' );
}

/** The template this draft goes out in, or '' for a plain email. */
export function draftTemplateId ( thread: DraftTemplateThread, reply: boolean ): DraftTemplateId | '' {
  const id = String( thread.draftTemplate?.templateId || '' );
  if ( id === 'none' ) return '';
  if ( id === 'personal-note' ) return 'personal-note';
  if ( DESIGNED.has( id ) && !reply && thread.draftTemplate?.bodyHash === bodyHash( thread.draftBody ) ) return id as DraftTemplateId;
  const mailbox = String( thread.sendVia || '' ) === 'mailbox' && !!String( thread.mailboxId || '' );
  const assistant = String( thread.origin || '' ).toLowerCase() === 'maya' || String( thread.senderName || '' ).toLowerCase() === 'maya';
  return !reply && !mailbox && assistant ? 'personal-note' : '';
}

export function draftTemplateLabel ( id: DraftTemplateId | '' ): string {
  return id ? LABELS[id] || '' : '';
}

/** The toast after Apply template on the checked drafts. */
export function applyTemplateToast ( label: string, done: number, skippedReplies: number, failed: number, blanks: number ): string {
  const drafts = ( count: number ) => `${ count } ${ count === 1 ? 'draft' : 'drafts' }`;
  const parts = [label === 'No template' ? `${ drafts( done ) } will go out as plain emails.` : `${ drafts( done ) } will go out as ${ label }.`];
  if ( blanks ) parts.push( `${ drafts( blanks ) } left something blank only you know, like a date or a code. Use See it as sent to check.` );
  if ( skippedReplies ) parts.push( `${ drafts( skippedReplies ) } ${ skippedReplies === 1 ? 'is a reply' : 'are replies' }, which stay as written.` );
  if ( failed ) parts.push( `${ drafts( failed ) } couldn't be changed and ${ failed === 1 ? 'is' : 'are' } still checked.` );
  return parts.join( ' ' );
}
