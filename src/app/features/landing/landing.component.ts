import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, ViewChild } from '@angular/core';
import { RouterModule } from '@angular/router';
import { SiteFooterComponent } from '../../shared/site-footer/site-footer.component';
import { AlsoFromUsComponent } from '../../shared/also-from-us/also-from-us.component';

@Component( {
  selector: 'app-landing',
  host: { class: 'tt-page' },
  standalone: true,
  imports: [ AlsoFromUsComponent, CommonModule, RouterModule, SiteFooterComponent],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.css'
} )
export class LandingComponent implements AfterViewInit, OnDestroy {
  /** The silent tour plays by itself in the hero; any tap opens it full screen. */
  @ViewChild( 'inlineVideo' ) private inlineVideo?: ElementRef<HTMLVideoElement>;
  @ViewChild( 'closeButton' ) set closeButton ( ref: ElementRef<HTMLButtonElement> | undefined ) { ref?.nativeElement.focus(); }
  @ViewChild( 'fullVideo' ) set fullVideo ( ref: ElementRef<HTMLVideoElement> | undefined ) {
    if ( !ref ) return;
    const video = ref.nativeElement;
    video.play().catch( () => { video.muted = true; video.play().catch( () => undefined ); } );
  }

  inlinePlaying = false;
  tourOpen = false;
  /** Set once someone has seen the whole tour, so the buttons read "Watch again". */
  tourWatched = false;
  private opener: HTMLElement | null = null;

  readonly outcomes = [
    [ 'Before the send', 'Know if the angle will land before it lands wrong.', '16Ahead evaluates audience fit, clarity, offer strength, urgency, friction, and campaign usefulness before launch.' ],
    [ 'During the build', 'Plan the full follow-up path before step one goes out.', 'Multi-step sequences, delays, and conditional routing are ready before the first email.' ],
    [ 'After the send', 'Silence, opens, and clicks trigger different next moves.', 'Signal Engine watches what each contact actually did and routes the next follow-up.' ],
    [ 'Across the campaign', 'One cockpit for momentum, telemetry, and attention.', 'See campaign health, contact progress, and the next draft in one focused view.' ]
  ];

  readonly faqs = [
    { question: 'What does Outreach evaluate before a campaign starts?', answer: '16Ahead evaluates audience fit, clarity, offer strength, urgency, friction, and overall campaign usefulness before you launch.' },
    { question: 'Can sequences respond to what contacts do?', answer: 'Yes. Opens, clicks, replies, and silence can route different next steps so follow-up matches the signal.' },
    { question: 'Does Outreach replace my email provider?', answer: 'Outreach is the campaign and follow-up layer. It helps you plan, route, and monitor the conversation while connecting campaign context to the rest of 16Ahead.' },
    { question: 'Who is Outreach for?', answer: 'Outreach is for teams and operators who need consistent, thoughtful follow-up without manually watching every contact and campaign.' }
  ];

  ngAfterViewInit (): void {
    if ( typeof window === 'undefined' ) return;
    window.scrollTo( 0, 0 );
    this.autoplayInline();
  }

  ngOnDestroy (): void { this.unlockScroll(); }

  openTour ( event: Event ): void {
    this.opener = event.currentTarget as HTMLElement | null;
    this.inlineVideo?.nativeElement.pause();
    this.tourOpen = true;
    document.documentElement.style.overflow = 'hidden';
  }

  @HostListener( 'document:keydown.escape' )
  closeTour (): void {
    if ( !this.tourOpen ) return;
    this.tourOpen = false;
    this.unlockScroll();
    this.opener?.focus();
  }

  onFullEnded (): void {
    this.tourWatched = true;
    this.closeTour();
  }

  /** Ends the hero takeover early and brings the headline back. */
  skipTour (): void {
    this.inlinePlaying = false;
    this.inlineVideo?.nativeElement.pause();
    this.inlineVideo?.nativeElement.load();
  }

  /** Back to the poster, ready for "Watch again". */
  onInlineEnded (): void {
    this.inlinePlaying = false;
    this.tourWatched = true;
    this.inlineVideo?.nativeElement.load();
  }

  /**
   * Browsers (Safari included) autoplay video only when it is muted. The tour
   * has no sound, so it can start by itself — except for people who asked for
   * reduced motion or data savings, and in iOS Low Power Mode, where play()
   * rejects. Those visitors see the poster and the play button.
   */
  private autoplayInline (): void {
    const video = this.inlineVideo?.nativeElement;
    if ( !video ) return;
    const reduceMotion = window.matchMedia?.( '(prefers-reduced-motion: reduce)' ).matches;
    const saveData = ( navigator as Navigator & { connection?: { saveData?: boolean } } ).connection?.saveData;
    if ( reduceMotion || saveData ) return;
    video.muted = true;
    video.preload = 'auto';
    video.play().catch( () => undefined );
  }

  private unlockScroll (): void {
    if ( typeof document !== 'undefined' ) document.documentElement.style.overflow = '';
  }
}
