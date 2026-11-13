/**
 * A CSV file as rows of { header: value } (Ty, 2026-11-13: Drips take an
 * uploaded list). Handles quoted fields with commas, doubled quotes and line
 * breaks inside quotes, a UTF-8 byte-order mark, and \r\n or \n line ends.
 * Blank rows are dropped; the first row is the header.
 */
export function parseCsv ( text: string ): Record<string, string>[] {
  const source = String( text || '' ).replace( /^﻿/, '' );
  const table: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for ( let i = 0; i < source.length; i++ ) {
    const char = source[i];
    if ( quoted ) {
      if ( char === '"' && source[i + 1] === '"' ) {
        field += '"';
        i++;
      } else if ( char === '"' ) {
        quoted = false;
      } else {
        field += char;
      }
    } else if ( char === '"' ) {
      quoted = true;
    } else if ( char === ',' ) {
      row.push( field );
      field = '';
    } else if ( char === '\n' || char === '\r' ) {
      if ( char === '\r' && source[i + 1] === '\n' ) i++;
      row.push( field );
      table.push( row );
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if ( field || row.length ) {
    row.push( field );
    table.push( row );
  }

  const nonEmpty = table.filter( ( cells ) => cells.some( ( cell ) => cell.trim() ) );
  if ( !nonEmpty.length ) return [];
  const headers = nonEmpty[0].map( ( header ) => header.trim() );
  return nonEmpty.slice( 1 ).map( ( cells ) => {
    const record: Record<string, string> = {};
    headers.forEach( ( header, index ) => {
      if ( header ) record[header] = ( cells[index] ?? '' ).trim();
    } );
    return record;
  } );
}
