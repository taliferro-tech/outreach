import { LandingComponent } from './landing.component';

describe('LandingComponent', () => {
  it('exposes the landing page FAQs', () => {
    const component = new LandingComponent();

    expect(component.faqs.length).toBeGreaterThan(0);
  });
});
