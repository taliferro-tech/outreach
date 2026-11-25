import { bulkSendingView, domainOf } from './bulk-sending.util';

describe( 'bulkSendingView', () => {
  it( 'says Not requested and offers the request when nothing was asked', () => {
    for ( const status of [undefined, '', 'not_requested', 'rejected'] ) {
      const view = bulkSendingView( { provisioningStatus: status as string } );
      expect( view.kind ).toBe( 'off' );
      expect( view.label ).toBe( 'Not requested' );
      expect( view.canRequest ).toBeTrue();
    }
    expect( bulkSendingView( null ).kind ).toBe( 'off' );
  } );

  it( 'says Waiting for approval with the request date for every waiting status', () => {
    for ( const status of ['requested', 'pending', 'manual_review'] ) {
      const view = bulkSendingView( { provisioningStatus: status, requestedAt: '2026-11-24T18:00:00.000Z', senderEmail: 'ty@acme.com' } );
      expect( view.kind ).toBe( 'waiting' );
      expect( view.label ).toContain( 'Waiting for approval (requested Nov' );
      expect( view.detail ).toContain( 'ty@acme.com' );
      expect( view.canRequest ).toBeFalse();
    }
  } );

  it( 'says Approved with the sender for what Admin › Provisioning writes', () => {
    for ( const status of ['provisioned', 'active', 'ready', 'approved'] ) {
      const view = bulkSendingView( { provisioningStatus: status, senderEmail: 'ty@acme.com' } );
      expect( view.kind ).toBe( 'on' );
      expect( view.label ).toBe( 'Approved — sending from ty@acme.com' );
    }
  } );

  it( 'says Needs attention with the reason when blocked or suspended', () => {
    const blocked = bulkSendingView( { provisioningStatus: 'blocked', notes: 'Domain has no SPF record.' } );
    expect( blocked.label ).toBe( 'Needs attention: Domain has no SPF record.' );
    expect( blocked.canRequest ).toBeTrue();
    const suspended = bulkSendingView( { provisioningStatus: 'suspended' } );
    expect( suspended.label ).toBe( 'Needs attention: Bulk sending is suspended.' );
    expect( suspended.canRequest ).toBeFalse();
  } );
} );

describe( 'domainOf', () => {
  it( 'takes the part after the @', () => {
    expect( domainOf( 'Ty@Acme.com ' ) ).toBe( 'acme.com' );
    expect( domainOf( 'nope' ) ).toBe( '' );
  } );
} );
