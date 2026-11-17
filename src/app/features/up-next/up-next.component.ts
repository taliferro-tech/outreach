import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { OutreachAuthService } from '../../services/outreach-auth.service';
import { BrowseNoticeComponent } from '../../shared/write-access/browse-notice.component';
import { MayaPlanComponent, PlanFilter } from './maya-plan.component';

/** ?filter= values, including the old Signal Engine Plan ones (active, warm - now All). */
export const PLAN_FILTERS: Record<string, PlanFilter> = { all: 'all', 'needs-you': 'needs-you', hot: 'hot', queued: 'queued', stalled: 'stalled', active: 'all', warm: 'all', plan: 'all' };

/**
 * Up next (Ty, 2026-11-14): who the Marketing Assistant writes to next, and
 * when, one row per person. It was the second tab of Activity ("The
 * Marketing Assistant's plan", which it never was - the marketing plan is
 * on Today). Activity's other half, what it did today, moved to Today's
 * Results tab (app.16ahead.com/today?tab=results).
 */
@Component( {
  selector: 'app-up-next',
  standalone: true,
  imports: [BrowseNoticeComponent, MayaPlanComponent],
  template: `
    <div class="page" data-cy="up-next">
      <app-browse-notice what="Up next"></app-browse-notice>
      <header class="head">
        <h1>Up next</h1>
        <a class="today-link" href="https://app.16ahead.com/today?tab=results">What the Marketing Assistant did today ↗</a>
      </header>
      <app-maya-plan [tenantId]="tenantId" [filter]="filter" (filterChange)="setFilter($event)"></app-maya-plan>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .page { max-width: 1080px; margin: 0 auto; padding: 28px 36px 64px; color: var(--todd-text); }
    .head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 16px; margin-bottom: 16px; }
    .head h1 { margin: 0; font-size: 34px; line-height: 1.08; letter-spacing: -0.03em; }
    .today-link { font-size: 14px; font-weight: 700; color: var(--tl-blue-mid); text-decoration: none; }
    .today-link:hover { text-decoration: underline; }
    /* Below 900px the sidebar goes and the floating Menu button returns. */
    @media (max-width: 899px) { .page { padding: 72px 16px 48px; } }
  `],
} )
export class UpNextComponent implements OnInit, OnDestroy {
  private readonly authService = inject( OutreachAuthService );
  private readonly route = inject( ActivatedRoute );
  private readonly router = inject( Router );
  private tenantSubscription?: Subscription;

  tenantId: string | null = null;
  filter: PlanFilter = 'all';

  ngOnInit (): void {
    this.filter = PLAN_FILTERS[String( this.route.snapshot.queryParamMap.get( 'filter' ) || '' )] || 'all';
    this.tenantSubscription = this.authService.getTenantId().subscribe( ( tenantId ) => {
      if ( tenantId ) this.tenantId = tenantId;
    } );
  }

  ngOnDestroy (): void {
    this.tenantSubscription?.unsubscribe();
  }

  /** Keeps the filter in the URL, so Back and shared links land on it. */
  setFilter ( filter: PlanFilter ): void {
    this.filter = filter;
    void this.router.navigate( [], { relativeTo: this.route, queryParams: { filter: filter === 'all' ? null : filter }, queryParamsHandling: 'merge', replaceUrl: true } );
  }
}
