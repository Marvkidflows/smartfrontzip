import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rankService, apiError } from '../../../services/rankService';

const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
const STATUS = {
  unverified: { label: 'Currency unknown', tone: 'bad' },
  stale:      { label: 'Amount changed — re-verify', tone: 'warn' },
  verified:   { label: 'Verified', tone: 'ok' },
};

// Rank thresholds are in USD. A stored amount carries no currency, so a person records it here (and, for a
// non-USD amount, the exchange rate and its source). The USD figure is computed by the server; nothing in the
// investment or deposit itself is changed.
export default function CurrencyReviewTab({ onChanged }) {
  const [summary, setSummary] = useState(null);
  const [type, setType] = useState('investment');
  const [issue, setIssue] = useState('needs_review');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState({});
  const [verify, setVerify] = useState(null);   // row being verified
  const [bulk, setBulk] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setDebounced(search.trim()); setPage(1); }, 300); return () => clearTimeout(t); }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, r] = await Promise.all([
        rankService.currencySummary(),
        rankService.currencyRecords({ type, issue, search: debounced || undefined, page }),
      ]);
      setSummary(s.data); setRows(r.data.data); setMeta(r.data.meta); setSelected({});
    } catch (e) { toast.error(apiError(e, 'Could not load records.')); }
    finally { setLoading(false); }
  }, [type, issue, debounced, page]);
  useEffect(() => { load(); }, [load]);

  const done = () => { setVerify(null); setBulk(false); load(); onChanged?.(); };
  const chosen = rows.filter((r) => selected[r.id] && r.valuation_status !== 'verified');

  return (
    <div>
      <div className="rk-banner rk-banner--info">
        <strong>Rank thresholds are in USD and are the same for every currency.</strong> Investments may be in any currency, but a stored amount has no currency attached, so it is <strong>never assumed to be USD</strong>.
        Only records whose currency you verify here count towards ranks. Records with an unknown valuation, or one that is stale because the amount changed since it was verified,
        are excluded from the qualifying rank figures until Financial verifies their valuations. They are <strong>not treated as zero</strong>, and <strong>no exchange rate is assumed</strong>.
        Suspected duplicate records are also excluded while they are under review: Financial must confirm whether a suspected duplicate is a separate valid record before it can count.
        Excluded records are listed below. For a non-USD amount you must record the exchange rate, its source and date.
        Verifying never edits the investment or deposit itself.
      </div>

      {summary && (
        <div className="rk-rank-grid" style={{ marginBottom: 12 }} aria-label="Records needing review">
          {[['Investments — currency unknown', summary.investments.unverified, 'unverified', 'investment'],
            ['Investments — amount changed', summary.investments.stale, 'stale', 'investment'],
            ['Investments — possible duplicates', summary.investments.duplicate_suspects, 'duplicates', 'investment'],
            ['Deposits — currency unknown', summary.deposits.unverified, 'unverified', 'deposit'],
            ['Deposits — amount changed', summary.deposits.stale, 'stale', 'deposit']].map(([label, n, i, t]) => (
            <button key={label} type="button" className="rk-rank-tile" style={{ textAlign: 'left', cursor: 'pointer' }}
              onClick={() => { setType(t); setIssue(i); setPage(1); }}>
              <div className="rk-rank-tile__count" style={{ color: n > 0 ? 'var(--danger, #EF4444)' : undefined }}>{n.toLocaleString()}</div>
              <div className="rk-muted">{label}</div>
            </button>
          ))}
        </div>
      )}

      <div className="rk-toolbar">
        <select className="rk-select" aria-label="Record type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
          <option value="investment">Investments</option><option value="deposit">Approved deposits</option>
        </select>
        <select className="rk-select" aria-label="Show" value={issue} onChange={(e) => { setIssue(e.target.value); setPage(1); }}>
          <option value="needs_review">Needs review</option><option value="unverified">Currency unknown</option>
          <option value="stale">Amount changed</option>{type === 'investment' && <option value="duplicates">Possible duplicates</option>}
          <option value="all">All records</option>
        </select>
        <input className="rk-input" type="search" aria-label="Search investors" placeholder="Investor name, email or account ID"
          value={search} onChange={(e) => setSearch(e.target.value)} style={{ flex: '2 1 240px' }} />
        <button className="rk-btn rk-btn--primary" disabled={chosen.length === 0} onClick={() => setBulk(true)}>
          Verify {chosen.length || ''} selected…
        </button>
      </div>

      <div className="rk-table-wrap">
        <table className="rk-table">
          <thead><tr><th /><th>Investor</th><th>Record</th><th>Stored amount</th><th>Status</th><th>Verified value</th><th /></tr></thead>
          <tbody>
            {loading && <tr><td colSpan={7} className="rk-muted">Loading…</td></tr>}
            {!loading && rows.length === 0 && <tr><td colSpan={7} className="rk-muted">Nothing to review here.</td></tr>}
            {!loading && rows.map((r) => {
              const st = STATUS[r.valuation_status];
              return (
                <tr key={r.id}>
                  <td><input type="checkbox" aria-label={`Select record ${r.id}`} disabled={r.valuation_status === 'verified'}
                    checked={!!selected[r.id]} onChange={(e) => setSelected({ ...selected, [r.id]: e.target.checked })} /></td>
                  <td className="rk-cell-name"><div style={{ overflowWrap: 'anywhere' }}>{r.investor_name}</div><div className="rk-mono rk-muted">{r.account_id}</div></td>
                  <td>#{r.id}<div className="rk-muted">{r.record_status}</div></td>
                  <td>{fmt(r.amount)}<div className="rk-muted">currency not recorded</div></td>
                  <td>
                    <span className={`rk-chip rk-chip--${st.tone}`}>{st.label}</span>
                    {r.duplicate_suspect && <div><span className="rk-chip rk-chip--warn" title="Same investor, plan, amount and start date as an earlier record, created moments apart. Excluded from ranking until confirmed.">Possible duplicate — excluded</span></div>}
                  </td>
                  <td>{r.usd_amount !== null ? <>{fmt(r.usd_amount)} USD<div className="rk-muted">from {fmt(r.verified_original_amount)} {r.currency}{r.currency !== 'USD' && ` @ ${r.fx_rate}`}</div></> : '—'}</td>
                  <td><button className="rk-btn rk-btn--sm" onClick={() => setVerify(r)}>{r.valuation_status === 'verified' ? 'Re-verify…' : 'Verify…'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="rk-pager">
        <span className="rk-muted">{meta.total.toLocaleString()} record{meta.total === 1 ? '' : 's'}</span>
        <button className="rk-btn rk-btn--sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
        <span>Page {meta.current_page} of {meta.last_page}</span>
        <button className="rk-btn rk-btn--sm" disabled={page >= meta.last_page} onClick={() => setPage(page + 1)}>Next</button>
      </div>

      {verify && <VerifyModal row={verify} type={type} onClose={() => setVerify(null)} onDone={done} />}
      {bulk && <BulkModal rows={chosen} type={type} onClose={() => setBulk(false)} onDone={done} />}
    </div>
  );
}


// Currency codes the server accepts (ISO-4217 + configured extras) — loaded once and shared by both modals.
let supportedCache = null;
function useSupportedCurrencies() {
  const [list, setList] = useState(supportedCache || []);
  useEffect(() => {
    if (supportedCache) return;
    rankService.currencySupported().then((r) => { supportedCache = r.data.currencies; setList(supportedCache); }).catch(() => {});
  }, []);
  return list;
}

// Rates already recorded for this currency (reuse only — the person still confirms rate, source and date).
function RecentRates({ currency, onPick }) {
  const [recent, setRecent] = useState([]);
  useEffect(() => {
    const c = currency.trim().toUpperCase();
    if (c.length < 3 || c === 'USD') { setRecent([]); return undefined; }
    let live = true;
    rankService.currencyRates(c).then((r) => { if (live) setRecent(r.data.recent); }).catch(() => { if (live) setRecent([]); });
    return () => { live = false; };
  }, [currency]);
  if (!recent.length) return null;
  return (
    <div className="rk-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
      Previously recorded:{' '}
      {recent.map((r) => (
        <button key={`${r.rate}|${r.rate_source}|${r.rate_date}`} type="button" className="rk-btn rk-btn--sm" style={{ marginRight: 4 }}
          onClick={() => onPick(r)} title="Fill the rate, source and date from this earlier record">
          {r.rate} · {r.rate_source || 'no source'}{r.rate_date ? ` · ${r.rate_date}` : ''}
        </button>
      ))}
    </div>
  );
}

// Warnings about an unusual rate; saving needs the person to tick the acknowledgement.
function RateWarnings({ errors, ack, setAck }) {
  const list = errors.rate_warnings;
  if (!list?.length) return null;
  return (
    <div className="rk-banner rk-banner--warn" role="alert" style={{ marginTop: 10 }}>
      <strong>Check this rate before saving:</strong>
      <ul style={{ margin: '6px 0 6px 18px' }}>{list.map((w) => <li key={w}>{w}</li>)}</ul>
      <label className="rk-check" style={{ alignItems: 'flex-start' }}>
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
        <span>I have checked the rate and its date and want to record it anyway (this is logged).</span>
      </label>
    </div>
  );
}

function VerifyModal({ row, type, onClose, onDone }) {
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState('');
  const [source, setSource] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [note, setNote] = useState('');
  const [distinct, setDistinct] = useState(false);
  const [ack, setAck] = useState(false);
  const supported = useSupportedCurrencies();
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const isUsd = currency.trim().toUpperCase() === 'USD';
  const preview = isUsd ? row.amount : (Number(rate) > 0 ? row.amount * Number(rate) : null);

  const submit = async () => {
    setBusy(true); setErrors({});
    try {
      const res = await rankService.currencyVerify(type, row.id, {
        currency: currency.trim().toUpperCase(), rate: isUsd ? undefined : rate, rate_source: isUsd ? undefined : source,
        rate_date: isUsd ? undefined : rateDate, note, confirm_distinct: distinct || undefined,
        acknowledge_rate_warnings: ack || undefined,
      });
      toast.success(res.data.message); onDone();
    } catch (e) { setErrors(e?.response?.data?.errors || {}); toast.error(apiError(e)); }
    finally { setBusy(false); }
  };
  const err = (k) => errors[k]?.[0] && <div className="rk-error" role="alert">{errors[k][0]}</div>;

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Verify currency" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Verify {type} #{row.id}</h3>
        <p className="rk-muted">{row.investor_name} · <span className="rk-mono">{row.account_id}</span><br />Stored amount: <strong>{fmt(row.amount)}</strong> (currency not recorded)</p>

        <label className="rk-label" htmlFor="cv-cur">What currency is this stored amount in?</label>
        <input id="cv-cur" className="rk-input" list="cv-currencies" value={currency} maxLength={8} autoComplete="off"
          onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setAck(false); setErrors({}); }} />
        <datalist id="cv-currencies">{supported.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist>
        {err('currency')}

        {!isUsd && (
          <>
            <label className="rk-label" htmlFor="cv-rate">Exchange rate (1 {currency.toUpperCase() || 'unit'} = ? USD)</label>
            <input id="cv-rate" className="rk-input" type="number" step="any" min="0" value={rate} onChange={(e) => { setRate(e.target.value); setAck(false); }} />
            {err('rate')}
            <RecentRates currency={currency} onPick={(r) => { setRate(String(r.rate)); setSource(r.rate_source || ''); setRateDate(r.rate_date || ''); setAck(false); }} />
            <label className="rk-label" htmlFor="cv-src">Where did the rate come from?</label>
            <input id="cv-src" className="rk-input" value={source} maxLength={160} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Central bank reference rate" />
            {err('rate_source')}
            <label className="rk-label" htmlFor="cv-date">Date the rate applies to</label>
            <input id="cv-date" className="rk-input" type="date" max={new Date().toISOString().slice(0, 10)} value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
            {err('rate_date')}
            <RateWarnings errors={errors} ack={ack} setAck={setAck} />
          </>
        )}

        <div className="rk-banner rk-banner--info" style={{ marginTop: 12 }}>
          {preview !== null
            ? <>Counts as <strong>{fmt(preview)} USD</strong> <span className="rk-muted">(preview — the server computes the saved value)</span></>
            : 'Enter a rate to see the USD value.'}
        </div>

        <label className="rk-label" htmlFor="cv-note">What did you verify, and against what? (required)</label>
        <textarea id="cv-note" className="rk-input" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Matched bank slip #1234 — paid in USD" />
        {err('note')}

        {(row.duplicate_suspect || errors.duplicate) && (
          <label className="rk-check" style={{ marginTop: 10, alignItems: 'flex-start' }}>
            <input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} />
            <span>This looks like a duplicate of an earlier record. I have confirmed it is a <strong>separate, genuine investment</strong>.</span>
          </label>
        )}
        {err('duplicate')}{err('record')}

        <div className="adm-modal-footer">
          <button className="rk-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="rk-btn rk-btn--primary" onClick={submit} disabled={busy || note.trim().length < 5 || (!isUsd && !(Number(rate) > 0))}>{busy ? 'Saving…' : 'Save verification'}</button>
        </div>
      </div>
    </div>
  );
}

function BulkModal({ rows, type, onClose, onDone }) {
  const [currency, setCurrency] = useState('USD');
  const [rate, setRate] = useState('');
  const [source, setSource] = useState('');
  const [rateDate, setRateDate] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const supported = useSupportedCurrencies();
  const isUsd = currency.trim().toUpperCase() === 'USD';
  const total = rows.reduce((t, r) => t + Number(r.amount), 0);
  const err = (k) => errors[k]?.[0] && <div className="rk-error" role="alert">{errors[k][0]}</div>;

  const submit = async () => {
    setBusy(true); setErrors({});
    try {
      const res = await rankService.currencyBulkVerify({
        type, ids: rows.map((r) => r.id), currency: currency.trim().toUpperCase(),
        rate: isUsd ? undefined : rate, rate_source: isUsd ? undefined : source, rate_date: isUsd ? undefined : rateDate,
        note, acknowledge_rate_warnings: ack || undefined,
      });
      setResult(res.data); toast.success(res.data.message);
    } catch (e) { setErrors(e?.response?.data?.errors || {}); toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="adm-modal-overlay" onClick={result ? onDone : onClose} role="presentation">
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Verify selected records" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Verify {rows.length} selected {type}(s) in one currency</h3>
        {!result ? (
          <>
            <div className="rk-banner rk-banner--warn">This is an attestation that <strong>you have checked</strong> all {rows.length} records are in the currency below
              {isUsd ? '' : ' and that the one exchange rate you record applies to all of them'}. It is recorded under your name for every record. Records in a different currency must be verified separately.</div>

            <label className="rk-label" htmlFor="bk-cur">Currency of all selected records</label>
            <input id="bk-cur" className="rk-input" list="bk-currencies" value={currency} maxLength={8} autoComplete="off"
              onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setAck(false); setErrors({}); }} />
            <datalist id="bk-currencies">{supported.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist>
            {err('currency')}

            {!isUsd && (
              <>
                <label className="rk-label" htmlFor="bk-rate">Exchange rate (1 {currency || 'unit'} = ? USD)</label>
                <input id="bk-rate" className="rk-input" type="number" step="any" min="0" value={rate} onChange={(e) => { setRate(e.target.value); setAck(false); }} />
                {err('rate')}
                <RecentRates currency={currency} onPick={(r) => { setRate(String(r.rate)); setSource(r.rate_source || ''); setRateDate(r.rate_date || ''); setAck(false); }} />
                <label className="rk-label" htmlFor="bk-src">Where did the rate come from?</label>
                <input id="bk-src" className="rk-input" value={source} maxLength={160} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Central bank reference rate" />
                {err('rate_source')}
                <label className="rk-label" htmlFor="bk-date">Date the rate applies to</label>
                <input id="bk-date" className="rk-input" type="date" max={new Date().toISOString().slice(0, 10)} value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
                {err('rate_date')}
                <RateWarnings errors={errors} ack={ack} setAck={setAck} />
              </>
            )}

            <div className="rk-banner rk-banner--info" style={{ marginTop: 12 }}>
              {isUsd || Number(rate) > 0
                ? <>Selected stored total <strong>{fmt(total)} {currency || ''}</strong> counts as about <strong>{fmt(isUsd ? total : total * Number(rate))} USD</strong> <span className="rk-muted">(preview — the server computes each saved value)</span></>
                : 'Enter a rate to see the USD value.'}
            </div>

            <label className="rk-label" htmlFor="bk-note">Basis for the attestation (required, min 10 characters)</label>
            <textarea id="bk-note" className="rk-input" rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reconciled against the bank statement for October" />
            {err('note')}
            <div className="adm-modal-footer">
              <button className="rk-btn" onClick={onClose} disabled={busy}>Cancel</button>
              <button className="rk-btn rk-btn--primary" onClick={submit} disabled={busy || note.trim().length < 10 || currency.trim().length < 3 || (!isUsd && !(Number(rate) > 0))}>{busy ? 'Saving…' : `Verify as ${currency || '…'}`}</button>
            </div>
          </>
        ) : (
          <>
            <p>{result.message}</p>
            {result.skipped.length > 0 && <ul style={{ fontSize: '0.85rem' }}>{result.skipped.map((s) => <li key={s.id}>#{s.id}: {s.reason}</li>)}</ul>}
            <div className="adm-modal-footer"><button className="rk-btn rk-btn--primary" onClick={onDone}>Done</button></div>
          </>
        )}
      </div>
    </div>
  );
}
