import { Component } from '@angular/core';

/**
 * Where the unsubscribe link lands once the backend has recorded it. Plain
 * confirmation only (Ty, 2026-11-17): the old page pitched 16Ahead
 * ("Are you sure about missing out?") to someone who just asked to stop.
 */
@Component( {
  selector: 'app-unsubscribe-success',
  standalone: true,
  templateUrl: './unsubscribe-success.component.html',
  styleUrl: './unsubscribe-success.component.css'
} )
export class UnsubscribeSuccessComponent {}
