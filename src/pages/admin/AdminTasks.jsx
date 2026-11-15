// LOCATION: src/pages/admin/AdminTasks.jsx
import { useState, useEffect } from 'react';
import { NameWithRank } from '../../components/RankBadge';
import {
  FiCheckSquare, FiClock, FiCheckCircle, FiAlertTriangle, FiEye, FiSearch,
  FiPlus, FiX, FiSettings, FiSend, FiSlash, FiXCircle, FiEdit2
} from 'react-icons/fi';
import { adminService } from '../../services/api';
import toast from 'react-hot-toast';
import TaskStatusBadge from '../../components/tasks/TaskStatusBadge';
import './AdminPages.css';

function StatCard({ icon: Icon, label, value, gradient }) {
  return (
    <div className="adm-stat-card" style={{ '--gradient': gradient }}>
      <div className="adm-stat-card__icon"><Icon size={22} /></div>
      <div className="adm-stat-card__body">
        <div className="adm-stat-card__label">{label}</div>
        <div className="adm-stat-card__value">{value}</div>
      </div>
    </div>
  );
}

// Purely a visual indicator, per spec — Laravel remains the sole
// authority on whether activation has actually happened (via
// TaskAssignment::syncStart(), checked server-side on every read).
// This just ticks a number down client-side between refreshes so the
// admin isn't staring at a static timestamp; it never activates
// anything itself, and if the modal re-fetches fresher data the
// `seconds` prop simply resets this to match.
function LiveCountdown({ seconds }) {
  const [remaining, setRemaining] = useState(seconds ?? 0);

  useEffect(() => { setRemaining(seconds ?? 0); }, [seconds]);

  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => Math.max(0, r - 1)), 1000);
    return () => clearInterval(t);
  }, [remaining > 0]);

  if (seconds == null) return <span>—</span>;
  if (remaining <= 0) return <span style={{ color: 'var(--success)' }}>Starting now…</span>;

  const h = Math.floor(remaining / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{h > 0 ? `${pad(h)}:` : ''}{pad(m)}:{pad(s)}</span>;
}

