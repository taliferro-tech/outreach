import { personalFooterPreview } from './drip-detail.component';

describe( 'personalFooterPreview', () => {
  it( 'turns the template footer into one line with the name, address and a way out', () => {
    const html = '<td><p style="margin:0 0 8px;"><strong>Taliferro Tech</strong> · 1 Main St</p>\n' +
      '<p style="margin:0 0 8px;">You\'re receiving this because you\'re in touch with Taliferro Tech.</p>\n' +
      '<p style="margin:0;"><a href="taliferro-tech-unsubscribe">Unsubscribe</a> · <a href="x">Email preferences</a></p></td>';
    const out = personalFooterPreview( html );
    expect( out ).toContain( 'Taliferro Tech · 1 Main St · Not for you?' );
    expect( out ).not.toContain( 'receiving this because' );
    expect( out ).not.toContain( 'Email preferences' );
  } );

  it( 'leaves an email without the template footer alone', () => {
    expect( personalFooterPreview( '<p>Hi</p>' ) ).toBe( '<p>Hi</p>' );
  } );
} );
