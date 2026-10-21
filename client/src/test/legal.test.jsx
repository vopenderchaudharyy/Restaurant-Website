import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import {
  CancellationRefundPage,
  DeliveryPolicyPage,
  GrievancePage,
  LegalCentrePage,
  PrivacyPage,
  TermsPage,
} from '../pages/LegalPages.jsx';

function renderPage(Page, path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Page />
    </MemoryRouter>,
  );
}

describe('MenuMate legal centre', () => {
  it('makes every policy discoverable from the legal centre', () => {
    renderPage(LegalCentrePage, '/legal');

    expect(
      screen.getByRole('heading', { level: 1, name: 'The details behind every order.' }),
    ).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Terms of Use' })[0].getAttribute('href')).toBe(
      '/terms',
    );
    expect(screen.getAllByRole('link', { name: 'Privacy Policy' })[0].getAttribute('href')).toBe(
      '/privacy',
    );
    expect(
      screen.getAllByRole('link', { name: 'Cancellation & Refunds' })[0].getAttribute('href'),
    ).toBe('/cancellation-refunds');
    expect(screen.getAllByRole('link', { name: 'Delivery Policy' })[0].getAttribute('href')).toBe(
      '/delivery-policy',
    );
    expect(
      screen.getAllByRole('link', { name: 'Grievance Redressal' })[0].getAttribute('href'),
    ).toBe('/grievance');
  });

  it.each([
    [TermsPage, '/terms', 'Terms of Use'],
    [PrivacyPage, '/privacy', 'Privacy Policy'],
    [CancellationRefundPage, '/cancellation-refunds', 'Cancellation & Refund Policy'],
    [DeliveryPolicyPage, '/delivery-policy', 'Delivery Policy'],
    [GrievancePage, '/grievance', 'Grievance Redressal'],
  ])('renders %s with an effective date and support route', (Page, path, title) => {
    renderPage(Page, path);

    expect(screen.getByRole('heading', { level: 1, name: title })).toBeTruthy();
    expect(screen.getByText('Effective 21 October 2026')).toBeTruthy();
    expect(screen.getAllByRole('link', { name: 'Contact support' })[0].getAttribute('href')).toBe(
      '/grievance',
    );
  });

  it('publishes the grievance officer and statutory response targets', () => {
    renderPage(GrievancePage, '/grievance');

    expect(screen.getByRole('heading', { name: 'Vopender Chaudhary' })).toBeTruthy();
    expect(screen.getAllByText('Acknowledgement within 48 hours').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Target resolution within one month').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /National Consumer Helpline/ })).toBeTruthy();
  });
});
