// STATUS: NOT EXECUTED by its author (the sandbox had no installable node_modules). Run: npm install && npm test
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RankBadge, { NameWithRank } from './RankBadge';

const gold = { key: 'gold', name: 'Gold', level: 3, color: '#d4a017', icon: 'award' };

describe('RankBadge', () => {
  it('shows the rank name and exposes it as a title, from API data only', () => {
    render(<RankBadge rank={gold} />);
    expect(screen.getByText('Gold')).toBeInTheDocument();
    expect(screen.getByTitle('Gold rank')).toHaveClass('rank-badge--gold');
  });

  it('never relies on colour alone: the icon is hidden from assistive tech and the text label remains', () => {
    const { container } = render(<RankBadge rank={gold} />);
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByText('Gold')).toBeVisible();
  });

  it('icon-only mode still announces the rank to screen readers', () => {
    render(<RankBadge rank={gold} iconOnly />);
    expect(screen.getByText('Gold rank')).toHaveClass('rank-badge__sr');
  });

  it('renders a neutral Unranked chip when there is no rank, and nothing when told not to', () => {
    const { container, rerender } = render(<RankBadge rank={null} />);
    expect(screen.getByText('Unranked')).toBeInTheDocument();
    rerender(<RankBadge rank={null} showUnranked={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('falls back to a shield for an unknown icon name instead of crashing', () => {
    const { container } = render(<RankBadge rank={{ ...gold, icon: 'not-an-icon' }} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('NameWithRank keeps the full name in a title so truncation never hides it', () => {
    render(<NameWithRank name="A very long investor name" rank={gold} />);
    expect(screen.getByTitle('A very long investor name')).toBeInTheDocument();
    expect(screen.getByText('Gold')).toBeInTheDocument();
  });
});
