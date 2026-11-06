import { applyTemplateToast, bodyHash, draftTemplateId, draftTemplateLabel } from './draft-template.util';
import { previewNote } from './drafts.component';

describe( 'Drafts: which template an email goes out in (2026-11-06)', () => {
  const body = '<p>Hi Sam,</p><p>Coffee?</p>';

  it( 'matches the backend hash, so a designed template is only shown for the draft it was filled from', () => {
    // todd-backend momentum.template.js bodyHash('<p>Hi Sam,</p><p>Coffee?</p>')
    expect( bodyHash( body ) ).toBe( '655a07cc' );
    expect( bodyHash( body ) ).toBe( bodyHash( `  ${ body }\n` ) );
    expect( bodyHash( body ) ).toMatch( /^[0-9a-f]{8}$/ );
    expect( bodyHash( body ) ).not.toBe( bodyHash( '<p>Hi Sam,</p>' ) );
  } );

  it( 'shows Personal note for the Marketing Assistant\'s emails, nothing for plain ones', () => {
    expect( draftTemplateLabel( draftTemplateId( { origin: 'maya', draftBody: body }, false ) ) ).toBe( 'Personal note' );
    expect( draftTemplateLabel( draftTemplateId( { origin: 'user', draftBody: body }, false ) ) ).toBe( '' );
    expect( draftTemplateId( { origin: 'maya', draftBody: body }, true ) ).toBe( '' );
    expect( draftTemplateId( { origin: 'maya', sendVia: 'mailbox', mailboxId: 'm1', draftBody: body }, false ) ).toBe( '' );
    expect( draftTemplateId( { origin: 'maya', draftBody: body, draftTemplate: { templateId: 'none' } }, false ) ).toBe( '' );
  } );

  it( 'shows a designed template until the draft changes', () => {
    const thread = { origin: 'maya', draftBody: body, draftTemplate: { templateId: 'promotion', bodyHash: bodyHash( body ) } };
    expect( draftTemplateLabel( draftTemplateId( thread, false ) ) ).toBe( 'Promotion' );
    expect( draftTemplateId( { ...thread, draftBody: '<p>Rewritten</p>' }, false ) ).toBe( 'personal-note' );
  } );

  it( 'says what happened after Apply', () => {
    expect( applyTemplateToast( 'Personal note', 3, 0, 0, 0 ) ).toBe( '3 drafts will go out as Personal note.' );
    expect( applyTemplateToast( 'No template', 1, 0, 0, 0 ) ).toBe( '1 draft will go out as plain emails.' );
    const mixed = applyTemplateToast( 'Promotion', 4, 1, 2, 1 );
    expect( mixed ).toContain( 'left something blank only you know' );
    expect( mixed ).toContain( '1 draft is a reply, which stay as written.' );
    expect( mixed ).toContain( '2 drafts couldn\'t be changed and are still checked.' );
  } );

  it( 'explains a plain preview', () => {
    expect( previewNote( null, 'brand_incomplete', false ) ).toContain( 'mailing address' );
    expect( previewNote( 'personal-note', '', true ) ).toContain( 'earlier version' );
    expect( previewNote( 'personal-note', '', false ) ).toBe( '' );
  } );
} );
