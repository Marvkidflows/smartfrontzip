import { useState, useEffect } from 'react';
import { FiCopy, FiShare2 } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { investorService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import './InvestorPages.css';

// Task 5: investor referral page. Read-only: nothing here can change attribution or a reward. Pending / approved / credited are always shown
// separately and only CREDITED rewards are ever described as paid.
const STATUS = {
  pending:  { label: 'Pending',  cls: 'warning', note: 'Not paid' },
  approved: { label: 'Approved', cls: 'info',    note: 'Not yet paid' },
  credited: { label: 'Credited', cls: 'success', note: 'Paid to your wallet' },
  rejected: { label: 'Rejected', cls: 'danger',  note: '' },
  reversed: { label: 'Reversed', cls: 'danger',  note: '' },
  none:     { label: '—',        cls: 'secondary', note: '' },
};

export default function InvestorReferrals() {
  const { user } = useAuthStore();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    investorService.getReferrals()
      .then(res => setData(res.data))
      .catch(() => toast.error('Failed to load referrals'))
      .finally(() => setLoading(false));
  }, []);

  const code = data?.referral_code || user?.referral_code || '';
  const link = code ? `${window.location.origin}/register?ref=${code}` : '';
  const copy = (text) => { navigator.clipboard?.writeText(text); toast.success('Copied!'); };
  const share = async () => {
    if (navigator.share) { try { await navigator.share({ title: 'Join SSI', text: 'Join Smart System Investment', url: link }); } catch { /* cancelled */ } }
    else copy(link);
  };
  const t = data?.totals || {}; const c = data?.counts || {}; const prog = data?.programme;
  const money = (v) => `$${Number(v || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="inv-page">
      <div className="inv-page__header"><div><h1>Referrals</h1><p>Invite people to SSI. Rewards are paid only after approval.</p></div></div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: '1.5rem' }}>
        <div className="inv-card">
          <h3 className="inv-card__title" style={{ marginBottom: '1rem' }}>Your referral code & link</h3>
          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{ flex: 1, border: '1.5px dashed var(--gray-200)', borderRadius: 8, padding: '0.8rem 1rem', fontFamily: 'monospace', fontWeight: 700, fontSize: '1.1rem' }}>{code || '—'}</div>
            <button className="btn btn-gold" disabled={!code} onClick={() => copy(code)}><FiCopy /> Copy</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input className="form-control" readOnly value={link} style={{ fontSize: '0.78rem' }} aria-label="Referral link" />
            <button className="btn btn-outline" disabled={!link} onClick={() => copy(link)} aria-label="Copy link"><FiCopy /></button>
            <button className="btn btn-outline" disabled={!link} onClick={share} aria-label="Share link"><FiShare2 /></button>
          </div>
        </div>

        <div className="inv-card">
          <h3 className="inv-card__title" style={{ marginBottom: '1rem' }}>Your rewards</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {[['Pending (not paid)', t.pending, c.pending], ['Approved (not yet paid)', t.approved, c.approved], ['Credited (paid)', t.credited, c.credited], ['Rejected / reversed', Number(t.rejected || 0) + Number(t.reversed || 0), (c.rejected || 0) + (c.reversed || 0)]].map(([l, v, n]) => (
              <div key={l} style={{ background: 'var(--gray-50)', borderRadius: 8, padding: '0.75rem' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{l}</div>
                <strong style={{ fontSize: '1.15rem' }}>{money(v)}</strong> <span style={{ fontSize: '0.75rem' }}>({n || 0})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="inv-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="inv-card__title" style={{ marginBottom: '0.75rem' }}>Conditions{prog?.reward_amount ? ` — ${money(prog.reward_amount)} per eligible referral` : ''}</h3>
        {!prog?.active && <div className="inv-announcement" style={{ marginBottom: '0.75rem' }}>The referral programme conditions are not finalised yet. Referrals are recorded, but nothing is payable until they are published.</div>}
        <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.9rem' }}>{(prog?.conditions || []).map((x, i) => <li key={i}>{x}</li>)}</ul>
      </div>

      <div className="inv-card" style={{ marginTop: '1.5rem' }}>
        <h3 className="inv-card__title" style={{ marginBottom: '1rem' }}>Your referrals</h3>
        {loading ? <div className="inv-loading">Loading…</div> : !data?.referrals?.length ? <div className="inv-empty-state"><p>No referrals yet. Share your link to get started.</p></div> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Person</th><th>Registered</th><th>Registration</th><th>Activation</th><th>Reward</th><th>Status</th><th>Details</th></tr></thead>
            <tbody>{data.referrals.map(r => { const s = STATUS[r.status] || STATUS.none; return (
              <tr key={r.id}>
                <td>{r.name}<div style={{ fontSize: '0.75rem', color: 'var(--gray-500)' }}>{r.email}</div></td>
                <td>{r.registered_at || '—'}</td>
                <td style={{ textTransform: 'capitalize' }}>{r.registration_status}</td>
                <td style={{ textTransform: 'capitalize' }}>{String(r.activation_status).replace('_', ' ')}</td>
                <td>{r.reward_amount ? money(r.reward_amount) : '—'}</td>
                <td><span className={`badge badge-${s.cls}`}>{s.label}</span>{s.note && <div style={{ fontSize: '0.7rem' }}>{s.note}</div>}</td>
                <td style={{ fontSize: '0.8rem', maxWidth: 280 }}>{r.explanation}{r.credit_reference && <div style={{ fontFamily: 'monospace' }}>{r.credit_reference}</div>}</td>
              </tr>); })}</tbody>
          </table></div>
        )}
      </div>
    </div>
  );
}
