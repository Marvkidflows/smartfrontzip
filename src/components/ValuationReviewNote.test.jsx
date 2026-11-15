// STATUS: written, run with the frontend suite: npm test
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ValuationReviewNote from './ValuationReviewNote';

const note = {
  valuation_related: true, records: 2, unverified: 1, stale: 1, unresolved: 0, requires: 'Financial verification',
  message: 'This shortfall may be valuation-related. 2 investment records have a currency valuation that is unverified, stale or unresolved.',
};

describe('ValuationReviewNote', () => {
  it('renders nothing when there is no valuation issue', () => {
    const { container } = render(<ValuationReviewNote note={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('says the shortfall may be valuation-related and that Financial verification comes first, without calling it a failure', () => {
    render(<ValuationReviewNote note={note} />);
    expect(screen.getByRole('note')).toBeInTheDocument();
    expect(screen.getByText(/may be a currency-valuation issue, not a failed requirement/)).toBeInTheDocument();
    expect(screen.getByText(/may be valuation-related/)).toBeInTheDocument();
    expect(screen.getByText(/ask the Financial Team to verify/)).toBeInTheDocument();
    expect(screen.getByText(/rank stays unchanged until an administrator decides/)).toBeInTheDocument();
  });

  it('lists only the kinds of record that apply', () => {
    render(<ValuationReviewNote note={note} />);
    expect(screen.getByText(/1 without a verified USD valuation/)).toBeInTheDocument();
    expect(screen.getByText(/1 with a stale valuation/)).toBeInTheDocument();
    expect(screen.queryByText(/unresolved currency details/)).not.toBeInTheDocument();
  });
});
