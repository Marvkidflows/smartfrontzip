// LOCATION: src/pages/investor/InvestorTasks.jsx
//
// Investor Task Management dashboard (Guide §8-11). All validation shown
// here is a UX convenience — every check is re-enforced server-side.

import { useState, useEffect } from 'react';
import { FiCheckSquare, FiClock, FiCheckCircle, FiAlertTriangle, FiSend } from 'react-icons/fi';
import { investorService } from '../../services/api';
import toast from 'react-hot-toast';
import { NameWithRank } from '../../components/RankBadge';
import TaskStatusBadge from '../../components/tasks/TaskStatusBadge';
import TaskCountdown from '../../components/tasks/TaskCountdown';
import './InvestorPages.css';

function ActiveTaskCard({ task, onRefresh }) {
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isPendingWindow = task.status === 'awaiting_activation' && task.code_confirmed;
  const canSubmitActivity = ['active', 'in_progress'].includes(task.status);
  const showResult = ['under_review', 'completed'].includes(task.status) && task.final_result !== null;

  const handleSubmitActivity = async () => {
    setSubmitting(true);
    try {
      const res = await investorService.submitTaskActivity(task.id, { notes });
      toast.success(res.data.message);
      onRefresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="task-active-card">
      <div className="task-active-card__top">
        <div>
          <div className="task-active-card__title">{task.title}</div>
          <div className="task-active-card__code">{task.task_code}</div>
        </div>
        <TaskStatusBadge status={task.status} />
      </div>

      {task.description && <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)', marginBottom: '0.5rem' }}>{task.description}</p>}
      {task.requirements && (
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}><strong>Requirements:</strong> {task.requirements}</p>
      )}

      <div className="task-active-card__meta">
        {task.required_amount != null && (
          <div><label>Required Amount</label><span>${Number(task.required_amount).toLocaleString()}</span></div>
        )}
        {isPendingWindow && task.seconds_until_start != null && (
          <div>
            <TaskCountdown secondsRemaining={task.seconds_until_start} onExpire={onRefresh} label="Starts In" />
          </div>
        )}
        {!isPendingWindow && task.seconds_remaining != null && task.status !== 'completed' && (
          <div>
            <TaskCountdown secondsRemaining={task.seconds_remaining} onExpire={onRefresh} />
          </div>
        )}
      </div>

      {isPendingWindow && (
        <div className="task-result-panel">
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            Your code is confirmed. This task will start automatically the moment the admin's window opens — no further action needed.
          </p>
        </div>
      )}

      {task.status === 'deactivated' && (
        <div className="task-result-panel">
          <p style={{ fontSize: '0.82rem', color: 'var(--warning)' }}>
            Task received. Activation has not started yet — this task has been paused by the admin team and will resume automatically once reactivated.
          </p>
        </div>
      )}

      {task.status === 'awaiting_activation' && !task.code_confirmed && (
        <div className="task-result-panel">
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            Enter code <strong style={{ fontFamily: 'monospace' }}>{task.task_code}</strong>
            {task.required_amount != null && <> and amount <strong>${Number(task.required_amount).toLocaleString()}</strong></>} in the box above to claim this task before time runs out.
          </p>
        </div>
      )}

      {canSubmitActivity && (
        <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--gray-200)' }}>
          <div className="form-group" style={{ marginBottom: '0.6rem' }}>
            <label className="form-label" style={{ fontSize: '0.78rem' }}>Notes (optional)</label>
            <textarea className="form-control" rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add any notes about this task activity…" />
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleSubmitActivity} disabled={submitting}>
            {submitting ? 'Submitting…' : <><FiSend size={13} /> Submit Task</>}
          </button>
        </div>
      )}

      {['submitted', 'under_review'].includes(task.status) && (
        <div className="task-result-panel">
          <p style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
            Your submission has been received and is being reviewed. Please monitor your dashboard for the outcome.
          </p>
        </div>
      )}

      {showResult && (
        <div className="task-result-panel">
          {task.amount_used != null && <div className="task-result-panel__row"><label>Amount Used</label><span>${Number(task.amount_used).toLocaleString()}</span></div>}
          {task.amount_received != null && <div className="task-result-panel__row"><label>Amount Received</label><span>${Number(task.amount_received).toLocaleString()}</span></div>}
          {task.profit_loss != null && (
            <div className="task-result-panel__row">
              <label>Profit/Loss</label>
              <span className={Number(task.profit_loss) >= 0 ? 'positive' : 'negative'}>
                {Number(task.profit_loss) >= 0 ? '+' : ''}${Number(task.profit_loss).toLocaleString()}
              </span>
            </div>
          )}
          {task.final_result && <div className="task-result-panel__row"><label>Final Result</label><span style={{ textTransform: 'capitalize' }}>{task.final_result}</span></div>}
        </div>
      )}
    </div>
  );
}

