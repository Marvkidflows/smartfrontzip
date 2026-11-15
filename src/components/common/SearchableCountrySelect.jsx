// LOCATION: src/components/common/SearchableCountrySelect.jsx
//
// Custom countrySelectComponent for react-phone-number-input's <PhoneInput>.
// The library documents this exact customization point (countrySelectComponent
// prop) — it hands us `options` (every selectable country as {value, label})
// plus the usual controlled-input props (`value`, `onChange`, `disabled`).
// Per the library's own documented contract, `onChange(value: string?)` is
// called with the raw country code string directly, NOT a synthetic DOM
// event — verified against react-phone-number-input's README before fixing
// this (an earlier version of this file wrapped the value in a fake
// { target: { value } } event, which silently broke country selection).
//
// Renders a button showing the current country; clicking it opens a
// dropdown with a real search box on top, so the person can type instead
// of scrolling ~240 countries.

import { useState, useRef, useEffect } from 'react';
import { FiSearch, FiChevronDown } from 'react-icons/fi';
import './SearchableCountrySelect.css';

// Converts an ISO 3166-1 alpha-2 code (e.g. "NG") to its flag emoji via the
// standard Regional Indicator Symbol technique — no external data/library,
// no network call, just Unicode math (0x1F1E6 = Regional Indicator 'A').
function countryToFlagEmoji(iso2) {
  if (!iso2 || iso2.length !== 2) return '';
  return String.fromCodePoint(...[...iso2.toUpperCase()].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}


export default function SearchableCountrySelect({ value, onChange, options, disabled }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const current = options.find(o => o.value === value);

  useEffect(() => {
    if (open) {
      setQuery('');
      // Focus the search box the moment the dropdown opens.
      setTimeout(() => searchRef.current?.focus(), 0);
    }
  }, [open]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const filtered = options.filter(o =>
    !query || o.label.toLowerCase().includes(query.toLowerCase())
  );

  const select = (val) => {
    setOpen(false);
    // Per the library's documented countrySelectComponent contract,
    // onChange(value) is called with the raw country code string
    // directly — NOT wrapped in a synthetic DOM event. Wrapping it
    // (e.g. { target: { value: val } }) is what silently broke
    // selection: the library received an object instead of a string,
    // didn't recognize it as a valid country code, and dropped it.
    onChange?.(val);
  };

  return (
    <div className="scs-root" ref={rootRef}>
      <button
        type="button"
        className="scs-trigger"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
      >
        {current && <span className="scs-trigger__flag">{countryToFlagEmoji(current.value)}</span>}
        <span className="scs-trigger__label">{current ? current.label : 'Select country'}</span>
        <FiChevronDown size={14} />
      </button>

      {open && (
        <div className="scs-panel">
          <div className="scs-search">
            <FiSearch size={14} />
            <input
              ref={searchRef}
              type="text"
              placeholder="Search country…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <div className="scs-list">
            {filtered.length === 0 && <div className="scs-empty">No countries match.</div>}
            {filtered.map(o => (
              <button
                type="button"
                key={o.value || 'ZZ'}
                className={`scs-option ${o.value === value ? 'active' : ''}`}
                onClick={() => select(o.value)}
              >
                {o.value && <span className="scs-option__flag">{countryToFlagEmoji(o.value)}</span>}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
