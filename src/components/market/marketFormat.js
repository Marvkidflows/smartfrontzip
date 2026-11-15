// LOCATION: src/components/market/marketFormat.js
//
// Shared formatting helpers for the Live Market UI (public + investor).
// Kept in one place so price/percent formatting is identical everywhere
// it's shown.

export function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const num = Number(n);
  if (num >= 1) {
    return `$${num.toLocaleString(undefined, { maximumFractionDigits: num >= 1000 ? 2 : 4 })}`;
  }
  return `$${num.toPrecision(4)}`;
}

export function fmtPct(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const num = Number(n);
  return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
}

export function fmtCompactUsd(n) {
  if (n == null || Number.isNaN(n)) return '—';
  const num = Number(n);
  const abs = Math.abs(num);
  if (abs >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
  if (abs >= 1e9)  return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6)  return `$${(num / 1e6).toFixed(2)}M`;
  if (abs >= 1e3)  return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(2)}`;
}

export const CATEGORY_LABELS = {
  crypto: 'Crypto',
  commodity: 'Commodities',
  index: 'Indices',
};

export const RANGE_OPTIONS = [
  { value: '24h', label: '1D' },
  { value: '7d',  label: '1W' },
  { value: '30d', label: '1M' },
  { value: '1y',  label: '1Y' },
];
