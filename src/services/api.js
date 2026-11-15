import axios from 'axios';
import { isAccountRestricted, stashAuthNotice } from '../utils/sessionNotice';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ─── AXIOS INSTANCE ───────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: `${API_BASE}/api`,
  headers: {
    'Accept':       'application/json',
    'Content-Type': 'application/json',
  },
});

// ─── REQUEST INTERCEPTOR — attach Bearer token ───────────────────────────────
api.interceptors.request.use(config => {
  const token = localStorage.getItem('auth_token');
  if (token) config.headers['Authorization'] = `Bearer ${token}`;
  return config;
});

// ─── RESPONSE INTERCEPTOR — redirect on 401 ──────────────────────────────────
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('auth_token');
      const onAuth = ['/login', '/register'].some(p => window.location.pathname.startsWith(p));
      if (!onAuth) window.location.href = '/login';
    } else if (isAccountRestricted(err)) {
      // R9: staff account no longer active — the server has already revoked the token. End the session here too and explain why.
      const onAuth = ['/login', '/register'].some(p => window.location.pathname.startsWith(p));
      if (!onAuth) {
        localStorage.removeItem('auth_token');
        stashAuthNotice(err.response?.data?.message);
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── AUTH SERVICE ─────────────────────────────────────────────────────────────
export const authService = {
  login:          (data) => api.post('/login', data),
  logout:         ()     => api.post('/logout'),
  getUser:        ()     => api.get('/user'),

  // Registration stages
  registerStage1: (data) => api.post('/register/stage1', data),
  verifyOtp:      (data) => api.post('/register/verify-otp', data),
  resendOtp:      ()     => api.post('/register/resend-otp'),
  registerStage2: (data) => api.post('/register/stage2', data),
  registerStage3: (data) => api.post('/register/stage3', data),
  registerStage4: (data) => api.post('/register/stage4', data),
  // Task 2 — consent-based registration tracking (public). Server stores nothing without consent=true.
  // Resuming an unfinished registration requires the one-time code emailed to the address on file (no token is issued before that).
  resumeVerify: (data) => api.post('/register/resume/verify', data),
  getTrackingNotice: ()     => api.get('/public/registration-tracking/notice'),
  recordRegistrationVisit: (data) => api.post('/public/registration-tracking/visit', data),

  // Password reset
  forgotPassword: (data) => api.post('/forgot-password', data),
  resetPassword:  (data) => api.post('/reset-password', data),

  // Data Privacy Policy metadata (version, approval flag, whether acknowledgement is mandatory)
  getPrivacyPolicy: () => api.get('/privacy-policy'),
};

// ─── INVESTOR SERVICE ─────────────────────────────────────────────────────────
export const investorService = {
  // Dashboard
  getDashboard: () => api.get('/investor-investment/dashboard'),

  // Profile
  getProfile:    ()     => api.get('/investor-investment/investor/profile'),
  updateProfile: (data) => api.put('/investor-investment/investor/profile', data),
  submitKyc:     (data) => api.post('/investor-investment/investor/profile/kyc', data, {
    headers: { 'Content-Type': undefined },
  }),

  // Investments
  getInvestments:  ()     => api.get('/investor-investment/investor/investments'),
  getPlans:        ()     => api.get('/investor-investment/investor/investments/plans'),
  storeInvestment: (data) => api.post('/investor-investment/investor/investments', data),
  createInvestment: (data) => api.post('/investor-investment/investor/investments', data), // alias used by InvestorPlans.jsx
  showInvestment:  (id)   => api.get(`/investor-investment/investor/investments/${id}`),

  // Deposits
  getDeposits:     ()         => api.get('/investor-investment/investor/deposits'),
  initiateDeposit: (data)     => api.post('/investor-investment/investor/deposits/initiate', data),
  confirmDeposit:  (id, data) => {
    data.append('_method', 'PUT');
    return api.post(`/investor-investment/investor/deposits/${id}/confirm`, data, {
      headers: { 'Content-Type': undefined },
    });
  },
  showDeposit: (id) => api.get(`/investor-investment/investor/deposits/${id}`),
  depositCurrencies: () => api.get('/investor-investment/investor/deposits/currencies'),

  // Withdrawals
  getWithdrawals:         ()     => api.get('/investor-investment/investor/withdrawals'),
  storeWithdrawal:        (data) => api.post('/investor-investment/investor/withdrawals', data),
  getWithdrawalQuote:     (amount) => api.get('/investor-investment/investor/withdrawals/quote', { params: { amount } }),   // Task 5: gross / fee / net disclosure
  getWithdrawalPinStatus: ()     => api.get('/investor-investment/investor/withdrawal-pin/status'),
  setWithdrawalPin:       (data) => api.post('/investor-investment/investor/withdrawal-pin', data),

  // Sectors
  getActiveSectors: () => api.get('/sectors/active'),

  // Messages
  getMessages:  ()     => api.get('/investor-investment/messages'),
  storeMessage: (data) => api.post('/investor-investment/messages', data),
  showMessage:  (id)   => api.get(`/investor-investment/messages/${id}`),
  getMessageUnreadCount: () => api.get('/investor-investment/messages/unread-count'),

  // Emails
  getEmails: ()     => api.get('/investor-investment/emails'),
  showEmail: (id)   => api.get(`/investor-investment/emails/${id}`),

  // Notifications
  getNotifications:     ()   => api.get('/investor-investment/notifications'),
  markNotificationRead: (id) => api.post(`/investor-investment/notifications/${id}/read`),
  deleteNotification:   (id) => api.delete(`/investor-investment/notifications/${id}`),

  // Announcements
  getAnnouncements: () => api.get('/investor-investment/announcements'),
  getAnnouncement:  (slug) => api.get(`/investor-investment/announcements/${slug}`),

  // Referrals
  getReferrals: () => api.get('/investor-investment/investor/referrals'),

  // Tasks
  getTasks:         ()          => api.get('/investor-investment/tasks'),
  showTask:         (id)        => api.get(`/investor-investment/tasks/${id}`),
  submitTaskCode:   (data)      => api.post('/investor-investment/tasks/submit-code', data),
  submitTaskActivity: (id, data) => api.post(`/investor-investment/tasks/${id}/submit`, data),
  getTaskLogs:      (id)        => api.get(`/investor-investment/tasks/${id}/logs`),
};

// ─── ADMIN SERVICE ────────────────────────────────────────────────────────────
export const adminService = {
  // Dashboard & Analytics
  getDashboard: () => api.get('/admin/dashboard'),
  getAnalytics: () => api.get('/admin/analytics'),

  // Email Center
  getEmailDashboard:    ()         => api.get('/admin/email-center/dashboard'),
  searchEmailInvestors: (q)        => api.get('/admin/email-center/investors/search', { params: { q } }),
  sendEmail:            (formData) => api.post('/admin/email-center/send', formData, {
    headers: { 'Content-Type': undefined },
  }),
  sendTestEmail:        (data)     => api.post('/admin/email-center/send-test', data),
  getBulkCount:         (params)   => api.get('/admin/email-center/bulk/count', { params }),
  bulkSendEmail:        (data)     => api.post('/admin/email-center/bulk/send', data),
  getEmailCountries:    ()         => api.get('/admin/email-center/countries'),
  getEmailTemplates:    ()         => api.get('/admin/email-center/templates'),
  createEmailTemplate:  (data)     => api.post('/admin/email-center/templates', data),
  updateEmailTemplate:  (id, data) => api.put(`/admin/email-center/templates/${id}`, data),
  deleteEmailTemplate:  (id)       => api.delete(`/admin/email-center/templates/${id}`),
  getEmailLogs:         (params)   => api.get('/admin/email-center/logs', { params }),
  getEmailLogDetail:    (id)       => api.get(`/admin/email-center/logs/${id}`),

  // Users
  getUsers:      ()         => api.get('/admin/users'),
  showUser:      (id)       => api.get(`/admin/users/${id}`),
  updateUser:    (id, data) => api.put(`/admin/users/${id}`, data),
  suspendUser:   (id)       => api.post(`/admin/users/${id}/suspend`),
  activateUser:  (id)       => api.post(`/admin/users/${id}/activate`),
  adjustBalance: (id, data) => api.post(`/admin/users/${id}/balance`, data),

  // User verification
  getVerificationStatus: (id) => api.get(`/admin/users/${id}/verification-status`),
  resendUserOtp:         (id) => api.post(`/admin/users/${id}/resend-otp`),
  manualVerifyUser:      (id) => api.post(`/admin/users/${id}/manual-verify`),

  // Global profit & balance
  adjustProfit:     (data) => api.post('/admin/global/profit-adjustments', data),
  getProfitHistory: ()     => api.get('/admin/global/profit-adjustments'),
  // R4: reversal is a REQUEST (HTTP 202) — the second admin executes it in the Approvals inbox. `reason` ≥ 10 characters.
  reverseProfit:    (id, data) => api.post(`/admin/global/profit-adjustments/${id}/reverse`, data),
  getProfitItems:   (id)   => api.get(`/admin/global/profit-adjustments/${id}/items`),
  bulkBalance:      (data) => api.post('/admin/global/balance-bulk', data),

  // Investments
  getInvestments:     ()   => api.get('/admin/investments'),
  showInvestment:     (id) => api.get(`/admin/investments/${id}`),
  completeInvestment: (id) => api.post(`/admin/investments/${id}/complete`),

  // Countdown management
  extendCountdown:   (id, data) => api.post(`/admin/investments/${id}/countdown/extend`, data),
  reduceCountdown:   (id, data) => api.post(`/admin/investments/${id}/countdown/reduce`, data),
  setCountdownDate:  (id, data) => api.post(`/admin/investments/${id}/countdown/set-date`, data),
  overrideCountdown: (id, data) => api.post(`/admin/investments/${id}/countdown/override`, data),
  getCountdownLogs:  (id)       => api.get(`/admin/investments/${id}/countdown/logs`),

  // Investment plans — names match AdminInvestmentPlans.jsx calls
  getInvestmentPlans:   ()         => api.get('/admin/investment-plans'),
  getPlans:             ()         => api.get('/admin/investment-plans'), // alias used by AdminGlobalManagement.jsx
  createInvestmentPlan: (data)     => api.post('/admin/investment-plans', data),
  storePlan:            (data)     => api.post('/admin/investment-plans', data), // alias used by AdminPlans.jsx
  updateInvestmentPlan: (id, data) => api.put(`/admin/investment-plans/${id}`, data),
  updatePlan:           (id, data) => api.put(`/admin/investment-plans/${id}`, data), // alias used by AdminPlans.jsx
  deleteInvestmentPlan: (id)       => api.delete(`/admin/investment-plans/${id}`),
  deletePlan:           (id)       => api.delete(`/admin/investment-plans/${id}`), // alias used by AdminPlans.jsx

  // Sectors
  getSectors:       ()         => api.get('/admin/sectors'),
  createSector:     (data)     => api.post('/admin/sectors', data),
  updateSector:     (id, data) => api.put(`/admin/sectors/${id}`, data),
  deleteSector:     (id)       => api.delete(`/admin/sectors/${id}`),
  activateSector:   (id)       => api.post(`/admin/sectors/${id}/activate`),
  deactivateSector: (id)       => api.post(`/admin/sectors/${id}/deactivate`),

  // Sector categories
  createSectorCategory:     (sectorId, data) => api.post(`/admin/sectors/${sectorId}/categories`, data),
  updateSectorCategory:     (id, data)       => api.put(`/admin/sector-categories/${id}`, data),
  deleteSectorCategory:     (id)             => api.delete(`/admin/sector-categories/${id}`),
  activateSectorCategory:   (id)             => api.post(`/admin/sector-categories/${id}/activate`),
  deactivateSectorCategory: (id)             => api.post(`/admin/sector-categories/${id}/deactivate`),

  // Deposits
  getDeposits:    ()         => api.get('/admin/deposits'),
  showDeposit:    (id)       => api.get(`/admin/deposits/${id}`),
  approveDeposit: (id)       => api.post(`/admin/deposits/${id}/approve`),
  rejectDeposit:  (id)       => api.post(`/admin/deposits/${id}/reject`),
  holdDeposit:    (id)       => api.post(`/admin/deposits/${id}/hold`),
  recordDepositPayment: (id, data) => api.post(`/admin/deposits/${id}/payment-details`, data),
  addDepositNote: (id, data) => api.post(`/admin/deposits/${id}/notes`, data),

  // Withdrawals
  getWithdrawals:    ()         => api.get('/admin/withdrawals'),
  showWithdrawal:    (id)       => api.get(`/admin/withdrawals/${id}`),
  approveWithdrawal: (id)       => api.post(`/admin/withdrawals/${id}/approve`),
  rejectWithdrawal:  (id)       => api.post(`/admin/withdrawals/${id}/reject`),
  holdWithdrawal:    (id)       => api.post(`/admin/withdrawals/${id}/hold`),
  addWithdrawalNote: (id, data) => api.post(`/admin/withdrawals/${id}/notes`, data),

  // KYC
  getKycSubmissions: ()         => api.get('/admin/kyc'),
  showKycSubmission: (id)       => api.get(`/admin/kyc/${id}`),
  approveKyc:        (id)       => api.post(`/admin/kyc/${id}/approve`),
  rejectKyc:         (id, data) => api.post(`/admin/kyc/${id}/reject`, data),

  // Messages
  getMessages:           ()               => api.get('/admin/messages'),
  showMessage:           (investorId)     => api.get(`/admin/messages/${investorId}`),
  sendMessageToInvestor: (investorId, data) => api.post(`/admin/messages/${investorId}/send`, data),
  deleteMessage:         (messageId)      => api.delete(`/admin/messages/${messageId}`),

  // Announcements / News Centre
  getAnnouncements:    ()         => api.get('/admin/announcements'),
  showAnnouncement:    (id)       => api.get(`/admin/announcements/${id}`),
  storeAnnouncement:   (data)     => api.post('/admin/announcements', data, data instanceof FormData ? { headers: { 'Content-Type': undefined } } : undefined),
  updateAnnouncement:  (id, data) => {
    if (data instanceof FormData) {
      data.append('_method', 'PUT');
      return api.post(`/admin/announcements/${id}`, data, { headers: { 'Content-Type': undefined } });
    }
    return api.put(`/admin/announcements/${id}`, data);
  },
  deleteAnnouncement:  (id)       => api.delete(`/admin/announcements/${id}`),
  publishAnnouncement: (id)       => api.post(`/admin/announcements/${id}/publish`),
  unpublishAnnouncement: (id)     => api.post(`/admin/announcements/${id}/unpublish`),

  // Tasks
  getTasks:            (params)      => api.get('/admin/tasks', { params }),
  showTask:            (id)          => api.get(`/admin/tasks/${id}`),
  createTask:          (data)        => api.post('/admin/tasks', data),
  updateTask:          (id, data)    => api.put(`/admin/tasks/${id}`, data),
  setTaskAmount:       (id, data)    => api.post(`/admin/tasks/${id}/amount`, data),
  activateTask:        (id)          => api.post(`/admin/tasks/${id}/activate`),
  deactivateTask:      (id)          => api.post(`/admin/tasks/${id}/deactivate`),
  cancelTask:          (id, data)    => api.post(`/admin/tasks/${id}/cancel`, data),
  markTaskFailed:      (id, data)    => api.post(`/admin/tasks/${id}/mark-failed`, data),
  extendTaskWindow:    (id, data)    => api.post(`/admin/tasks/${id}/window/extend`, data),
  reduceTaskWindow:    (id, data)    => api.post(`/admin/tasks/${id}/window/reduce`, data),
  setTaskWindow:       (id, data)    => api.post(`/admin/tasks/${id}/window/set`, data),
  getTaskLogs:         (id)          => api.get(`/admin/tasks/${id}/logs`),
  reviewTask:          (id)          => api.post(`/admin/tasks/${id}/review`),
  verifyTask:          (id, data)    => api.post(`/admin/tasks/${id}/verify`, data),
  completeTask:        (id)          => api.post(`/admin/tasks/${id}/complete`),
  closeTask:           (id)          => api.post(`/admin/tasks/${id}/close`),
  closeTaskForAll:     (id)          => api.post(`/admin/tasks/${id}/close-task`),
  deactivateTaskForAll: (id, data)   => api.post(`/admin/tasks/${id}/deactivate-task`, data),
  resumeTaskForAll:     (id)         => api.post(`/admin/tasks/${id}/resume-task`),

  // Task types
  getTaskTypes:    ()         => api.get('/admin/task-types'),
  createTaskType:  (data)     => api.post('/admin/task-types', data),
  updateTaskType:  (id, data) => api.put(`/admin/task-types/${id}`, data),
  deleteTaskType:  (id)       => api.delete(`/admin/task-types/${id}`),

  // Investors (for task-assignment picker) — reuses existing getUsers
};

// ─── MARKET DATA SERVICE (Phase 3 — public, read-only market info) ──────────
export const marketService = {
  getOverview: ()          => api.get('/market/overview'),
  getAssets:   (params)    => api.get('/market/assets', { params }),
  getAsset:    (id, params) => api.get(`/market/assets/${id}`, { params }),
};

// ─── PUBLIC PLANS (real, live-configured — replaces hardcoded marketing copy) ─
export const publicPlanService = {
  getPlans: () => api.get('/plans'),
};

// ─── PREDICTION / ACTIVITY SERVICE (Phase 4 — points only, no wagering) ─────
export const predictionService = {
  // These routes sit inside the same 'investor-investment' prefixed
  // group as Tasks — matching that convention (see getTasks above),
  // not a bare '/predictions'.
  getRounds: ()              => api.get('/investor-investment/predictions'),
  enter:     (roundId, data) => api.post(`/investor-investment/predictions/${roundId}/enter`, data),
};

export const adminPredictionService = {
  getRounds: (params)     => api.get('/admin/predictions', { params }),
  getRound:  (id)         => api.get(`/admin/predictions/${id}`),
  create:    (data)       => api.post('/admin/predictions', data),
  close:     (id)         => api.patch(`/admin/predictions/${id}/close`),
  cancel:    (id)         => api.patch(`/admin/predictions/${id}/cancel`),
  resolve:   (id, data)   => api.patch(`/admin/predictions/${id}/resolve`, data),
};

// ─── GAMING & PREDICTION — sports fixtures (final spec) ─────────────────────
export const fixtureService = {
  getFixtures: () => api.get('/investor-investment/fixtures'),
  predict:     (marketId, data) => api.post(`/investor-investment/fixtures/markets/${marketId}/predict`, data),
};

export const adminFixtureService = {
  getFixtures:  (params) => api.get('/admin/fixtures', { params }),
  getOverview:  ()       => api.get('/admin/fixtures/overview'),
  getSyncStatus:()       => api.get('/admin/fixtures/sync-status'),
  getPredictions:(fixtureId) => api.get(`/admin/fixtures/${fixtureId}/predictions`), // who picked what on this fixture
  create:       (data)   => api.post('/admin/fixtures', data),
  update:       (fixtureId, data) => api.patch(`/admin/fixtures/${fixtureId}`, data),
  fetchFromApi: ()       => api.post('/admin/fixtures/fetch-api'), // "Sync Now" — import + status/score refresh
  publish:      (fixtureId) => api.patch(`/admin/fixtures/${fixtureId}/publish`),
  unpublish:    (fixtureId) => api.patch(`/admin/fixtures/${fixtureId}/unpublish`),
  bulkPublish:  (ids)       => api.post('/admin/fixtures/bulk-publish', { ids }),
  discard:      (fixtureId) => api.delete(`/admin/fixtures/${fixtureId}`),
  addMarket:    (fixtureId, data) => api.post(`/admin/fixtures/${fixtureId}/markets`, data),
  removeMarket: (fixtureId, marketId) => api.delete(`/admin/fixtures/${fixtureId}/markets/${marketId}`),
  cancel:       (fixtureId) => api.patch(`/admin/fixtures/${fixtureId}/cancel`),
  postpone:     (fixtureId) => api.patch(`/admin/fixtures/${fixtureId}/postpone`),
  reinstate:    (fixtureId) => api.patch(`/admin/fixtures/${fixtureId}/reinstate`),
  resolve:      (fixtureId, data) => api.patch(`/admin/fixtures/${fixtureId}/resolve`, data),
};

// Gaming & Prediction — admin league selection (which competitions
// FootballDataService pulls from). Separate from adminFixtureService
// since it manages the competitions table, not fixtures themselves.
export const adminCompetitionService = {
  getCompetitions: ()                     => api.get('/admin/competitions'),
  toggle:          (competitionId, isEnabled) => api.patch(`/admin/competitions/${competitionId}/toggle`, { is_enabled: isEnabled }),
  syncFromProvider:()                     => api.post('/admin/competitions/sync-provider'),
};

// Financial Team dashboard — deliberately mirrors the subset of
// adminService methods the financial routes actually expose (same
// method NAMES too, so AdminDeposits/AdminWithdrawals work unmodified
// when given this service via their `service` prop instead of the
// default adminService). Anything not listed here (user management,
// countdown manipulation, settings, etc.) has no financial-team route
// at all on the backend — adding a method here wouldn't grant access
// to anything, since FinancialMiddleware only guards /api/financial/*.
export const referralPublicService = {
  visit: (code) => api.post('/referrals/visit', { code }),   // Task 5: public, write-only link-visit beacon
};

export const financialService = {
  getDashboard: () => api.get('/financial/dashboard'),

  // ── Task 5: referral rewards + withdrawal fees ──
  referralSummary:   ()         => api.get('/financial/referrals/summary'),
  referralList:      (params)   => api.get('/financial/referrals', { params }),
  referralShow:      (id)       => api.get(`/financial/referrals/${id}`),
  referralAction:    (id, action, data = {}) => api.post(`/financial/referrals/${id}/${action}`, data),   // evaluate | approve | reject | credit | reverse | flag | unflag
  referralExport:    (params)   => api.get('/financial/referrals-export', { params, responseType: 'blob' }),
  referralPolicy:    ()         => api.get('/financial/referral-policy'),
  saveReferralPolicy:(data)     => api.post('/financial/referral-policy', data),
  feePolicy:         ()         => api.get('/financial/withdrawal-fees/policy'),
  saveFeePolicy:     (data)     => api.post('/financial/withdrawal-fees/policy', data),
  feeSummary:        ()         => api.get('/financial/withdrawal-fees/summary'),
  feeWithdrawals:    (params)   => api.get('/financial/withdrawal-fees/withdrawals', { params }),
  feeEvents:         (id)       => api.get(`/financial/withdrawal-fees/withdrawals/${id}/events`),
  feeAdjust:         (id, data) => api.post(`/financial/withdrawal-fees/withdrawals/${id}/adjust`, data),
  feeReconciliation: ()         => api.get('/financial/withdrawal-fees/reconciliation'),


  getDeposits:    ()         => api.get('/financial/deposits'),
  showDeposit:    (id)       => api.get(`/financial/deposits/${id}`),
  approveDeposit: (id, data) => api.post(`/financial/deposits/${id}/approve`, data),
  rejectDeposit:  (id, data) => api.post(`/financial/deposits/${id}/reject`, data),
  holdDeposit:    (id, data) => api.post(`/financial/deposits/${id}/hold`, data),
  recordDepositPayment: (id, data) => api.post(`/financial/deposits/${id}/payment-details`, data),
  addDepositNote: (id, data) => api.post(`/financial/deposits/${id}/notes`, data),

  getWithdrawals:    ()         => api.get('/financial/withdrawals'),
  showWithdrawal:    (id)       => api.get(`/financial/withdrawals/${id}`),
  approveWithdrawal: (id, data) => api.post(`/financial/withdrawals/${id}/approve`, data),
  rejectWithdrawal:  (id, data) => api.post(`/financial/withdrawals/${id}/reject`, data),
  holdWithdrawal:    (id, data) => api.post(`/financial/withdrawals/${id}/hold`, data),
  addWithdrawalNote: (id, data) => api.post(`/financial/withdrawals/${id}/notes`, data),

  getInvestments: ()   => api.get('/financial/investments'),
  showInvestment: (id) => api.get(`/financial/investments/${id}`),

  // Investors — view + add/deduct balance ONLY (no freeze/unfreeze/reset).
  // Served by FinancialInvestorController, scoped to role=investor and
  // fully audited server-side — distinct from adminService.adjustBalance.
  getInvestors:  ()             => api.get('/financial/investors'),
  showInvestor:  (id)           => api.get(`/financial/investors/${id}`),
  adjustBalance: (id, data)     => api.post(`/financial/investors/${id}/balance`, data),

  // Investment RECORD correction (amount / ROI %). R7: this SUBMITS a correction request (HTTP 202) — it is applied only after a second approver
  // approves it in the Approvals inbox. `authorization_reference` and `reason` are required by the server.
  correctInvestment: (id, data) => api.post(`/financial/investments/${id}/correct`, data),

  // Investor Mailing / Postal Information — read via showInvestor() above
  // (investor.mailing_address); this is the audited correction endpoint.
  correctMailingAddress: (investorId, data) => api.post(`/financial/investors/${investorId}/mailing-address`, data),

  // Unified transactions + audit trail (read-only)
  getTransactions: (params)     => api.get('/financial/transactions', { params }),
  showTransaction: (type, id)   => api.get(`/financial/transactions/${type}/${id}`),
  getAuditLogs:    (params)     => api.get('/financial/audit-logs', { params }),

  // Financial Team mailbox (extends the shared messages table)
  getMessages:        (params)       => api.get('/financial/messages', { params }),
  getMessageUnread:   ()             => api.get('/financial/messages/unread-count'),
  showThread:         (investorId)   => api.get(`/financial/messages/${investorId}`),
  sendMessage:        (investorId, data) => api.post(`/financial/messages/${investorId}/send`, data),
  broadcast:          (data)         => api.post('/financial/messages/broadcast', data),
  getBroadcasts:      (params)       => api.get('/financial/messages/broadcasts', { params }),
  showBroadcast:      (id)           => api.get(`/financial/messages/broadcasts/${id}`),

  // Email Center (Brevo email) — the same UI as the admin Email Center,
  // pointed at the Financial-scoped endpoints (FinancialEmailController).
  // Method names intentionally match adminService so AdminEmailCenter can
  // be reused as-is through its `service` prop.
  getEmailDashboard:    ()         => api.get('/financial/email-center/dashboard'),
  searchEmailInvestors: (q)        => api.get('/financial/email-center/investors/search', { params: { q } }),
  sendEmail:            (formData) => api.post('/financial/email-center/send', formData, {
    headers: { 'Content-Type': undefined },
  }),
  sendTestEmail:        (data)     => api.post('/financial/email-center/send-test', data),
  getBulkCount:         (params)   => api.get('/financial/email-center/bulk/count', { params }),
  bulkSendEmail:        (data)     => api.post('/financial/email-center/bulk/send', data),
  getEmailCountries:    ()         => api.get('/financial/email-center/countries'),
  getInvestmentPlans:   ()         => api.get('/financial/email-center/plans'),
  getEmailTemplates:    ()         => api.get('/financial/email-center/templates'),
  createEmailTemplate:  (data)     => api.post('/financial/email-center/templates', data),
  updateEmailTemplate:  (id, data) => api.put(`/financial/email-center/templates/${id}`, data),
  deleteEmailTemplate:  (id)       => api.delete(`/financial/email-center/templates/${id}`),
  getEmailLogs:         (params)   => api.get('/financial/email-center/logs', { params }),
  getEmailLogDetail:    (id)       => api.get(`/financial/email-center/logs/${id}`),

  // Financial Team Notices in the News & Information Centre
  getNotices:      ()     => api.get('/financial/notices'),
  storeNotice:     (data) => api.post('/financial/notices', data),
  publishNotice:   (id)   => api.post(`/financial/notices/${id}/publish`),
  unpublishNotice: (id, data) => api.post(`/financial/notices/${id}/unpublish`, data),

  getNotifications:     ()   => api.get('/financial/notifications'),
  markNotificationRead: (id) => api.post(`/financial/notifications/${id}/read`),
  deleteNotification:   (id) => api.delete(`/financial/notifications/${id}`),

  getProfile:      ()   => api.get('/financial/profile'),
  changePassword:  (data) => api.post('/financial/profile/password', data),
};

// ── MARVFLOW TEAM DASHBOARD ─────────────────────────────────────────
//
// devRequestService — the Smart System Investment side ("Contact
// Development Team"). Mounted at both /admin/dev-requests* and
// /financial/dev-requests*, same controller/behavior on the backend —
// basePath() picks whichever prefix matches where the page is actually
// rendered, so one component (src/pages/shared/DevRequests.jsx) works
// under both AdminLayout and FinancialLayout without prop-drilling a
// role down to the service layer.
function devRequestBasePath() {
  return window.location.pathname.startsWith('/financial') ? '/financial' : '/admin';
}

export const devRequestService = {
  getRequests: ()               => api.get(`${devRequestBasePath()}/dev-requests`),
  showRequest: (id)             => api.get(`${devRequestBasePath()}/dev-requests/${id}`),
  // `config` is optional (e.g. { onUploadProgress }) so existing callers are unchanged.
  submitRequest: (data, config = {}) => api.post(`${devRequestBasePath()}/dev-requests`, data, {
    headers: { 'Content-Type': undefined }, ...config,
  }),
  reply: (id, data, config = {})     => api.post(`${devRequestBasePath()}/dev-requests/${id}/reply`, data, {
    headers: { 'Content-Type': undefined }, ...config,
  }),
  // Private document download/preview — authenticated (bearer token), returned as a blob.
  attachmentFile: (id, attachmentId, inline = false) => api.get(`${devRequestBasePath()}/dev-requests/${id}/attachments/${attachmentId}`, {
    responseType: 'blob', params: inline ? { inline: 1 } : undefined,
  }),
};

// marvflowInboxService — the SSI side of MarvFlow → SSI messages. Admin and Financial share one page
// (pages/shared/MarvflowInbox.jsx); the prefix is picked from where the page is rendered, exactly like devRequestService.
// The server fixes WHICH inbox from the route and re-checks the user's role on every call.
export const marvflowInboxService = {
  list:        (page, kind) => api.get(`${devRequestBasePath()}/marvflow-messages`, { params: { page, kind: kind || undefined } }),
  show:        (id)   => api.get(`${devRequestBasePath()}/marvflow-messages/${id}`),
  unreadCount: ()     => api.get(`${devRequestBasePath()}/marvflow-messages/unread-count`),
  reply:       (id, data) => api.post(`${devRequestBasePath()}/marvflow-messages/${id}/reply`, data),   // same conversation; recipient is derived by the server
};

// staffMessageService — the shared Admin<->Financial channel. Same
// base-path pattern as devRequestService above (one component, two
// mount points, path-detected prefix) — but unlike dev requests, both
// sides read and post to the exact same conversation, not their own
// separate copy of it.
export const staffMessageService = {
  getMessages: ()     => api.get(`${devRequestBasePath()}/staff-messages`),
  // Accepts the legacy plain string, or { subject?, body_html } for a formatted message (the server sanitises and derives the plain text).
  sendMessage: (data) => api.post(`${devRequestBasePath()}/staff-messages`, typeof data === 'string' ? { body: data } : data),
};

// marvflowService — MarvFlow's own private side.
export const marvflowService = {
  getDashboard: ()      => api.get('/marvflow/dashboard'),

  getRequests: (params) => api.get('/marvflow/requests', { params }),
  showRequest: (id)     => api.get(`/marvflow/requests/${id}`),
  reply: (id, data, config = {}) => api.post(`/marvflow/requests/${id}/reply`, data, {
    headers: { 'Content-Type': undefined }, ...config,
  }),
  attachmentFile: (id, attachmentId, inline = false) => api.get(`/marvflow/requests/${id}/attachments/${attachmentId}`, {
    responseType: 'blob', params: inline ? { inline: 1 } : undefined,
  }),
  // Direct messages to SSI Admin / Financial Team (same backend; see MarvflowMessageController)
  getMessageRecipients: ()     => api.get('/marvflow/messages/recipients'),
  getMessages:          (page, kind) => api.get('/marvflow/messages', { params: { page, kind: kind || undefined } }),
  showMessage:          (id)   => api.get(`/marvflow/messages/${id}`),
  sendMessage:          (data) => api.post('/marvflow/messages', data),
  replyMessage:         (id, data) => api.post(`/marvflow/messages/${id}/reply`, data),   // follow-up inside the member's own conversation
  getUnreadMessageCount: ()    => api.get('/marvflow/messages/unread-count'),
  sendDirectMessage:    (data) => api.post('/marvflow/messages/direct', data),   // "Message Admin" — recipient is fixed server-side
  updateStatus: (id, status)     => api.post(`/marvflow/requests/${id}/status`, { status }),
  updatePriority: (id, priority) => api.post(`/marvflow/requests/${id}/priority`, { priority }),
  assign: (id, assigned_to)      => api.post(`/marvflow/requests/${id}/assign`, { assigned_to }),

  getTeam: () => api.get('/marvflow/team'),

  getNotifications:     ()   => api.get('/marvflow/notifications'),
  markNotificationRead: (id) => api.post(`/marvflow/notifications/${id}/read`),
  deleteNotification:   (id) => api.delete(`/marvflow/notifications/${id}`),

  getProfile:     ()       => api.get('/marvflow/profile'),
  changePassword: (data)   => api.post('/marvflow/profile/password', data),
};

// ─── APPROVALS INBOX (R4) ─────────────────────────────────────────────────────
// Served under /financial/approvals; reachable by Admin and Financial staff (the server decides who may decide each operation).
export const approvalService = {
  list:    (params)        => api.get('/financial/approvals', { params }),
  show:    (id)            => api.get(`/financial/approvals/${id}`),
  approve: (id, note)      => api.post(`/financial/approvals/${id}/approve`, note ? { note } : {}),
  reject:  (id, note)      => api.post(`/financial/approvals/${id}/reject`, { note }),
  retry:   (id, note)      => api.post(`/financial/approvals/${id}/retry`, note ? { note } : {}),
  cancel:  (id, reason)    => api.post(`/financial/approvals/${id}/cancel`, { reason }),
};


// ─── REGISTRATION TEAM (Task 2) ───────────────────────────────────────────────
// Onboarding + KYC review only. None of these endpoints carry financial data.
export const registrationService = {
  getDashboard:     (params)       => api.get('/registration/dashboard', { params }),
  getActivity:      (params)       => api.get('/registration/activity', { params }),
  getTeam:          ()             => api.get('/registration/team'),
  getApplications:  (params)       => api.get('/registration/applications', { params }),
  exportApplications: (params)     => api.get('/registration/applications/export', { params, responseType: 'blob' }),   // lead/admin only (server-enforced)
  getProfile:       ()             => api.get('/registration/profile'),
  changePassword:   (current_password, new_password, new_password_confirmation) => api.post('/registration/profile/password', { current_password, new_password, new_password_confirmation }),
  showApplication:  (id)           => api.get(`/registration/applications/${id}`),
  setStatus:        (id, status, note) => api.post(`/registration/applications/${id}/status`, { status, note: note || undefined }),
  addNote:          (id, note)     => api.post(`/registration/applications/${id}/notes`, { note }),
  requestInfo:      (id, message)  => api.post(`/registration/applications/${id}/request-info`, { message }),
  followUp:         (id, message, subject) => api.post(`/registration/applications/${id}/follow-up`, { message, subject: subject || undefined }),
  assign:           (id, assignee_id) => api.post(`/registration/applications/${id}/assign`, { assignee_id }),
  setFollowUpOptOut:(id, opted_out, note) => api.post(`/registration/applications/${id}/follow-up-opt-out`, { opted_out, note: note || undefined }),
  getNotifications: ()             => api.get('/registration/notifications'),
  markNotificationRead: (id)       => api.post(`/registration/notifications/${id}/read`),
  deleteNotification:   (id)       => api.delete(`/registration/notifications/${id}`),
};
