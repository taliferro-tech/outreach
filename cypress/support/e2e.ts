// Loaded before every e2e spec.

// Signing in as a fake emulator user still makes the app fire real HTTP
// calls to the live production backend (tenant.interceptor.ts stamps every
// /api/ request with whatever tenant/user id is on the session - real or
// fake). Blanket-stub it here so no spec, current or future, can ever
// reach api.taliferro.tech. Components already treat a non-array/empty
// response as "no data" rather than erroring, so a bare {} is a safe
// default; specs that care about specific data override this per-test
// with their own cy.intercept (Cypress matches the most recently
// registered interceptor first).
beforeEach(() => {
  cy.intercept('https://api.taliferro.tech/api/**', { statusCode: 200, body: {} });
  // Bulk sending card (Marketing Assistant settings) and anything else that
  // reads the workspace's SendGrid provisioning: nothing requested yet.
  cy.intercept({ method: 'GET', url: 'https://api.taliferro.tech/api/outreach/provisioning*' }, { statusCode: 200, body: { success: true, data: { provisioningStatus: 'not_requested', senderEmail: '', domain: '', notes: '' } } });
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Signs in as a fake user through the app's real callback flow
       * (mint a token against the Auth emulator, then drive
       * AuthCallbackComponent exactly like the hosted login would) and
       * lands on `returnUrl`. Requires `ng serve --configuration=e2e`
       * (see the "e2e:auth" npm script) so the app is pointed at the
       * emulators, not live Firebase.
       */
      loginAsTestUser(returnUrl: string, uid?: string): Chainable<void>;
    }
  }
}

Cypress.Commands.add('loginAsTestUser', (returnUrl: string, uid = 'cypress-test-user') => {
  const state = `cypress-state-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  cy.task('mintTestLoginToken', uid).then((token) => {
    cy.visit(`/auth/callback?token=${token}&state=${state}`, {
      onBeforeLoad(win) {
        win.sessionStorage.setItem(
          'outreach_hosted_login_pending',
          JSON.stringify({ state, returnUrl }),
        );
      },
    });
  });
});

export {};
