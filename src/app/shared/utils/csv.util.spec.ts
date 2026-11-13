import { parseCsv } from './csv.util';

describe( 'parseCsv', () => {
  it( 'reads headers and rows, with quoted commas, doubled quotes and line breaks', () => {
    const text = '﻿Email,First Name,Personal Line\r\n' +
      'pat@fund.vc,Pat,"I saw Fund VC backed Acme, and ""Beta""."\r\n' +
      '\r\n' +
      'kim@other.vc,Kim,"two\nlines"\n';
    expect( parseCsv( text ) ).toEqual( [
      { 'Email': 'pat@fund.vc', 'First Name': 'Pat', 'Personal Line': 'I saw Fund VC backed Acme, and "Beta".' },
      { 'Email': 'kim@other.vc', 'First Name': 'Kim', 'Personal Line': 'two\nlines' },
    ] );
  } );

  it( 'fills missing trailing cells with empty strings and handles a file without a final newline', () => {
    expect( parseCsv( 'email,firstName,personalLine\na@b.co,Al' ) ).toEqual( [ { email: 'a@b.co', firstName: 'Al', personalLine: '' } ] );
  } );

  it( 'returns nothing for an empty file', () => {
    expect( parseCsv( '' ) ).toEqual( [] );
    expect( parseCsv( '\n\n' ) ).toEqual( [] );
  } );
} );
