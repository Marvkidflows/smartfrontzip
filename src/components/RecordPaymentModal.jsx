import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { rankService, apiError } from '../services/rankService';
import '../pages/admin/ranks/AdminRanks.css';

const fmt = (n) => (n === null || n === undefined || Number.isNaN(n) ? '—' : Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// SSI personnel record what was ACTUALLY paid for a (Telegram-coordinated) deposit: amount + currency, the exchange rate
// used (with its source and date) and the payer's transfer reference. Telegram is only the conversation; this is the
// verified record. It does NOT approve the deposit — Approve / Hold / Reject stay exactly as they were.
// `submit(data)` is supplied by the page (admin or financial endpoint) so the same screen works for both roles.
export default function RecordPaymentModal({ deposit, submit, onClose, onSaved }) {
  const existing = deposit.payment || {};
  const [paidAmount, setPaidAmount] = useState(existing.paid_amount ?? '');
  const [currency, setCurrency] = useState(existing.paid_currency || '');
  const [rate, setRate] = useState(existing.fx_rate && existing.paid_currency !== 'USD' ? String(existing.fx_rate) : '');
  const [source, setSource] = useState(existing.rate_source || '');
  const [rateDate, setRateDate] = useState(existing.rate_date || '');
  const [payDate, setPayDate] = useState(existing.payment_date || '');
  const [ackAmt, setAckAmt] = useState(false);
  const [reference, setReference] = useState(existing.external_reference || '');
  const [channel, setChannel] = useState(existing.funding_channel || 'telegram');
  const [approved, setApproved] = useState('');
  const [note, setNote] = useState('');
  const [ack, setAck] = useState(false);
  const [distinct, setDistinct] = useState(false);
  const [supported, setSupported] = useState([]);
  const [recent, setRecent] = useState([]);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const code = currency.trim().toUpperCase();
  const isUsd = code === 'USD';
  const computed = isUsd ? Number(paidAmount) : Number(paidAmount) * Number(rate);
  const canPreview = Number(paidAmount) > 0 && (isUsd || Number(rate) > 0);

  useEffect(() => { rankService.currencySupported().then((r) => setSupported(r.data.currencies)).catch(() => {}); }, []);
  useEffect(() => {
    if (code.length < 3 || isUsd) { setRecent([]); return undefined; }
    let live = true;
    rankService.currencyRates(code).then((r) => { if (live) setRecent(r.data.recent); }).catch(() => { if (live) setRecent([]); });
    return () => { live = false; };
  }, [code, isUsd]);

  const err = (k) => errors[k]?.[0] && <div className="rk-error" role="alert">{errors[k][0]}</div>;

  const save = async () => {
    setBusy(true); setErrors({});
    try {
      const res = await submit({
        paid_amount: paidAmount, paid_currency: code, rate: isUsd ? undefined : rate, rate_source: isUsd ? undefined : source,
        rate_date: isUsd ? undefined : rateDate, payment_date: payDate || undefined, acknowledge_amount_difference: ackAmt || undefined, external_reference: reference || undefined, funding_channel: channel,
        approved_amount: approved || undefined, note, acknowledge_rate_warnings: ack || undefined, confirm_distinct: distinct || undefined,
      });
      toast.success(res.data.message); onSaved?.(res.data);
    } catch (e) { setErrors(e?.response?.data?.errors || {}); toast.error(apiError(e)); }
    finally { setBusy(false); }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <div className="adm-modal" role="dialog" aria-modal="true" aria-label="Record payment details" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ marginTop: 0 }}>Record payment — deposit #{deposit.id}</h3>
        <div className="rk-banner rk-banner--info">
          Telegram is only where the payment was arranged. Record what was <strong>actually received</strong> (check the bank slip / transfer).
          This does <strong>not</strong> approve the deposit. On approval the wallet is credited with the <strong>approved USD amount</strong> below.
          {deposit.requested !== undefined && <> Amount currently on the deposit: <strong>${fmt(deposit.requested)}</strong>.</>}
        </div>

        <label className="rk-label" htmlFor="rp-amt">Amount actually paid</label>
        <input id="rp-amt" className="rk-input" type="number" step="any" min="0" value={paidAmount} onChange={(e) => { setPaidAmount(e.target.value); setAck(false); }} />
        {err('paid_amount')}

        <label className="rk-label" htmlFor="rp-cur">Currency paid</label>
        <input id="rp-cur" className="rk-input" list="rp-currencies" maxLength={8} autoComplete="off" value={currency}
          onChange={(e) => { setCurrency(e.target.value.toUpperCase()); setAck(false); setErrors({}); }} placeholder="e.g. NGN, GBP, EUR, USD" />
        <datalist id="rp-currencies">{supported.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}</datalist>
        {err('paid_currency')}

        {code.length >= 3 && !isUsd && (
          <>
            <label className="rk-label" htmlFor="rp-rate">Exchange rate (1 {code} = ? USD)</label>
            <input id="rp-rate" className="rk-input" type="number" step="any" min="0" value={rate} onChange={(e) => { setRate(e.target.value); setAck(false); }} />
            {err('rate')}
            {recent.length > 0 && (
              <div className="rk-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>Previously recorded:{' '}
                {recent.map((r) => (
                  <button key={`${r.rate}|${r.rate_source}|${r.rate_date}`} type="button" className="rk-btn rk-btn--sm" style={{ marginRight: 4 }}
                    onClick={() => { setRate(String(r.rate)); setSource(r.rate_source || ''); setRateDate(r.rate_date || ''); setAck(false); }}>
                    {r.rate} · {r.rate_source || 'no source'}{r.rate_date ? ` · ${r.rate_date}` : ''}
                  </button>
                ))}
              </div>
            )}
            <label className="rk-label" htmlFor="rp-src">Where did the rate come from?</label>
            <input id="rp-src" className="rk-input" maxLength={160} value={source} onChange={(e) => setSource(e.target.value)} placeholder="e.g. Central bank reference rate" />
            {err('rate_source')}
            <label className="rk-label" htmlFor="rp-rdate">Date the rate applies to</label>
            <input id="rp-rdate" className="rk-input" type="date" max={new Date().toISOString().slice(0, 10)} value={rateDate} onChange={(e) => setRateDate(e.target.value)} />
            {err('rate_date')}
          </>
        )}

        {code.length >= 3 && (
          <>
            <label className="rk-label" htmlFor="rp-pdate">Date the payment was received{isUsd ? ' (optional)' : ''}</label>
            <input id="rp-pdate" className="rk-input" type="date" max={new Date().toISOString().slice(0, 10)} value={payDate} onChange={(e) => { setPayDate(e.target.value); setAck(false); }} />
            {err('payment_date')}
          </>
        )}

        <div className="rk-banner rk-banner--info" style={{ marginTop: 12 }}>
          {canPreview ? <>Converts to <strong>${fmt(computed)} USD</strong> <span className="rk-muted">(preview — the server computes the saved value)</span></> : 'Enter the amount, currency and rate to see the USD value.'}
        </div>

        <label className="rk-label" htmlFor="rp-appr">Approved USD amount to credit (optional — leave blank to use the converted value)</label>
        <input id="rp-appr" className="rk-input" type="number" step="any" min="0" value={approved} onChange={(e) => setApproved(e.target.value)} placeholder={canPreview ? fmt(computed) : ''} />
        {err('approved_amount')}
        {errors.amount_difference?.length > 0 && (
          <div className="rk-banner rk-banner--warn" role="alert" style={{ marginTop: 10 }}>
            {errors.amount_difference[0]}
            <label className="rk-check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={ackAmt} onChange={(e) => setAckAmt(e.target.checked)} />
              <span>The difference is intentional (e.g. bank fees) and I accept responsibility for it. This is logged.</span>
            </label>
          </div>
        )}

        <label className="rk-label" htmlFor="rp-ref">Payer's transfer / bank reference</label>
        <input id="rp-ref" className="rk-input" maxLength={120} value={reference} onChange={(e) => setReference(e.target.value)} />
        <label className="rk-label" htmlFor="rp-ch">Arranged through</label>
        <select id="rp-ch" className="rk-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="telegram">Telegram representative</option><option value="app">In the app</option><option value="other">Other</option>
        </select>

        <label className="rk-label" htmlFor="rp-note">What did you verify, and against what? (required)</label>
        <textarea id="rp-note" className="rk-input" rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Matched bank slip with the Telegram agent's confirmation" />
        {err('note')}

        {errors.rate_warnings?.length > 0 && (
          <div className="rk-banner rk-banner--warn" role="alert" style={{ marginTop: 10 }}>
            <strong>Check this rate before saving:</strong>
            <ul style={{ margin: '6px 0 6px 18px' }}>{errors.rate_warnings.map((w) => <li key={w}>{w}</li>)}</ul>
            <label className="rk-check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <span>I have checked the rate and want to record it anyway (this is logged).</span>
            </label>
          </div>
        )}
        {errors.duplicate?.length > 0 && (
          <div className="rk-banner rk-banner--warn" role="alert" style={{ marginTop: 10 }}>
            {errors.duplicate[0]}
            <label className="rk-check" style={{ alignItems: 'flex-start' }}>
              <input type="checkbox" checked={distinct} onChange={(e) => setDistinct(e.target.checked)} />
              <span>This is a separate, genuine payment.</span>
            </label>
          </div>
        )}
        {err('deposit')}

        <div className="adm-modal-footer">
          <button className="rk-btn" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="rk-btn rk-btn--primary" onClick={save}
            disabled={busy || note.trim().length < 5 || !(Number(paidAmount) > 0) || code.length < 3 || (!isUsd && (!(Number(rate) > 0) || !payDate))}>{busy ? 'Saving…' : 'Save payment details'}</button>
        </div>
      </div>
    </div>
  );
}