// ── CREATE TASK MODAL ───────────────────────────────────────────────────────
function CreateTaskModal({ onClose, onCreated, taskTypes, investors }) {
  const [form, setForm] = useState({
    user_ids: [], task_type_id: '', title: '', description: '', requirements: '',
    required_amount: '', activates_at: '', expires_at: '', task_code: '',
  });
  const [investorSearch, setInvestorSearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const toggleInvestor = (id) => {
    setForm(f => ({
      ...f,
      user_ids: f.user_ids.includes(id) ? f.user_ids.filter(x => x !== id) : [...f.user_ids, id],
    }));
  };

  const filteredInvestors = investors.filter(inv =>
    !investorSearch ||
    inv.name?.toLowerCase().includes(investorSearch.toLowerCase()) ||
    inv.email?.toLowerCase().includes(investorSearch.toLowerCase())
  );

  const allFilteredSelected = filteredInvestors.length > 0 && filteredInvestors.every(inv => form.user_ids.includes(inv.id));
  const allInvestorsSelected = investors.length > 0 && investors.every(inv => form.user_ids.includes(inv.id));

  const toggleSelectAllFiltered = () => {
    setForm(f => ({
      ...f,
      user_ids: allFilteredSelected
        ? f.user_ids.filter(id => !filteredInvestors.some(inv => inv.id === id))
        : [...new Set([...f.user_ids, ...filteredInvestors.map(inv => inv.id)])],
    }));
  };

  const toggleAllInvestors = () => {
    setForm(f => ({
      ...f,
      user_ids: allInvestorsSelected ? [] : investors.map(inv => inv.id),
    }));
  };

  const selectedType = taskTypes.find(t => t.id === Number(form.task_type_id));

  const handleSubmit = async () => {
    if (form.user_ids.length === 0) return toast.error('Select at least one investor, or use "All Investors".');
    if (!form.task_code.trim()) return toast.error('Enter a task code — this is the code all selected investors will use.');
    if (!form.task_type_id) return toast.error('Select a task type.');
    if (!form.title.trim()) return toast.error('Enter a task title.');
    if (selectedType?.requires_amount && !form.required_amount) return toast.error('This task type requires an amount.');

    setSubmitting(true);
    try {
      const res = await adminService.createTask({
        ...form,
        task_code: form.task_code.trim(),
        required_amount: form.required_amount ? parseFloat(form.required_amount) : null,
        activates_at: form.activates_at || null,
        expires_at: form.expires_at || null,
      });
      toast.success(res.data.message);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 560, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <h3>Create Task</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div className="form-group">
          <label className="form-label">Task Code <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>— the code every selected investor below will enter</span></label>
          <input className="form-control" style={{ fontFamily: 'monospace', textTransform: 'uppercase' }}
            value={form.task_code} onChange={e => setForm(f => ({ ...f, task_code: e.target.value.toUpperCase() }))}
            placeholder="e.g. SSIS6836" />
        </div>

        <div className="form-group">
          <label className="form-label">Assign to Investor(s)</label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <button type="button" className={`btn btn-sm ${allInvestorsSelected ? 'btn-primary' : 'btn-ghost'}`} onClick={toggleAllInvestors}>
              {allInvestorsSelected ? '✓ All Investors Selected' : 'Select All Investors'}
            </button>
            <span style={{ fontSize: '0.78rem', color: 'var(--gray-400)', alignSelf: 'center' }}>or pick specific investors below</span>
          </div>
          <input className="form-control" placeholder="Search investors…" value={investorSearch}
            onChange={e => setInvestorSearch(e.target.value)} style={{ marginBottom: '0.5rem' }} />
          {investorSearch && filteredInvestors.length > 0 && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={toggleSelectAllFiltered} style={{ marginBottom: '0.4rem' }}>
              {allFilteredSelected ? 'Deselect these results' : `Select all ${filteredInvestors.length} results`}
            </button>
          )}
          <div style={{ maxHeight: 150, overflowY: 'auto', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', padding: '0.4rem' }}>
            {filteredInvestors.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', padding: '0.5rem' }}>No investors found.</p>}
            {filteredInvestors.map(inv => (
              <label key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={form.user_ids.includes(inv.id)} onChange={() => toggleInvestor(inv.id)} />
                {inv.name} <span style={{ color: 'var(--gray-400)' }}>({inv.email})</span>
              </label>
            ))}
          </div>
          {form.user_ids.length > 0 && (
            <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '0.35rem' }}>
              {form.user_ids.length} investor(s) selected — {form.user_ids.length === 1 ? 'only this investor' : 'all of them'} will be able to use this same code.
            </p>
          )}
        </div>

        <div className="form-group">
          <label className="form-label">Task Type</label>
          <select className="form-control" value={form.task_type_id} onChange={e => setForm(f => ({ ...f, task_type_id: e.target.value }))}>
            <option value="">Select a type…</option>
            {taskTypes.filter(t => t.is_active).map(t => (
              <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Title</label>
          <input className="form-control" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Weekly Trading Signal" />
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-control" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
        </div>

        <div className="form-group">
          <label className="form-label">Requirements</label>
          <textarea className="form-control" rows={2} value={form.requirements} onChange={e => setForm(f => ({ ...f, requirements: e.target.value }))} placeholder="What the investor needs to do" />
        </div>

        <div className="form-group">
          <label className="form-label">
            Required Amount
            {selectedType && !selectedType.requires_amount && (
              <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}> (optional for this task type)</span>
            )}
          </label>
          <input type="number" className="form-control" value={form.required_amount} onChange={e => setForm(f => ({ ...f, required_amount: e.target.value }))} placeholder="500" />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Activation Time <span style={{ fontWeight: 400, color: 'var(--gray-400)' }}>(optional — defaults to now)</span></label>
            <input type="datetime-local" className="form-control" value={form.activates_at} onChange={e => setForm(f => ({ ...f, activates_at: e.target.value }))} />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label className="form-label">Expiration Time</label>
            <input type="datetime-local" className="form-control" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
        </div>

        <div className="adm-modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Creating…' : 'Create Task'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── TASK DETAIL MODAL (window mgmt + review/verify/complete/close) ─────────
function TaskDetailModal({ taskId, onClose, onUpdated, taskTypes }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [windowTab, setWindowTab] = useState(null); // extend | reduce | set
  const [minutes, setMinutes] = useState('');
  const [newExpiry, setNewExpiry] = useState('');
  const [reason, setReason] = useState('');
  const [verifyForm, setVerifyForm] = useState({ amount_used: '', amount_received: '', profit_loss: '', final_result: '', result_notes: '' });
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editingAmount, setEditingAmount] = useState(false);
  const [amountOverride, setAmountOverride] = useState('');

  const saveAmountOverride = async (clear = false) => {
    setBusy(true);
    try {
      const res = await adminService.setTaskAmount(taskId, {
        required_amount: clear ? null : (amountOverride === '' ? null : parseFloat(amountOverride)),
      });
      toast.success(res.data.message);
      setEditingAmount(false);
      setAmountOverride('');
      onUpdated();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update amount.');
    } finally {
      setBusy(false);
    }
  };

  const load = () => {
    adminService.showTask(taskId).then(res => setTask(res.data.task)).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [taskId]);

  const startEditing = () => {
    setEditForm({
      title: task.title || '', description: task.description || '', requirements: task.requirements || '',
      required_amount: task.required_amount ?? '', task_type_id: task.task_type?.id || '',
    });
    setEditing(true);
  };

  const saveEdit = async () => {
    setBusy(true);
    try {
      const res = await adminService.updateTask(taskId, {
        ...editForm,
        required_amount: editForm.required_amount === '' ? null : parseFloat(editForm.required_amount),
      });
      toast.success(res.data.message || 'Task updated.');
      setEditing(false);
      onUpdated();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update task.');
    } finally {
      setBusy(false);
    }
  };

  const runAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      const res = await fn();
      toast.success(successMsg || res.data.message);
      onUpdated();
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed.');
    } finally {
      setBusy(false);
    }
  };

  const applyWindowChange = async () => {
    if (windowTab === 'set') {
      if (!newExpiry) return toast.error('Pick an expiry date/time.');
      await runAction(() => adminService.setTaskWindow(taskId, { expires_at: newExpiry, reason }));
      setWindowTab(null); setNewExpiry(''); setReason('');
      return;
    }
    if (!minutes) return toast.error('Enter a number of minutes.');
    const fn = windowTab === 'extend' ? adminService.extendTaskWindow : adminService.reduceTaskWindow;
    await runAction(() => fn(taskId, { minutes: parseInt(minutes), reason }));
    setWindowTab(null); setMinutes(''); setReason('');
  };

  if (loading || !task) {
    return (
      <div className="adm-modal-overlay" onClick={onClose}>
        <div className="adm-modal" onClick={e => e.stopPropagation()}><p>Loading…</p></div>
      </div>
    );
  }

  const canActivate = ['pending', 'awaiting_activation'].includes(task.status);
  // Previously only 'active'/'in_progress' could be deactivated — which
  // excluded exactly the scenario the spec's core test case describes:
  // deactivating a task BEFORE its countdown reaches zero, while it's
  // still 'pending'/'awaiting_activation'. Any non-terminal, non-already-
  // deactivated status is a valid candidate now.
  const canDeactivateTask = !task.is_deactivated
    && !['completed', 'expired', 'cancelled', 'failed', 'closed'].includes(task.status);
  const canResumeTask = task.is_deactivated;
  const canCancel = !['completed', 'expired', 'cancelled', 'failed'].includes(task.status);
  const canReview = task.status === 'submitted';
  const canVerify = ['submitted', 'under_review'].includes(task.status);
  const canComplete = ['submitted', 'under_review'].includes(task.status);
  const canClose = ['completed', 'expired', 'cancelled', 'failed'].includes(task.status) && !task.closed_at;
  const canManageWindow = !['completed', 'cancelled'].includes(task.status);

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 620, maxHeight: '88vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ marginBottom: '0.25rem' }}>{task.title}</h3>
            <div style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--gray-400)' }}>{task.task_code}</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><FiX size={16} /></button>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', margin: '0.75rem 0' }}>
          <TaskStatusBadge status={task.status} />
          <span style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}><NameWithRank name={task.investor?.name} rank={task.investor?.rank} /> · {task.investor?.email}</span>
        </div>

        {task.description && <p style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{task.description}</p>}
        {task.requirements && <p style={{ fontSize: '0.82rem', color: 'var(--gray-400)' }}><strong>Requirements:</strong> {task.requirements}</p>}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.82rem', margin: '1rem 0', padding: '0.85rem', background: 'var(--gray-50)', borderRadius: 'var(--radius-md)' }}>
          <div>
            <strong>Required Amount{task.shared_with_count > 1 ? ' (this investor)' : ''}:</strong> {task.required_amount != null ? `$${Number(task.required_amount).toLocaleString()}` : '—'}
            {task.has_amount_override && <span className="badge badge-info" style={{ marginLeft: '0.4rem' }}>custom</span>}
          </div>
          <div><strong>Submitted Amount:</strong> {task.submitted_amount != null ? `$${Number(task.submitted_amount).toLocaleString()}` : '—'}</div>
          <div><strong>Activates:</strong> {task.activates_at ? new Date(task.activates_at).toLocaleString() : '—'}</div>
          <div><strong>Expires:</strong> {task.expires_at ? new Date(task.expires_at).toLocaleString() : '—'}</div>
          {task.is_deactivated ? (
            <div style={{ gridColumn: '1 / -1', color: 'var(--warning)' }}>
              <strong>Deactivated</strong>{task.deactivation_reason ? ` — ${task.deactivation_reason}` : ''}
              {' '}(paused — countdown suspended until resumed)
            </div>
          ) : (task.status === 'pending' || task.status === 'awaiting_activation') && (
            <div style={{ gridColumn: '1 / -1' }}>
              <strong>Countdown:</strong> <LiveCountdown seconds={task.seconds_until_start} />
            </div>
          )}
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          {canActivate && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={startEditing}><FiEdit2 size={13} /> Edit</button>}
          {canActivate && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => { setAmountOverride(task.required_amount ?? ''); setEditingAmount(!editingAmount); }}>💲 Amount for This Investor</button>}
          {canActivate && <button className="btn btn-success btn-sm" disabled={busy} onClick={() => runAction(() => adminService.activateTask(taskId), 'Task activated.')}>Activate</button>}
          {canDeactivateTask && (
            <button className="btn btn-warning-outline btn-sm" disabled={busy} onClick={() => {
              const r = window.prompt('Reason for deactivating this task (optional):');
              if (r === null) return; // cancelled the prompt
              runAction(() => adminService.deactivateTaskForAll(taskId, { reason: r || null }), 'Task deactivated for all assigned investors.');
            }}>
              Deactivate Task
            </button>
          )}
          {canResumeTask && (
            <button className="btn btn-success btn-sm" disabled={busy} onClick={() => runAction(() => adminService.resumeTaskForAll(taskId), 'Task resumed for all assigned investors.')}>
              Resume Task
            </button>
          )}
          {canManageWindow && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setWindowTab(windowTab ? null : 'extend')}><FiSettings size={13} /> Window</button>}
          {canReview && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => runAction(() => adminService.reviewTask(taskId), 'Moved to review.')}><FiEye size={13} /> Start Review</button>}
          {canComplete && <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runAction(() => adminService.completeTask(taskId), null)}><FiCheckCircle size={13} /> Complete</button>}
          {canCancel && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (window.confirm('Cancel this task?')) runAction(() => adminService.cancelTask(taskId, { reason }), 'Task cancelled.'); }}><FiSlash size={13} /> Cancel</button>}
          {canCancel && <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (window.confirm('Mark this task as failed?')) runAction(() => adminService.markTaskFailed(taskId, { reason }), 'Marked as failed.'); }}><FiXCircle size={13} /> Mark Failed</button>}
          {canClose && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => runAction(() => adminService.closeTask(taskId), 'Task closed.')}>Close</button>}
          {task.shared_with_count > 1 && (
            <button className="btn btn-danger btn-sm" disabled={busy} onClick={() => { if (window.confirm(`This code is shared with ${task.shared_with_count} investors. Close it for ALL of them?`)) runAction(() => adminService.closeTaskForAll(taskId), 'Task closed for all investors.'); }}>
              Close for Everyone
            </button>
          )}
        </div>

        {editingAmount && (
          <div style={{ padding: '0.85rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <strong style={{ fontSize: '0.88rem' }}>Custom Amount for This Investor</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.6rem' }}>
              Override the required amount for just {task.investor?.name} — everyone else sharing code {task.task_code} keeps the default amount unless you set their own override too.
            </p>
            <div className="form-group">
              <label className="form-label">Required Amount for {task.investor?.name}</label>
              <input type="number" className="form-control" value={amountOverride} onChange={e => setAmountOverride(e.target.value)} placeholder="e.g. 750" />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => saveAmountOverride(false)}>Save</button>
              {task.has_amount_override && <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => saveAmountOverride(true)}>Revert to Default</button>}
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditingAmount(false)}>Cancel</button>
            </div>
          </div>
        )}

        {editing && editForm && (
          <div style={{ padding: '0.85rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <strong style={{ fontSize: '0.88rem' }}>Edit Task</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.6rem' }}>The task code itself can't be changed once created — everything else can, as long as no assigned investor has activated it yet.</p>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-control" value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Task Type</label>
              <select className="form-control" value={editForm.task_type_id} onChange={e => setEditForm(f => ({ ...f, task_type_id: e.target.value }))}>
                {taskTypes.map(t => <option key={t.id} value={t.id}>{t.icon} {t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-control" rows={2} value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Requirements</label>
              <textarea className="form-control" rows={2} value={editForm.requirements} onChange={e => setEditForm(f => ({ ...f, requirements: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Required Amount</label>
              <input type="number" className="form-control" value={editForm.required_amount} onChange={e => setEditForm(f => ({ ...f, required_amount: e.target.value }))} />
            </div>
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button className="btn btn-primary btn-sm" disabled={busy} onClick={saveEdit}>Save Changes</button>
              <button className="btn btn-ghost btn-sm" disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
            </div>
          </div>
        )}

        {windowTab && (
          <div style={{ padding: '0.85rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
              {['extend', 'reduce', 'set'].map(t => (
                <button key={t} className={`btn btn-sm ${windowTab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setWindowTab(t)}>
                  {t === 'extend' ? 'Extend' : t === 'reduce' ? 'Reduce' : 'Set Date'}
                </button>
              ))}
            </div>
            {windowTab === 'set' ? (
              <div className="form-group">
                <label className="form-label">New Expiry</label>
                <input type="datetime-local" className="form-control" value={newExpiry} onChange={e => setNewExpiry(e.target.value)} />
              </div>
            ) : (
              <div className="form-group">
                <label className="form-label">Minutes</label>
                <input type="number" className="form-control" value={minutes} onChange={e => setMinutes(e.target.value)} placeholder="e.g. 60" />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">Reason (optional)</label>
              <input className="form-control" value={reason} onChange={e => setReason(e.target.value)} />
            </div>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={applyWindowChange}>Apply</button>
          </div>
        )}

        {canVerify && (
          <div style={{ padding: '0.85rem', border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-md)', marginBottom: '1rem' }}>
            <strong style={{ fontSize: '0.88rem' }}>Record Result</strong>
            <p style={{ fontSize: '0.75rem', color: 'var(--gray-400)', marginBottom: '0.6rem' }}>Enter the authorized outcome. Values are recorded as submitted — no automatic calculation.</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              <div className="form-group"><label className="form-label">Amount Used</label><input type="number" className="form-control" value={verifyForm.amount_used} onChange={e => setVerifyForm(f => ({ ...f, amount_used: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Amount Received</label><input type="number" className="form-control" value={verifyForm.amount_received} onChange={e => setVerifyForm(f => ({ ...f, amount_received: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Profit/Loss</label><input type="number" className="form-control" value={verifyForm.profit_loss} onChange={e => setVerifyForm(f => ({ ...f, profit_loss: e.target.value }))} /></div>
              <div className="form-group">
                <label className="form-label">Final Result</label>
                <select className="form-control" value={verifyForm.final_result} onChange={e => setVerifyForm(f => ({ ...f, final_result: e.target.value }))}>
                  <option value="">—</option>
                  <option value="profit">Profit</option>
                  <option value="loss">Loss</option>
                  <option value="break_even">Break Even</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="form-label">Notes</label><textarea className="form-control" rows={2} value={verifyForm.result_notes} onChange={e => setVerifyForm(f => ({ ...f, result_notes: e.target.value }))} /></div>
            <button className="btn btn-primary btn-sm" disabled={busy} onClick={() => runAction(() => adminService.verifyTask(taskId, {
              ...verifyForm,
              amount_used: verifyForm.amount_used ? parseFloat(verifyForm.amount_used) : null,
              amount_received: verifyForm.amount_received ? parseFloat(verifyForm.amount_received) : null,
              profit_loss: verifyForm.profit_loss ? parseFloat(verifyForm.profit_loss) : null,
            }), 'Result recorded.')}>Save Result</button>
          </div>
        )}

        {(task.amount_used != null || task.profit_loss != null) && (
          <div className="task-result-panel">
            {task.amount_used != null && <div className="task-result-panel__row"><label>Amount Used</label><span>${Number(task.amount_used).toLocaleString()}</span></div>}
            {task.amount_received != null && <div className="task-result-panel__row"><label>Amount Received</label><span>${Number(task.amount_received).toLocaleString()}</span></div>}
            {task.profit_loss != null && <div className="task-result-panel__row"><label>Profit/Loss</label><span className={Number(task.profit_loss) >= 0 ? 'positive' : 'negative'}>{Number(task.profit_loss) >= 0 ? '+' : ''}${Number(task.profit_loss).toLocaleString()}</span></div>}
            <div className="task-result-panel__row">
              <label>Balance</label>
              <span className={task.balance_applied_at ? 'positive' : ''}>
                {task.balance_applied_at ? `Applied ${new Date(task.balance_applied_at).toLocaleString()}` : 'Not yet applied — complete the task to apply it'}
              </span>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--gray-200)', paddingTop: '0.85rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>Activity History</strong>
          <div className="task-timeline" style={{ maxHeight: 200, overflowY: 'auto', marginTop: '0.5rem' }}>
            {(task.logs || []).length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)' }}>No activity yet.</p>
            ) : task.logs.map(log => (
              <div className="task-timeline-item" key={log.id}>
                <div className="dot" />
                <div>
                  <strong>{log.action.replace(/_/g, ' ')}</strong> — {log.actor}
                  <small>{new Date(log.created_at).toLocaleString()}</small>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── TASK TYPES MANAGER MODAL ────────────────────────────────────────────────
function TaskTypesModal({ onClose }) {
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ label: '', icon: '', description: '', requires_amount: true });
  const [submitting, setSubmitting] = useState(false);

  const load = () => adminService.getTaskTypes().then(res => setTypes(res.data.task_types || [])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    if (!form.label.trim()) return toast.error('Enter a label.');
    setSubmitting(true);
    try {
      await adminService.createTaskType(form);
      toast.success('Task type created.');
      setForm({ label: '', icon: '', description: '', requires_amount: true });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task type.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (t) => {
    try {
      await adminService.updateTaskType(t.id, { is_active: !t.is_active });
      load();
    } catch {
      toast.error('Failed to update.');
    }
  };

  return (
    <div className="adm-modal-overlay" onClick={onClose}>
      <div className="adm-modal" style={{ maxWidth: 520, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <h3>Manage Task Types</h3>
          <button className="btn btn-ghost btn-sm" onClick={onClose}><FiX size={16} /></button>
        </div>
        <p style={{ fontSize: '0.8rem', color: 'var(--gray-400)', marginBottom: '1rem' }}>
          Add new task/activity types here — no developer or deployment needed.
        </p>

        {loading ? <p>Loading…</p> : (
          <div style={{ marginBottom: '1.25rem' }}>
            {types.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--gray-100)' }}>
                <div>
                  <strong>{t.icon} {t.label}</strong>
                  <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.tasks_count} task(s) · {t.requires_amount ? 'requires amount' : 'no amount needed'}</div>
                </div>
                <button className={`btn btn-sm ${t.is_active ? 'btn-ghost' : 'btn-primary'}`} onClick={() => toggleActive(t)}>
                  {t.is_active ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid var(--gray-200)', paddingTop: '1rem' }}>
          <strong style={{ fontSize: '0.85rem' }}>Add New Type</strong>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
            <input className="form-control" style={{ width: 60 }} placeholder="🎯" value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} />
            <input className="form-control" placeholder="Label, e.g. Market Challenge" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', margin: '0.6rem 0' }}>
            <input type="checkbox" checked={form.requires_amount} onChange={e => setForm(f => ({ ...f, requires_amount: e.target.checked }))} />
            Requires an amount
          </label>
          <button className="btn btn-primary btn-sm" disabled={submitting} onClick={handleAdd}><FiPlus size={13} /> Add Type</button>
        </div>
      </div>
    </div>
  );
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function AdminTasks() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [taskTypes, setTaskTypes] = useState([]);
  const [investors, setInvestors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showTypes, setShowTypes] = useState(false);
  const [detailTaskId, setDetailTaskId] = useState(null);

  const fetchAll = () => {
    setLoading(true);
    adminService.getTasks({ status: statusFilter || undefined, search: search || undefined })
      .then(res => { setTasks(res.data?.tasks || []); setStats(res.data?.stats || {}); })
      .catch(() => toast.error('Failed to load tasks'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, [statusFilter]);
  useEffect(() => {
    adminService.getTaskTypes().then(res => setTaskTypes(res.data.task_types || []));
    adminService.getUsers().then(res => setInvestors(res.data.users || []));
  }, []);

  const filtered = tasks.filter(t =>
    !search ||
    t.task_code.toLowerCase().includes(search.toLowerCase()) ||
    t.investor?.name?.toLowerCase().includes(search.toLowerCase()) ||
    t.investor?.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="adm-dashboard">
      <div className="adm-page-header">
        <div>
          <h1>Task Management</h1>
          <p>Create, assign, and monitor investor tasks</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-ghost" onClick={() => setShowTypes(true)}><FiSettings size={14} /> Task Types</button>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FiPlus size={14} /> Create Task</button>
        </div>
      </div>

      <div className="adm-stats-grid">
        <StatCard icon={FiCheckSquare}   label="Total Tasks"    value={stats.total ?? 0}        gradient="linear-gradient(135deg,#1A3A8F,#0A1628)" />
        <StatCard icon={FiSend}          label="Active"         value={stats.active ?? 0}       gradient="linear-gradient(135deg,#16a34a,#15803d)" />
        <StatCard icon={FiClock}         label="Pending"        value={stats.pending ?? 0}      gradient="linear-gradient(135deg,#f59e0b,#d97706)" />
        <StatCard icon={FiEye}           label="Under Review"   value={stats.under_review ?? 0} gradient="linear-gradient(135deg,#3b82f6,#2563eb)" />
        <StatCard icon={FiCheckCircle}   label="Completed"      value={stats.completed ?? 0}    gradient="linear-gradient(135deg,#16a34a,#166534)" />
        <StatCard icon={FiAlertTriangle} label="Expired"        value={stats.expired ?? 0}      gradient="linear-gradient(135deg,#dc2626,#b91c1c)" />
      </div>

      <div className="card" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="auth-input-wrap" style={{ flex: 1, minWidth: 220 }}>
            <FiSearch className="auth-input-icon" size={15} />
            <input className="form-control auth-input" placeholder="Search by task code, investor name, or email…"
              value={search} onChange={e => setSearch(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchAll()} />
          </div>
          <select className="form-control" style={{ width: 200 }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            {['pending', 'awaiting_activation', 'active', 'in_progress', 'submitted', 'under_review', 'completed', 'expired', 'cancelled', 'failed'].map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={fetchAll}>Filter</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="adm-empty"><p>Loading tasks…</p></div>
        ) : filtered.length === 0 ? (
          <div className="adm-empty"><FiCheckSquare size={28} /><p>No tasks found.</p></div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task Code</th><th>Shared</th><th>Investor</th><th>Type</th><th>Status</th>
                  <th>Countdown</th>
                  <th>Required Amount</th><th>Expires</th><th>Result</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{t.task_code}</td>
                    <td>{t.shared_with_count > 1 ? <span className="badge badge-info">{t.shared_with_count} investors</span> : <span style={{ color: 'var(--gray-300)', fontSize: '0.78rem' }}>—</span>}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}><NameWithRank name={t.investor?.name} rank={t.investor?.rank} /></div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>{t.investor?.email}</div>
                    </td>
                    <td>{t.task_type?.icon} {t.task_type?.label}</td>
                    <td><TaskStatusBadge status={t.status} size="sm" /></td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {t.is_deactivated
                        ? <span style={{ color: 'var(--warning)' }}>Paused</span>
                        : ['pending', 'awaiting_activation'].includes(t.status)
                          ? <LiveCountdown seconds={t.seconds_until_start} />
                          : '—'}
                    </td>
                    <td>{t.required_amount != null ? `$${Number(t.required_amount).toLocaleString()}` : '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>{t.expires_at ? new Date(t.expires_at).toLocaleString() : '—'}</td>
                    <td style={{ fontSize: '0.78rem' }}>
                      {t.status === 'completed' ? <span className="badge badge-success">recorded</span> : '—'}
                    </td>
                    <td>
                      <button className="btn btn-ghost btn-sm" onClick={() => setDetailTaskId(t.id)}>
                        <FiEye size={13} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <CreateTaskModal
          onClose={() => setShowCreate(false)}
          onCreated={fetchAll}
          taskTypes={taskTypes}
          investors={investors}
        />
      )}
      {showTypes && <TaskTypesModal onClose={() => { setShowTypes(false); adminService.getTaskTypes().then(res => setTaskTypes(res.data.task_types || [])); }} />}
      {detailTaskId && (
        <TaskDetailModal taskId={detailTaskId} onClose={() => setDetailTaskId(null)} onUpdated={fetchAll} taskTypes={taskTypes} />
      )}
    </div>
  );
}
