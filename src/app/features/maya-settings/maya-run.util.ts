import { MayaActivityItem } from '../../services/outreach-api.service';

/**
 * View helpers for the "Run the Marketing Assistant" card, lifted with the
 * card from the 16Ahead hub's Admin > Marketing Assistant page
 * (admin-maya.component.ts + admin-shared.ts, 2026-11-24).
 */

export type MayaRunTone = 'processing' | 'completed' | 'failed' | 'blocked' | 'neutral';
export type MayaRunTint = 'green' | 'blue' | 'pink' | 'yellow' | 'neutral';

export interface MayaRunPhaseView {
  key: string;
  label: string;
  status: MayaRunTone;
  tint: MayaRunTint;
  detail: string;
  occurredAt: string;
}

export interface MayaRunView {
  runId: string;
  runType: 'morning_batch' | 'drafting_duty';
  triggerType: string;
  startedAt: string;
  headline: string;
  summary: string;
  status: MayaRunTone;
  tint: MayaRunTint;
  phases: MayaRunPhaseView[];
  batchId: string;
}

/** The hub's Daily Momentum page shows a batch; Outreach has no batch view of its own. */
export const HUB_BATCH_URL = 'https://app.16ahead.com/daily-momentum';

const RUN_PHASES: Array<{ key: string; label: string; type: string; }> = [
  { key: 'started', label: 'Started', type: 'maya_batch_started' },
  { key: 'sender', label: 'Sender Resolved', type: 'maya_batch_sender_resolved' },
  { key: 'social', label: 'Social Queue Ready', type: 'maya_batch_social_completed' },
  { key: 'selection', label: 'Selection Completed', type: 'maya_batch_selection_completed' },
  { key: 'saved', label: 'Batch Saved', type: 'maya_batch_saved' },
  { key: 'drafting', label: 'Outreach Drafted', type: 'maya_batch_drafting_completed' },
  { key: 'finished', label: 'Finished', type: 'maya_batch_finished' }
];

export function runTone ( status: string | null | undefined ): MayaRunTone {
  const normalized = String( status || '' ).trim().toLowerCase();
  if ( normalized === 'processing' || normalized === 'started' ) return 'processing';
  if ( normalized === 'completed' ) return 'completed';
  if ( normalized === 'failed' ) return 'failed';
  if ( normalized === 'blocked' || normalized === 'deferred' ) return 'blocked';
  return 'neutral';
}

export function runTint ( tone: MayaRunTone ): MayaRunTint {
  if ( tone === 'completed' ) return 'green';
  if ( tone === 'processing' ) return 'blue';
  if ( tone === 'failed' ) return 'pink';
  if ( tone === 'blocked' ) return 'yellow';
  return 'neutral';
}

function statusView ( status: string | null | undefined ): { status: MayaRunTone; tint: MayaRunTint; } {
  const tone = runTone( status );
  return { status: tone, tint: runTint( tone ) };
}

export function errorMessage ( err: any, fallback: string ): string {
  if ( err?.error?.message ) return String( err.error.message );
  if ( err?.status === 504 || err?.status === 502 ) return `${fallback} The server took too long to answer. Refresh in a minute to see whether it finished.`;
  if ( err?.status === 0 ) return `${fallback} The server couldn't be reached. Check your connection and try again.`;
  if ( typeof err?.status === 'number' && err.status >= 400 ) return fallback;
  return String( err?.message || fallback );
}

export function todayLabel (): string {
  return new Date().toLocaleDateString( 'en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' } );
}

/** Only the Marketing Assistant's batch rows - or, for one run, that run's rows. */
export function filterBatchActivity ( items: MayaActivityItem[], scopedRunId: string ): MayaActivityItem[] {
  return ( items || [] ).filter( item => {
    const sourceEntrypoint = String( item?.sourceEntrypoint || '' ).trim();
    const type = String( item?.type || '' ).trim();
    const family = String( item?.metadata?.['mayaRunFamily'] || '' ).trim();
    const itemRunId = String( item?.metadata?.['mayaRunId'] || '' ).trim();
    if ( scopedRunId ) {
      return !!itemRunId && itemRunId === scopedRunId;
    }
    return family === 'outreach_batch'
      || sourceEntrypoint === 'runMayaMorningBatch'
      || sourceEntrypoint === 'runMayaBatchOnDemand'
      || type.startsWith( 'maya_batch_' );
  } ).slice( 0, 100 );
}

/** Activity rows grouped into runs, newest first. */
export function buildRuns ( items: MayaActivityItem[] ): MayaRunView[] {
  const grouped = new Map<string, MayaActivityItem[]>();
  ( items || [] ).forEach( item => {
    const runId = String( item?.metadata?.['mayaRunId'] || '' ).trim();
    if ( !runId ) return;
    grouped.set( runId, [...( grouped.get( runId ) || [] ), item] );
  } );

  return Array.from( grouped.entries() )
    .map( ( [runId, runItems] ) => {
      const lifecycleItems = runItems.filter( item => String( item?.type || '' ).trim().startsWith( 'maya_' ) );
      const summaryItems = lifecycleItems.length ? lifecycleItems : runItems;
      const earliest = [...summaryItems].sort( ( a, b ) => String( a?.occurredAt || '' ).localeCompare( String( b?.occurredAt || '' ) ) )[0];
      const latest = [...summaryItems].sort( ( a, b ) => String( b?.occurredAt || '' ).localeCompare( String( a?.occurredAt || '' ) ) )[0];
      // Drafting-duty runs get their own runId per hourly chunk and emit a single
      // event - the 7-phase morning-batch catalog doesn't apply to them.
      const isDraftingDutyRun = summaryItems.every( item => String( item?.type || '' ).trim() === 'maya_drafting_duty_completed' );
      const phases = isDraftingDutyRun ? [] : RUN_PHASES.map( phase => {
        const matching = summaryItems.find( item => String( item?.type || '' ).trim() === phase.type );
        return {
          key: phase.key,
          label: phase.label,
          ...statusView( matching?.status ),
          detail: String( matching?.detail || matching?.message || '' ).trim(),
          occurredAt: String( matching?.occurredAt || '' ).trim()
        };
      } );

      return {
        runId,
        runType: isDraftingDutyRun ? 'drafting_duty' : 'morning_batch',
        triggerType: String( latest?.metadata?.['triggerType'] || '' ).trim() || 'manual',
        startedAt: String( earliest?.occurredAt || latest?.occurredAt || '' ).trim(),
        headline: String( latest?.message || 'Marketing Assistant run' ).trim(),
        summary: String( latest?.detail || '' ).trim(),
        ...statusView( latest?.status ),
        phases,
        batchId: String( latest?.metadata?.['mayaBatchId'] || '' ).trim()
      } as MayaRunView;
    } )
    .sort( ( a, b ) => String( b.startedAt || '' ).localeCompare( String( a.startedAt || '' ) ) );
}
