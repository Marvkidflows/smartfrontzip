import { useState, useEffect } from 'react';
import { FiArrowUpCircle, FiPlus, FiLock, FiShield } from 'react-icons/fi';
import { investorService } from '../../services/api';
import toast from 'react-hot-toast';
import './InvestorPages.css';

export default function InvestorWithdrawals() {
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPin, setHasPin] = useState(null); // null = unknown/loading

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ amount: '', method: '', wallet_address: '', bank_name: '', account_number: '', account_name: '', withdrawal_pin: '' });
  const [submitting, setSubmitting] = useState(false);

  // Task 5: fee disclosure. The server recalculates everything on submit; these figures are only what the investor is shown and must confirm.
  const [quote, setQuote] = useState(null);
  const [quoteError, setQuoteError] = useState('');
  const [feeConfirmed, setFeeConfirmed] = useState(false);

  const [showPinForm, setShowPinForm] = useState(false);
  const [pinForm, setPinForm] = useState({ current_pin: '', withdrawal_pin: '', withdrawal_pin_confirmation: '' });
  const [pinSubmitting, setPinSubmitting] = useState(false);

  const fetchWithdrawals = () => {
    investorService.getWithdrawals()
      .then(res => setWithdrawals(res.data?.withdrawals || res.data || []))
      .catch(() => toast.error('Failed to load withdrawals'))
      .finally(() => setLoading(false));
  };

  const fetchPinStatus = () => {
    investorService.getWithdrawalPinStatus()
      .then(res => setHasPin(!!res.data?.has_pin))
      .catch(() => setHasPin(null));
  };

  useEffect(() => {
    fetchWithdrawals();
    fetchPinStatus();
  }, []);

  useEffect(() => {
    setFeeConfirmed(false);
    setQuote(null);
    setQuoteError('');
    const amt = parseFloat(form.amount);
    if (!showForm || !amt || amt <= 0) return undefined;
    const t = setTimeout(() => {
      investorService.getWithdrawalQuote(form.amount)
        .then(res => setQuote(res.data?.quote || null))
        .catch(err => setQuoteError(err.response?.data?.errors?.amount?.[0] || err.response?.data?.message || 'Could not calculate the withdrawal fee.'));
    }, 350);
    return () => clearTimeout(t);
  }, [form.amount, showForm]);

  const handleRequestClick = () => {
    if (hasPin === false) {
      setShowPinForm(true);
      setShowForm(false);
      toast('Set up a withdrawal PIN first to request a withdrawal.', { icon: '🔒' });
      return;
    }
    setShowForm(v => !v);
    setShowPinForm(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quote) { toast.error(quoteError || 'Please wait for the fee calculation to finish.'); return; }
    if (quote.fee_applies && !feeConfirmed) { toast.error('Please confirm the fee and net amount shown.'); return; }
    setSubmitting(true);
    try {
      await investorService.storeWithdrawal({ ...form, confirmed_fee: quote.fee, confirmed_net: quote.net });
      toast.success('Withdrawal request submitted! Pending admin approval.');
      setShowForm(false);
      setForm(f => ({ ...f, amount: '', withdrawal_pin: '' }));
      fetchWithdrawals();
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'PIN_NOT_SET') {
        toast.error('You need to set up a withdrawal PIN first.');
        setShowForm(false);
        setShowPinForm(true);
      } else if (code === 'FEE_CONFIRMATION_REQUIRED') {
        setQuote(err.response?.data?.quote ? { ...quote, ...err.response.data.quote, fee_applies: true } : quote);
        setFeeConfirmed(false);
        toast.error(err.response?.data?.message || 'The fee has changed; please review the amounts.');
      } else {
        toast.error(err.response?.data?.message || err.response?.data?.errors?.amount?.[0] || 'Failed to submit withdrawal');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePinSubmit = async (e) => {
    e.preventDefault();
    if (pinForm.withdrawal_pin !== pinForm.withdrawal_pin_confirmation) {
      toast.error('PINs do not match.');
      return;
    }
    setPinSubmitting(true);
    try {
      await investorService.setWithdrawalPin(pinForm);
      toast.success('Withdrawal PIN saved!');
      setHasPin(true);
      setShowPinForm(false);
      setPinForm({ current_pin: '', withdrawal_pin: '', withdrawal_pin_confirmation: '' });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save PIN');
    } finally {
      setPinSubmitting(false);
    }
  };

  const isCrypto = form.method && ['bitcoin','ethereum','usdt'].includes(form.method);

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div>
          <h1>Withdrawals</h1>
          <p>Request withdrawals and track their processing status</p>
        </div>
        <button className="btn btn-gold" onClick={handleRequestClick}>
          <FiPlus /> Request Withdrawal
        </button>
      </div>

      {hasPin === false && !showPinForm && (
        <div className="inv-announcement" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
          <span>🔒 You haven't set up a withdrawal PIN yet. You'll need one before requesting a withdrawal.</span>
          <button className="btn btn-sm btn-primary" onClick={() => setShowPinForm(true)}>Set PIN</button>
        </div>
      )}

      {showPinForm && (
        <div className="inv-card dep-form">
          <h3 className="inv-card__title" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FiShield /> {hasPin ? 'Change Withdrawal PIN' : 'Set Up Withdrawal PIN'}
          </h3>
          <form onSubmit={handlePinSubmit}>
            {hasPin && (
              <div className="form-group">
                <label className="form-label">Current PIN</label>
                <input type="password" inputMode="numeric" maxLength={4} className="form-control" placeholder="••••" required
                  value={pinForm.current_pin}
                  onChange={e => setPinForm(f => ({ ...f, current_pin: e.target.value.replace(/\D/g, '') }))} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">New 4-Digit PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} className="form-control" placeholder="••••" required
                value={pinForm.withdrawal_pin}
                onChange={e => setPinForm(f => ({ ...f, withdrawal_pin: e.target.value.replace(/\D/g, '') }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm PIN</label>
              <input type="password" inputMode="numeric" maxLength={4} className="form-control" placeholder="••••" required
                value={pinForm.withdrawal_pin_confirmation}
                onChange={e => setPinForm(f => ({ ...f, withdrawal_pin_confirmation: e.target.value.replace(/\D/g, '') }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowPinForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={pinSubmitting}>
                {pinSubmitting ? <span className="spinner" /> : 'Save PIN'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showForm && (
        <div className="inv-card dep-form">
          <h3 className="inv-card__title" style={{ marginBottom:'1.5rem' }}>Withdrawal Request</h3>
          <div className="inv-announcement" style={{ marginBottom:'1.5rem' }}>
            ℹ️ Withdrawals are processed within 24–48 hours after admin approval.
          </div>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Amount (USD)</label>
              <input type="number" className="form-control" placeholder="500.00" required min="50"
                value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            {(quote || quoteError) && (
              <div className="inv-card" style={{ background: 'var(--gray-50)', margin: '0 0 1rem', padding: '1rem' }} aria-live="polite">
                {quoteError ? <span style={{ color: 'var(--danger, #b91c1c)' }}>{quoteError}</span> : (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span>Amount requested (gross)</span><strong>{quote.gross} {quote.currency}</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between' }}><span>Withdrawal fee</span><strong>{quote.fee} {quote.currency}</strong></div>
                    <div style={{ display:'flex', justifyContent:'space-between', borderTop:'1px solid var(--gray-200)', marginTop:'0.4rem', paddingTop:'0.4rem' }}><span>Net amount you receive</span><strong>{quote.net} {quote.currency}</strong></div>
                    {quote.explanation && <p style={{ fontSize:'0.8rem', margin:'0.5rem 0 0' }}>{quote.explanation}</p>}
                    {!quote.sufficient_balance && <p style={{ fontSize:'0.8rem', margin:'0.5rem 0 0', color:'var(--danger, #b91c1c)' }}>Your available balance ({quote.available_balance} {quote.currency}) is lower than this amount.</p>}
                    {quote.fee_applies && (
                      <label style={{ display:'flex', gap:'0.5rem', alignItems:'center', marginTop:'0.75rem', fontSize:'0.85rem' }}>
                        <input type="checkbox" checked={feeConfirmed} onChange={e => setFeeConfirmed(e.target.checked)} />
                        I understand a fee of {quote.fee} {quote.currency} applies and I will receive {quote.net} {quote.currency}.
                      </label>
                    )}
                  </>
                )}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Withdrawal Method</label>
              <select className="form-control" required value={form.method}
                onChange={e => setForm(f => ({ ...f, method: e.target.value }))}>
                <option value="">Select method…</option>
                <option value="bitcoin">Bitcoin (BTC)</option>
                <option value="ethereum">Ethereum (ETH)</option>
                <option value="usdt">USDT (TRC20)</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            {isCrypto ? (
              <div className="form-group">
                <label className="form-label">Wallet Address</label>
                <input className="form-control" placeholder="Your crypto wallet address" required
                  value={form.wallet_address} onChange={e => setForm(f => ({ ...f, wallet_address: e.target.value }))} />
              </div>
            ) : form.method === 'bank_transfer' ? (
              <>
                <div className="form-group">
                  <label className="form-label">Bank Name</label>
                  <input className="form-control" placeholder="e.g. Chase Bank" required
                    value={form.bank_name} onChange={e => setForm(f => ({ ...f, bank_name: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Number</label>
                  <input className="form-control" placeholder="0123456789" required
                    value={form.account_number} onChange={e => setForm(f => ({ ...f, account_number: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Account Name</label>
                  <input className="form-control" placeholder="John Doe" required
                    value={form.account_name} onChange={e => setForm(f => ({ ...f, account_name: e.target.value }))} />
                </div>
              </>
            ) : null}

            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <FiLock size={13} /> Withdrawal PIN
              </label>
              <input type="password" inputMode="numeric" maxLength={4} className="form-control" placeholder="••••" required
                value={form.withdrawal_pin}
                onChange={e => setForm(f => ({ ...f, withdrawal_pin: e.target.value.replace(/\D/g, '') }))} />
            </div>

            <div style={{ display:'flex', gap:'0.75rem' }}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={submitting || !quote || (quote.fee_applies && !feeConfirmed)}>
                {submitting ? <span className="spinner" /> : 'Confirm & Submit Request'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="inv-card">
        <h3 className="inv-card__title" style={{ marginBottom:'1.25rem' }}>Withdrawal History</h3>
        {loading ? (
          <div className="inv-loading">Loading…</div>
        ) : withdrawals.length === 0 ? (
          <div className="inv-empty-state">
            <FiArrowUpCircle size={36} />
            <p>No withdrawals requested yet.</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Gross</th><th>Fee</th><th>Net</th><th>Reference</th><th>Method</th><th>Date Requested</th><th>Status</th></tr>
              </thead>
              <tbody>
                {withdrawals.map(w => (
                  <tr key={w.id}>
                    <td><strong>${parseFloat(w.gross_amount ?? w.amount).toLocaleString()}</strong></td>
                    <td>{parseFloat(w.fee_amount || 0) > 0 ? `$${parseFloat(w.fee_amount).toLocaleString()}${w.fee_status === 'not_collected' ? ' (not charged)' : w.fee_status === 'reversed' || w.fee_status === 'waived' ? ` (${w.fee_status})` : ''}` : '—'}</td>
                    <td>${parseFloat(w.net_amount ?? w.amount).toLocaleString()}</td>
                    <td style={{ fontFamily:'monospace', fontSize:'0.8rem' }}>{w.transaction_reference || '—'}</td>
                    <td style={{ textTransform:'capitalize' }}>{w.method || '—'}</td>
                    <td>{w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}</td>
                    <td>
                      <span className={`badge badge-${w.status==='approved'?'success':w.status==='pending'?'warning':'danger'}`}>
                        {w.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
