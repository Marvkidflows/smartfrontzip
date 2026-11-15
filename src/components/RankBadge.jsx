import { LuShield, LuShieldCheck, LuAward, LuStar, LuGem, LuCrown } from 'react-icons/lu';
import './RankBadge.css';

// Icon names come from the backend (investor_ranks.icon) so rank identity has one
// source of truth. Unknown names fall back to a shield rather than breaking.
// One distinct icon per rank (keep in step with InvestorRank::SUPPORTED_ICONS on the backend).
const ICONS = { shield: LuShield, 'shield-check': LuShieldCheck, award: LuAward, star: LuStar, diamond: LuGem, crown: LuCrown };

/**
 * Reusable investor rank badge. Pass the `rank` object exactly as the API returns it
 * ({ key, name, level, color, icon }) — never a hardcoded rank.
 *
 * size:          'sm' | 'md' | 'lg'
 * iconOnly:      compact form for tight spaces (still announced to screen readers)
 * showUnranked:  render a neutral "Unranked" chip when rank is null (default true)
 */
export default function RankBadge({ rank, size = 'md', iconOnly = false, showUnranked = true, className = '' }) {
  if (!rank) {
    if (!showUnranked) return null;
    return (
      <span
        className={`rank-badge rank-badge--${size} rank-badge--none ${iconOnly ? 'rank-badge--icon-only' : ''} ${className}`}
        title="No rank assigned"
      >
        <LuShield aria-hidden="true" className="rank-badge__icon" />
        {!iconOnly && <span className="rank-badge__label">Unranked</span>}
        {iconOnly && <span className="rank-badge__sr">Unranked</span>}
      </span>
    );
  }

  const Icon = ICONS[rank.icon] || LuShield;
  return (
    <span
      className={`rank-badge rank-badge--${size} rank-badge--${rank.key} ${iconOnly ? 'rank-badge--icon-only' : ''} ${className}`}
      style={{ '--rank-color': rank.color }}
      title={`${rank.name} rank`}
    >
      <Icon aria-hidden="true" className="rank-badge__icon" />
      {iconOnly ? <span className="rank-badge__sr">{rank.name} rank</span> : <span className="rank-badge__label">{rank.name}</span>}
    </span>
  );
}

/**
 * Name + badge that behaves on small screens: the name truncates with an ellipsis
 * while the badge never shrinks or wraps off-screen, so existing layouts don't break.
 */
export function NameWithRank({ name, rank, size = 'sm', showUnranked = false, iconOnly = false, className = '' }) {
  return (
    <span className={`name-with-rank ${className}`}>
      <span className="name-with-rank__name" title={name}>{name}</span>
      <RankBadge rank={rank} size={size} showUnranked={showUnranked} iconOnly={iconOnly} />
    </span>
  );
}
