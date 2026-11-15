import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import RankBadge from '../../../components/RankBadge';
import { rankService, apiError, currencyGate } from '../../../services/rankService';
import { CurrencyGateNotice } from '../../../components/CurrencyPolicyPanel';

const emptyValueFor = (def, op) => {
  if (!def) return '';
  if (def.type === 'boolean') return 'true';
  if (def.type === 'enum') return op === 'in' || op === 'not_in' ? [] : def.options[0] ?? '';
  return op === 'between' ? ['', ''] : '';
};

const blankCondition = (schema, group = 1) => {
  const def = schema.fields[0];
  const op = def.operators[0];
  return { group_no: group, field: def.key, operator: op, value: emptyValueFor(def, op) };
};

function fromCriterion(c) {
  return {
    name: c.name, description: c.description || '', logic: c.logic, reason: '',
    conditions: c.conditions.map((x) => ({ group_no: x.group_no, field: x.field, operator: x.operator, value: x.value })),
  };
}

// Admin never types code: every input below is driven by the backend schema.
function ValueInput({ def, operator, value, onChange, invalid, id }) {
  if (!def) return null;
  const cls = `rk-input ${invalid ? 'rk-input--invalid' : ''}`;

  if (def.type === 'boolean') {
    return (
      <select id={id} className={`rk-select ${invalid ? 'rk-input--invalid' : ''}`} value={String(value)} onChange={(e) => onChange(e.target.value)}>
        <option value="true">Yes</option><option value="false">No</option>
      </select>
    );
  }
  if (def.type === 'enum') {
    if (operator === 'in' || operator === 'not_in') {
      const arr = Array.isArray(value) ? value : [];
      return (
        <div className="rk-multi" role="group" aria-label={def.label}>
          {def.options.map((o) => (
            <label key={o} className="rk-check">
              <input type="checkbox" checked={arr.includes(o)}
                onChange={(e) => onChange(e.target.checked ? [...arr, o] : arr.filter((x) => x !== o))} />
              {o.replace('_', ' ')}
            </label>
          ))}
        </div>
      );
    }
    return (
      <select id={id} className={`rk-select ${invalid ? 'rk-input--invalid' : ''}`} value={value} onChange={(e) => onChange(e.target.value)}>
        {def.options.map((o) => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
      </select>
    );
  }
  // number / integer
  const step = def.type === 'integer' ? '1' : '0.01';
  if (operator === 'between') {
    const [lo, hi] = Array.isArray(value) ? value : ['', ''];
    return (
      <div className="rk-between">
        <input aria-label="Minimum" className={cls} type="number" min="0" step={step} value={lo} onChange={(e) => onChange([e.target.value, hi])} />
        <span>–</span>
        <input aria-label="Maximum" className={cls} type="number" min="0" step={step} value={hi} onChange={(e) => onChange([lo, e.target.value])} />
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
      <input id={id} className={cls} type="number" min="0" step={step} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Value" />
      {def.unit && <span className="rk-muted">{def.unit}</span>}
    </div>
  );
}

export default function CriterionEditor({ rank, criterion, schema, onClose, onSaved }) {
  const editing = !!criterion;
  const [form, setForm] = useState(() => (editing ? fromCriterion(criterion) : {
    name: `${rank.name} criteria`, description: '', logic: 'all', reason: '', conditions: [blankCondition(schema)],
  }));
  const [errors, setErrors] = useState({});
  const [check, setCheck] = useState(null);     // result of Validate
  const [preview, setPreview] = useState(null); // result of Preview
  const [busy, setBusy] = useState('');
  const [gate, setGate] = useState(null);

  const fieldDef = (key) => schema.fields.find((f) => f.key === key);
  const grouped = form.logic === 'grouped';

  const patch = (p) => { setForm((f) => ({ ...f, ...p })); setCheck(null); setPreview(null); };
  const setCond = (i, p) => patch({ conditions: form.conditions.map((c, idx) => (idx === i ? { ...c, ...p } : c)) });

  const onFieldChange = (i, key) => {
    const def = fieldDef(key); const op = def.operators[0];
    setCond(i, { field: key, operator: op, value: emptyValueFor(def, op) });
  };
  const onOperatorChange = (i, op) => {
    const c = form.conditions[i];
    setCond(i, { operator: op, value: emptyValueFor(fieldDef(c.field), op) });
  };

  const payload = (extra = {}) => ({
    investor_rank_id: rank.id, name: form.name, description: form.description || null,
    logic: form.logic, reason: form.reason || null,
    conditions: form.conditions.map((c) => ({ ...c, group_no: grouped ? Number(c.group_no) || 1 : 1 })),
    ...(editing ? { criterion_id: criterion.id } : {}),
    ...extra,
  });

  const fail = (err) => {
    setErrors(err?.response?.data?.errors || {});
    setGate(currencyGate(err));
    toast.error(apiError(err, 'Please fix the highlighted problems.'));
  };

  const run = async (label, fn) => {
    setBusy(label); setErrors({}); setGate(null);
    try { return await fn(); } catch (e) { fail(e); return null; } finally { setBusy(''); }
  };

  const doValidate = () => run('validate', async () => {
    const r = await rankService.validateCriterion(payload({ is_active: true }));
    setCheck(r.data);
    setErrors(r.data.errors || {});
  });

  const doPreview = () => run('preview', async () => {
    const r = await rankService.previewCriterion(payload());
    setPreview(r.data);
  });

  const doSave = (activate) => run(activate ? 'activate' : 'save', async () => {
    let res;
    if (editing) {
      res = await rankService.updateCriterion(criterion.id, payload());
      if (activate && !criterion.is_active) res = await rankService.activate(criterion.id, { reason: form.reason || null });
    } else {
      res = await rankService.createCriterion(payload({ is_active: activate }));
    }
    toast.success(res.data.message);
    onSaved(res.data);
  });

  const condErrors = (i) => Object.entries(errors).filter(([k]) => k === `conditions.${i}` || k.startsWith(`conditions.${i}.`)).flatMap(([, v]) => v);
  const generalErrors = ['investor_rank_id', 'name', 'logic', 'conditions', 'reason'].flatMap((k) => errors[k] || []);
  const conflicts = errors.conflicts || check?.conflicts?.map((c) => c.message) || [];
  const warnings = check?.warnings || [];

  const groupNumbers = useMemo(() => [...new Set(form.conditions.map((c) => Number(c.group_no) || 1))].sort(), [form.conditions]);

  return (
    <div className="adm-modal-overlay" onClick={onClose} role="presentation">
      <div className="adm-modal rk-editor" role="dialog" aria-modal="true" aria-label="Rank criteria editor" onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <h3 style={{ margin: 0 }}>{editing ? 'Edit criteria' : 'New criteria'} for <RankBadge rank={rank} size="md" /></h3>
          {editing && <span className="rk-muted">Version {criterion.version} · {criterion.is_active ? 'Active' : 'Inactive'}</span>}
        </div>

        {editing && criterion.is_active && (
          <div className="rk-banner rk-banner--warn">
            This rule is live. Saving changes re-evaluates existing investors in the background; anyone who now qualifies is upgraded automatically.
            Nobody is ever downgraded automatically.
          </div>
        )}

        <label className="rk-label" htmlFor="rk-name">Name</label>
        <input id="rk-name" className={`rk-input ${errors.name ? 'rk-input--invalid' : ''}`} value={form.name} maxLength={120} onChange={(e) => patch({ name: e.target.value })} />

        <label className="rk-label" htmlFor="rk-desc">Description (optional)</label>
        <input id="rk-desc" className="rk-input" value={form.description} maxLength={1000} onChange={(e) => patch({ description: e.target.value })} />

        <div className="rk-label">How must the conditions combine?</div>
        <div className="rk-radio-row">
          {schema.logic.map((l) => (
            <label key={l.key}>
              <input type="radio" name="rk-logic" checked={form.logic === l.key} onChange={() => patch({ logic: l.key })} />
              <span>{l.label}</span>
            </label>
          ))}
        </div>

        <div className="rk-label">Conditions</div>
        {form.conditions.map((c, i) => {
          const def = fieldDef(c.field); const errs = condErrors(i);
          return (
            <div key={i} className={`rk-cond ${grouped ? '' : 'rk-cond--ungrouped'}`}>
              {grouped && (
                <div>
                  <input aria-label={`Group for condition ${i + 1}`} className="rk-input" type="number" min="1" max="10" value={c.group_no}
                    onChange={(e) => setCond(i, { group_no: e.target.value })} title="Conditions in the same group must ALL be met" />
                </div>
              )}
              <select aria-label={`Field for condition ${i + 1}`} className="rk-select" value={c.field} onChange={(e) => onFieldChange(i, e.target.value)}>
                {schema.fields.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
              <select aria-label={`Operator for condition ${i + 1}`} className="rk-select" value={c.operator} onChange={(e) => onOperatorChange(i, e.target.value)}>
                {def.operators.map((o) => <option key={o} value={o}>{schema.operators.find((x) => x.key === o)?.label}</option>)}
              </select>
              <ValueInput def={def} operator={c.operator} value={c.value} invalid={errs.length > 0} onChange={(v) => setCond(i, { value: v })} />
              <button type="button" className="rk-btn rk-btn--sm" aria-label={`Remove condition ${i + 1}`}
                disabled={form.conditions.length === 1} onClick={() => patch({ conditions: form.conditions.filter((_, idx) => idx !== i) })}>✕</button>
              {def?.description && <div className="rk-muted rk-cond__err">{def.description}</div>}
              {errs.map((m, k) => <div key={k} className="rk-error rk-cond__err" role="alert">{m}</div>)}
            </div>
          );
        })}
        <button type="button" className="rk-btn rk-btn--sm" disabled={form.conditions.length >= 20}
          onClick={() => patch({ conditions: [...form.conditions, blankCondition(schema, grouped ? (groupNumbers.at(-1) || 1) : 1)] })}>
          + Add condition
        </button>
        {grouped && <div className="rk-muted" style={{ marginTop: 6 }}>Groups in use: {groupNumbers.join(', ')}. Meeting every condition of any one group qualifies the investor.</div>}

        <label className="rk-label" htmlFor="rk-why">Reason for this change (optional, saved in the history)</label>
        <input id="rk-why" className="rk-input" value={form.reason} maxLength={1000} onChange={(e) => patch({ reason: e.target.value })} />

        {generalErrors.map((m, i) => <div key={i} className="rk-error" role="alert">{m}</div>)}
        {conflicts.length > 0 && (
          <div className="rk-banner rk-banner--bad" role="alert"><strong>Conflict — this cannot be applied:</strong><ul>{conflicts.map((m, i) => <li key={i}>{m}</li>)}</ul></div>
        )}
        <CurrencyGateNotice buttonOnly gate={gate || (check?.conflicts?.some((x) => x.action) ? { blockers: check.conflicts.filter((x) => x.action) } : null)} />
        {warnings.length > 0 && (
          <div className="rk-banner rk-banner--warn"><strong>Heads up:</strong><ul>{warnings.map((m, i) => <li key={i}>{m}</li>)}</ul></div>
        )}
        {check?.valid && (
          <div className="rk-banner rk-banner--info"><strong>Valid.</strong> Rule reads: <em>{check.rule_text}</em></div>
        )}
        {preview && (
          <div className="rk-banner rk-banner--info">
            <strong>{preview.would_qualify}</strong> of {preview.examined.toLocaleString()} investors examined currently meet these conditions
            {preview.truncated && ` (preview limited to the first ${preview.examined.toLocaleString()} of ${preview.in_scope.toLocaleString()} eligible investors)`}.
            {preview.sample.length > 0 && (
              <ul>{preview.sample.map((s) => <li key={s.id}>{s.name} · <span className="rk-mono">{s.account_id}</span> · now {s.current_rank?.name || 'Unranked'}</li>)}</ul>
            )}
            <div className="rk-muted">Only investors below {preview.rank.name} are considered. Nothing has been changed.</div>
          </div>
        )}

        <div className="adm-modal-footer" style={{ flexWrap: 'wrap' }}>
          <button type="button" className="rk-btn" onClick={onClose} disabled={!!busy}>Cancel</button>
          <button type="button" className="rk-btn" onClick={doValidate} disabled={!!busy}>{busy === 'validate' ? 'Checking…' : 'Validate'}</button>
          <button type="button" className="rk-btn" onClick={doPreview} disabled={!!busy}>{busy === 'preview' ? 'Checking…' : 'Preview who qualifies'}</button>
          <button type="button" className="rk-btn" onClick={() => doSave(false)} disabled={!!busy}>{busy === 'save' ? 'Saving…' : editing ? 'Save changes' : 'Save as inactive'}</button>
          {!(editing && criterion.is_active) && (
            <button type="button" className="rk-btn rk-btn--primary" onClick={() => doSave(true)} disabled={!!busy}>
              {busy === 'activate' ? 'Activating…' : 'Save & activate'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
