import { useState } from 'react';
import toast from 'react-hot-toast';
import RankApprovalsPanel from '../../components/RankApprovalsPanel';
import { rankService, apiError } from '../../services/rankService';
import '../admin/AdminPages.css';
import '../admin/ranks/AdminRanks.css';

// Financial Team: approve / reject calculated rank eligibility and export rank records.
// Configuration, assignment, suspension and revocation are Administrator-only (enforced by the server).
export default function FinancialRankApprovals() {
  const [busy, setBusy] = useState(false);
  const download = async (type) => {
    setBusy(true);
    try { await rankService.exportCsv(type, 'financial'); }
    catch (e) { toast.error(apiError(e, 'Export failed.')); }
    finally { setBusy(false); }
  };
  return (
    <div className="adm-page">
      <div className="adm-page-header">
        <div>
          <h1>Rank approvals</h1>
          <p className="rk-muted">Review the verified financial basis of each calculated rank, then approve or reject it. Ranks never change balances, returns or payments.</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="rk-btn rk-btn--sm" disabled={busy} onClick={() => download('investors')}>Export rank records</button>
          <button type="button" className="rk-btn rk-btn--sm" disabled={busy} onClick={() => download('history')}>Export rank history</button>
        </div>
      </div>
      <RankApprovalsPanel scope="financial" />
    </div>
  );
}
