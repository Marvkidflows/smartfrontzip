// STATUS: NOT EXECUTED by its author (no installable node_modules in the authoring environment). Run: npm install && npm test
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../services/rankService', () => ({ rankService: { planTerms: vi.fn() } }));
import { rankService } from '../services/rankService';
import PlanCommitTerms from './PlanCommitTerms';

const base = {
  plan: { id: 7, name: 'Growth', contractual_return_percent: 10, duration_days: 30, min_amount: 100, max_amount: null },
  rank_incentives: [],
  notice: 'Rank benefits do not change the contractual return of a plan.',
  terms_recorded_at_investment: 'The terms shown here are recorded with your investment when you confirm it.',
};

describe('PlanCommitTerms (terms shown before an investor confirms)', () => {
  beforeEach(() => { rankService.planTerms.mockReset(); });

  it('shows the contractual return, the duration, that no incentive applies, and the notices', async () => {
    rankService.planTerms.mockResolvedValue({ data: base });
    render(<PlanCommitTerms planId={7} />);
    expect(await screen.findByText(/Contractual return: 10% over 30 days/)).toBeInTheDocument();
    expect(screen.getByText(/none applies/)).toBeInTheDocument();
    expect(screen.getByText(base.notice)).toBeInTheDocument();
    expect(screen.getByText(base.terms_recorded_at_investment)).toBeInTheDocument();
    expect(rankService.planTerms).toHaveBeenCalledWith(7);
  });

  it('lists a rank incentive only when the server returns one, and labels it as separate from the return', async () => {
    rankService.planTerms.mockResolvedValue({ data: { ...base, rank_incentives: [{ label: 'Gold loyalty bonus', kind: 'percentage_bonus', value: 1.5, conditions: 'Completed cycles only' }] } });
    render(<PlanCommitTerms planId={7} />);
    expect(await screen.findByText(/Gold loyalty bonus: 1.5% \(separate from the return\) — Completed cycles only/)).toBeInTheDocument();
    expect(screen.queryByText(/none applies/)).not.toBeInTheDocument();
  });

  it('renders nothing, and does not throw, when the terms cannot be loaded (investing is never blocked)', async () => {
    rankService.planTerms.mockRejectedValue(new Error('network'));
    const { container } = render(<PlanCommitTerms planId={7} />);
    await waitFor(() => expect(rankService.planTerms).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('asks for the terms of the plan being invested in and reloads when the plan changes', async () => {
    rankService.planTerms.mockResolvedValue({ data: base });
    const { rerender } = render(<PlanCommitTerms planId={7} />);
    await screen.findByText(/Contractual return/);
    rerender(<PlanCommitTerms planId={9} />);
    await waitFor(() => expect(rankService.planTerms).toHaveBeenCalledWith(9));
  });
});
