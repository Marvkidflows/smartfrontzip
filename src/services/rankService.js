import api from './api';

// Investor Rank & Badge module. All rank data is backend-authoritative; the
// frontend only displays it and submits Admin decisions that the server re-validates.
export const rankService = {
  // Admin: overview / investors
  overview:     ()          => api.get('/admin/ranks'),
  investors:    (params)    => api.get('/admin/ranks/investors', { params }),
  investor:     (id)        => api.get(`/admin/ranks/investors/${id}`),
  assign:       (id, data)  => api.post(`/admin/ranks/investors/${id}/assign`, data),
  downgrade:    (id, data)  => api.post(`/admin/ranks/investors/${id}/downgrade`, data),

  // Admin: downgrade review queue
  reviews:      (params)    => api.get('/admin/ranks/reviews', { params }),
  retainReview: (id, data)  => api.post(`/admin/ranks/reviews/${id}/retain`, data),

  // Admin: audit + alert delivery
  audit:        (params)    => api.get('/admin/ranks/audit', { params }),
  alerts:       (params)    => api.get('/admin/ranks/alerts', { params }),
  retryAlerts:  ()          => api.post('/admin/ranks/alerts/retry'),

  // Admin: criteria
  criteria:         ()          => api.get('/admin/ranks/criteria'),
  criteriaSchema:   ()          => api.get('/admin/ranks/criteria/schema'),
  criteriaHistory:  (params)    => api.get('/admin/ranks/criteria/history', { params }),
  createCriterion:  (data)      => api.post('/admin/ranks/criteria', data),
  updateCriterion:  (id, data)  => api.put(`/admin/ranks/criteria/${id}`, data),
  activate:         (id, data)  => api.post(`/admin/ranks/criteria/${id}/activate`, data),
  deactivate:       (id, data)  => api.post(`/admin/ranks/criteria/${id}/deactivate`, data),
  removeCriterion:  (id, data)  => api.delete(`/admin/ranks/criteria/${id}`, { data }),
  validateCriterion:(data)      => api.post('/admin/ranks/criteria/validate', data),
  previewCriterion: (data)      => api.post('/admin/ranks/criteria/preview', data),

  // Admin: re-evaluation runs
  runs:      ()    => api.get('/admin/ranks/runs'),
  startRun:  ()    => api.post('/admin/ranks/runs'),
  resumeRun: (id)  => api.post(`/admin/ranks/runs/${id}/resume`),

  // Currency / USD verification (Financial team + Admin). Rank thresholds are in USD; amounts carry no currency.
  currencySummary:  ()                => api.get('/financial/currency/summary'),
  currencyRecords:  (params)          => api.get('/financial/currency/records', { params }),
  currencyVerify:   (type, id, data)  => api.post(`/financial/currency/records/${type}/${id}/verify`, data),
  currencyBulkUsd:  (data)            => api.post('/financial/currency/bulk-usd', data),
  currencyBulkVerify: (data)          => api.post('/financial/currency/bulk-verify', data),
  currencySupported: ()               => api.get('/financial/currency/supported'),
  currencyRates:    (currency)        => api.get('/financial/currency/rates', { params: { currency } }),

  // Currency policy — the confirmation that unlocks money-based criteria. Financial Team reviews (step 1);
  // an Administrator confirms (step 2). The server enforces who may do what; the UI only reflects it.
  currencyPolicy:        ()     => api.get('/financial/currency/policy'),
  currencyPolicyHistory: ()     => api.get('/financial/currency/policy/history'),
  currencyPolicyReview:  (data) => api.post('/financial/currency/policy/review', data),
  currencyPolicyConfirm: (data) => api.post('/admin/ranks/currency-policy/confirm', data),
  currencyPolicyRevoke:  (data) => api.post('/admin/ranks/currency-policy/revoke', data),

  // ── Spec-compliance: approval workflow, additional criteria, rank status, export ──
  // `scope` is 'admin' (Admin screens) or 'financial' (Financial Team screens). Both hit the same server controllers;
  // the server re-checks the Gate (ranks.review / ranks.export) on every call — the UI only reflects it.
  approvals:   (params, scope = 'admin')  => api.get(scope === 'financial' ? '/financial/rank-approvals' : '/admin/ranks/approvals', { params }),
  approve:     (id, data, scope = 'admin') => api.post(`${scope === 'financial' ? '/financial/rank-approvals' : '/admin/ranks/approvals'}/${id}/approve`, data),
  rejectReview:(id, data, scope = 'admin') => api.post(`${scope === 'financial' ? '/financial/rank-approvals' : '/admin/ranks/approvals'}/${id}/reject`, data),
  eligibility: (id, scope = 'admin') => api.get(scope === 'financial' ? `/financial/rank-approvals/investors/${id}/eligibility` : `/admin/ranks/investors/${id}/eligibility`),
  suspendRank:   (id, data) => api.post(`/admin/ranks/investors/${id}/suspend`, data),
  revokeRank:    (id, data) => api.post(`/admin/ranks/investors/${id}/revoke`, data),
  reinstateRank: (id, data) => api.post(`/admin/ranks/investors/${id}/reinstate`, data),

  additionalCriteria:   ()             => api.get('/admin/ranks/additional-criteria'),
  additionalThresholds: (key, data)    => api.put(`/admin/ranks/additional-criteria/${key}/thresholds`, data),
  additionalPolicy:     (key, data)    => api.put(`/admin/ranks/additional-criteria/${key}/policy`, data),
  additionalEnable:     (key, data)    => api.post(`/admin/ranks/additional-criteria/${key}/enable`, data),
  additionalDisable:    (key, data)    => api.post(`/admin/ranks/additional-criteria/${key}/disable`, data),
  loadCoreDrafts:       ()             => api.post('/admin/ranks/criteria/load-spec-drafts'),

  // CSV export (authenticated download — a plain link would not carry the bearer token).
  exportCsv: async (type = 'investors', scope = 'admin') => {
    const res = await api.get(scope === 'financial' ? '/financial/rank-export' : '/admin/ranks/export', { params: { type }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `ssi-rank-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },

  // Investor: read-only own rank (used to refresh the badge without re-login)
  myRank: () => api.get('/investor-investment/rank'),
  // Investor: read-only rank criteria for all six ranks (source of truth: backend rank engine)
  myRankCriteria: () => api.get('/investor-investment/rank/criteria'),
  // Investor: benefits of all six ranks (status-labelled), history, consent, loan pathway (own data only)
  myBenefits:     ()       => api.get('/investor-investment/rank/benefits'),
  setConsent:     (granted) => api.put('/investor-investment/rank/consent', { recognition_communications: granted }),
  myReport:       ()       => api.get('/investor-investment/rank/report'),
  planTerms:      (planId) => api.get(`/investor-investment/rank/plan-terms/${planId}`),
  allPlanTerms:   ()       => api.get('/investor-investment/rank/plan-terms'),
  myLoans:        ()       => api.get('/investor-investment/loans'),
  applyLoan:      (data)   => api.post('/investor-investment/loans', data),
  withdrawLoan:   (id)     => api.post(`/investor-investment/loans/${id}/withdraw`),

  // Admin: benefits catalogue, incentive terms, lending programme (server re-checks every Gate)
  benefits:         ()          => api.get('/admin/ranks/benefits'),
  benefitHistory:   (params)    => api.get('/admin/ranks/benefits/history', { params }),
  createBenefit:    (data)      => api.post('/admin/ranks/benefits', data),
  updateBenefit:    (id, data)  => api.put(`/admin/ranks/benefits/${id}`, data),
  setBenefitStatus: (id, data)  => api.post(`/admin/ranks/benefits/${id}/status`, data),
  recordPolicy:     (data)      => api.post('/admin/ranks/principal-policy', data),
  // Financial Team controls (admin and Financial roles; the server enforces every gate)
  positions:        (investorId) => api.get(`/financial/ranks/investors/${investorId}/positions`),
  flagPosition:     (id, data)  => api.post(`/financial/positions/${id}/flag`, data),
  unflagPosition:   (id, data)  => api.post(`/financial/positions/${id}/unflag`, data),
  releasePrincipal: (id, data)  => api.post(`/financial/positions/${id}/release`, data),
  returnPrincipal:  (id, data)  => api.post(`/financial/positions/${id}/return-to-wallet`, data),
  payoutPrincipal:  (id, data)  => api.post(`/financial/positions/${id}/external-payout`, data),
  correctPrincipal: (id, data)  => api.post(`/financial/positions/${id}/correction`, data),
  classifyWithdrawal: (id, data) => api.post(`/financial/withdrawals/${id}/classify`, data),
  reconciliation:   (params)    => api.get('/financial/reconciliation', { params }),
  scanReconciliation: ()        => api.post('/financial/reconciliation/scan'),
  resolveReconciliation: (id, data) => api.post(`/financial/reconciliation/${id}/resolve`, data),
  fxSources:        ()          => api.get('/financial/fx-sources'),
  addFxSource:      (data)      => api.post('/financial/fx-sources', data),
  createIncentive:  (data)      => api.post('/admin/ranks/incentives', data),
  updateIncentive:  (id, data)  => api.put(`/admin/ranks/incentives/${id}`, data),
  incentiveAction:  (id, action, data) => api.post(`/admin/ranks/incentives/${id}/${action}`, data),
  loanSettings:     ()          => api.get('/admin/ranks/loans/settings'),
  saveLoanSettings: (data)      => api.put('/admin/ranks/loans/settings', data),
  loanApplications: (params)    => api.get('/admin/ranks/loans/applications', { params }),
  loanAction:       (id, action, data) => api.post(`/admin/ranks/loans/applications/${id}/${action}`, data),
  exportBenefits: async (type = 'benefits') => {
    const res = await api.get('/admin/ranks/benefits/export', { params: { type }, responseType: 'blob' });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url; a.download = `ssi-rank-${type}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  },
};

export const adminNotificationService = {
  list:   ()    => api.get('/admin/notifications'),
  read:   (id)  => api.post(`/admin/notifications/${id}/read`),
  remove: (id)  => api.delete(`/admin/notifications/${id}`),
};

// The structured "what is missing and where to fix it" block returned when a money criterion cannot be activated.
export function currencyGate(err) {
  return err?.response?.data?.currency_gate || null;
}

// Pull a human-readable message out of a Laravel error response.
export function apiError(err, fallback = 'Something went wrong.') {
  const d = err?.response?.data;
  if (!d) return fallback;
  if (d.errors) {
    const first = Object.values(d.errors).flat()[0];
    if (first) return first;
  }
  return d.message || fallback;
}
