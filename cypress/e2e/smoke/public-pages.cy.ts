describe('Public pages', () => {
  it('loads the landing page', () => {
    cy.visit('/');
    cy.contains('Outreach');
    cy.contains('more follow-up clarity');
  });

  // Playback itself isn't asserted: Cypress's default Electron browser has no
  // H.264 decoder. Run with --browser chrome to see the tour actually play.
  it('opens the product tour full screen and closes it', () => {
    cy.visit('/');
    cy.get('.tour__video').should('have.attr', 'src', 'video/outreach-tour.mp4');
    cy.get('[data-cy=landing-watch-tour]').click();
    cy.get('.tour-overlay__video').should('be.visible');
    cy.get('[data-cy=landing-close-tour]').should('be.focused').click();
    cy.get('.tour-overlay').should('not.exist');
    cy.get('[data-cy=landing-watch-tour]').should('be.focused');
  });

  it('loads the pricing page', () => {
    cy.visit('/pricing');
    cy.location('pathname').should('eq', '/pricing');
  });

  it('loads the iOS app showcase page', () => {
    cy.visit('/ios');
    cy.location('pathname').should('eq', '/ios');
  });

  it('shows a noindex Not Found page for unknown routes', () => {
    cy.visit('/this-route-does-not-exist');
    cy.location('pathname').should('eq', '/this-route-does-not-exist');
    cy.contains("We couldn't find that.");
    cy.get('meta[name="robots"]').should('have.attr', 'content', 'noindex');
  });
});