export default function InvestorTasks() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ active: 0, pending: 0, completed: 0, expired: 0 });
  const [balance, setBalance] = useState(0);
  const [me, setMe] = useState(null); // { name, account_id, rank } from the backend
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [amount, setAmount] = useState('');
  const [activating, setActivating] = useState(false);

  const fetchAll = () => {
    investorService.getTasks()
      .then(res => {
        setTasks(res.data?.tasks || []);
        setSummary(res.data?.summary || {});
        setBalance(res.data?.balance ?? 0);
        setMe(res.data?.investor ?? null);
      })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  // Live-match whatever code the investor has typed against their own
  // pending tasks, so we can warn them BEFORE they submit if their balance
  // won't cover it — no guessing, no need to hit the server first.
  const matchedTask = tasks.find(t => t.task_code === code.trim().toUpperCase());
  const insufficientForMatch = matchedTask && matchedTask.required_amount != null && !matchedTask.has_sufficient_balance;

  const handleSubmitCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter a task code.');
      return;
    }
    if (insufficientForMatch) {
      toast.error(`Insufficient balance. This task needs at least $${Number(matchedTask.required_amount).toLocaleString()}, your available balance is $${Number(balance).toLocaleString()}.`);
      return;
    }
    setActivating(true);
    try {
      const res = await investorService.submitTaskCode({
        task_code: code.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      toast.success(res.data.message || 'Code accepted!');
      setCode('');
      setAmount('');
      fetchAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid task code.');
    } finally {
      setActivating(false);
    }
  };

  // Every non-terminal assignment is "live" — visible with its code and a
  // countdown from the moment it's created (Guide §3/§8: "Countdown
  // Begins" happens right after the investor is notified, before they've
  // entered anything).
  const liveTasks = tasks.filter(t =>
    ['active', 'in_progress', 'submitted', 'under_review', 'awaiting_activation'].includes(t.status)
  );
  const historyTasks = tasks.filter(t => !liveTasks.includes(t));

  const STATS = [
    { key: 'active',    label: 'Active Tasks',    icon: FiCheckSquare,   accent: 'var(--success)', bg: 'var(--success-bg)' },
    { key: 'pending',   label: 'Pending Tasks',   icon: FiClock,         accent: 'var(--warning)', bg: 'var(--warning-bg)' },
    { key: 'completed', label: 'Completed Tasks', icon: FiCheckCircle,   accent: 'var(--info)',    bg: 'var(--info-bg)'    },
    { key: 'expired',   label: 'Expired Tasks',   icon: FiAlertTriangle, accent: 'var(--danger)',  bg: 'var(--danger-bg)'  },
  ];

  return (
    <div className="inv-page">
      <div className="inv-page__header">
        <div>
          <h1>Task Management</h1>
          <p>Enter task codes assigned to you and track their progress</p>
        </div>
        {me && <NameWithRank name={me.name} rank={me.rank} size="md" showUnranked />}
      </div>

      <div className="task-summary-grid">
        {STATS.map(s => (
          <div key={s.key} className="task-summary-card">
            <div className="task-summary-card__icon" style={{ '--accent': s.accent, '--accent-bg': s.bg }}>
              <s.icon size={18} />
            </div>
            <div>
              <div className="task-summary-card__value">{summary[s.key] ?? 0}</div>
              <div className="task-summary-card__label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* CODE SUBMISSION */}
      <div className="inv-card">
        <h3 className="inv-card__title">Enter Task Code</h3>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginTop: '0.25rem' }}>
          Enter the task code and the required amount shown on your task below. We'll also confirm your balance covers it before activating.
        </p>
        <form className="task-code-form" onSubmit={handleSubmitCode} style={{ marginTop: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Task Code</label>
            <input className="form-control" value={code} onChange={e => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. SSIS6836" />
          </div>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" className="form-control" value={amount} onChange={e => setAmount(e.target.value)}
              placeholder="If required by the task" />
          </div>
          <button className="btn btn-primary" type="submit" disabled={activating || insufficientForMatch}>
            {activating ? 'Checking…' : 'Submit'}
          </button>
        </form>
        {insufficientForMatch && (
          <p style={{ fontSize: '0.8rem', color: 'var(--danger)', marginTop: '0.6rem', fontWeight: 600 }}>
            Insufficient balance for this task — it requires at least ${Number(matchedTask.required_amount).toLocaleString()}, your available balance is ${Number(balance).toLocaleString()}. You won't be able to submit until your balance covers it.
          </p>
        )}
      </div>

      {/* ACTIVE / IN-REVIEW TASKS */}
      {loading ? (
        <div className="inv-loading">Loading tasks…</div>
      ) : liveTasks.length > 0 && (
        <div>
          {liveTasks.map(t => <ActiveTaskCard key={t.id} task={t} onRefresh={fetchAll} />)}
        </div>
      )}

      {/* HISTORY */}
      <div className="inv-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
          <h3 className="inv-card__title" style={{ margin: 0 }}>Task History</h3>
          {me && <NameWithRank name={me.name} rank={me.rank} size="sm" showUnranked />}
        </div>
        {loading ? (
          <div className="inv-loading">Loading…</div>
        ) : historyTasks.length === 0 ? (
          <div className="inv-empty-state">
            <FiCheckSquare size={40} />
            <p>No task history yet</p>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task Code</th><th>Title</th><th>Type</th><th>Required Amount</th><th>Status</th><th>Date</th>
                </tr>
              </thead>
              <tbody>
                {historyTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{t.task_code}</td>
                    <td>{t.title}</td>
                    <td>{t.task_type?.icon} {t.task_type?.label}</td>
                    <td>{t.required_amount != null ? `$${Number(t.required_amount).toLocaleString()}` : '—'}</td>
                    <td><TaskStatusBadge status={t.status} size="sm" /></td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                      {t.completed_at ? new Date(t.completed_at).toLocaleDateString() : new Date(t.activated_at || t.expires_at).toLocaleDateString()}
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
