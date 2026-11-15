import { useEffect, useState } from 'react';
import { rankService } from '../services/rankService';
import './RankBenefitsSection.css';

const usd = (n) => (n == null ? '—' : `$${Number(n).toLocaleString('en-US', { maximumFractionDigits: 2 })}`);

function Table({ caption, head, rows }) {
  return (
    <div className="rb-scroll" role="region" aria-label={caption} tabIndex={0}>
      <table className="rb-table">
        <caption>{caption}</caption>
        <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
        <tbody>{rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

// Investor cycle history and consolidated records. Appears only when management has enabled the matching rank benefit.
export default function RankReportSection() {
  const [r, setR] = useState(null);
  const [state, setState] = useState('loading');
  useEffect(() => {
    let alive = true;
    rankService.myReport().then((x) => { if (alive) { setR(x.data); setState('ready'); } }).catch(() => alive && setState('error'));
    return () => { alive = false; };
  }, []);

  if (state === 'loading') return <div className="skeleton" style={{ height: 80 }} aria-busy="true" />;
  if (state === 'error') return null;

  return (
    <section className="inv-section rb" aria-labelledby="rb-report-title">
      <div className="inv-section__header"><h3 id="rb-report-title">Investment Reports</h3></div>
      {!r.available ? <p className="rb-note">{r.message}</p> : (
        <>
          <div className="card rb-block">
            <div className="rank-crit__stats">
              <div><span>Current eligible principal (verified)</span><strong>{usd(r.summary.current_eligible_principal)}</strong></div>
              <div><span>Historical verified total (reporting only)</span><strong>{usd(r.summary.verified_usd_total)}</strong></div>
              <div><span>Completed cycles counted</span><strong>{r.summary.completed_cycles_counted}</strong></div>
              <div><span>Records not counted</span><strong>{r.summary.not_counted}</strong></div>
            </div>
            <p className="rb-note">{r.summary.note}</p>
          </div>
          {r.cycles && <Table caption="Investment cycle history" head={['#', 'Plan', 'Amount', 'Verified (USD)', 'Start', 'End', 'Status', 'Cycle counted', 'Amount counted']}
            rows={r.cycles.map((c) => [c.id, c.plan, usd(c.amount), usd(c.verified_usd), c.start_date || '—', c.end_date || '—', c.status, c.cycle_counted ? 'Yes' : `No — ${c.not_counted_reason}`, c.amount_counted ? 'Yes' : (c.amount_note || 'No')])} />}
          {r.by_plan && <Table caption="By plan" head={['Plan', 'Records', 'Cycles counted', 'Verified (USD)']} rows={r.by_plan.map((p) => [p.plan, p.records, p.completed_cycles_counted, usd(p.verified_usd)])} />}
          {r.by_year && <Table caption="Consolidated by year" head={['Year', 'Records', 'Cycles counted', 'Verified (USD)']} rows={r.by_year.map((y) => [y.year, y.records, y.completed_cycles_counted, usd(y.verified_usd)])} />}
        </>
      )}
    </section>
  );
}
