import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom } from 'rxjs';

import { OutreachApiService } from './outreach-api.service';

// 2026-11-23: the badge and the page each asked for the whole bootstrap on
// arrival; now they share one request, and it asks for the screens' fields only.
describe( 'OutreachApiService: the Signal Engine bootstrap', () => {
  let api: OutreachApiService;
  let http: HttpTestingController;

  beforeEach( () => {
    TestBed.configureTestingModule( { providers: [provideHttpClient(), provideHttpClientTesting()] } );
    api = TestBed.inject( OutreachApiService );
    http = TestBed.inject( HttpTestingController );
  } );

  afterEach( () => http.verify() );

  it( 'asks once for callers that arrive together, with view=screens', async () => {
    const first = firstValueFrom( api.getSignalEngineBootstrap( { tenantId: 't1' } ) );
    const second = firstValueFrom( api.getSignalEngineBootstrap( { tenantId: 't1' } ) );
    const request = http.expectOne( ( req ) => req.url.endsWith( '/outreach/signal-engine/bootstrap' ) );
    expect( request.request.params.get( 'view' ) ).toBe( 'screens' );
    request.flush( { success: true, data: { threads: [{ id: 'a' }] } } );
    expect( ( await first ).data.threads.length ).toBe( 1 );
    expect( await second ).toEqual( await first );
  } );

  it( 'asks again once the last answer has landed', async () => {
    const first = firstValueFrom( api.getSignalEngineBootstrap( { tenantId: 't1' } ) );
    http.expectOne( ( req ) => req.url.endsWith( '/outreach/signal-engine/bootstrap' ) ).flush( { success: true, data: { threads: [] } } );
    await first;
    const later = firstValueFrom( api.getSignalEngineBootstrap( { tenantId: 't1' } ) );
    http.expectOne( ( req ) => req.url.endsWith( '/outreach/signal-engine/bootstrap' ) ).flush( { success: true, data: { threads: [{ id: 'b' }] } } );
    expect( ( await later ).data.threads[0].id ).toBe( 'b' );
  } );
} );
