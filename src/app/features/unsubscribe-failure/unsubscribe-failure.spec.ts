import { emailHash } from './unsubscribe-failure.component';

describe( 'Unsubscribe fallback form (2026-11-17)', () => {
  it( 'hashes the address the way the unsubscribe link does: trimmed, lowercased sha256', async () => {
    expect( await emailHash( '  Pat@Example.com ' ) ).toBe( 'fe9733fcc96501276776fc927df08a395835461a2c5b12c65ebab3454877e227' );
  } );
} );
