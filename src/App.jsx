import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';

// Layouts
import PublicLayout   from './layouts/PublicLayout';
import InvestorLayout from './layouts/InvestorLayout';
import AdminLayout    from './layouts/AdminLayout';
import FinancialLayout from './layouts/FinancialLayout';
import MarvflowLayout from './layouts/MarvflowLayout';
import RegistrationLayout from './layouts/RegistrationLayout';

// Public Pages
import HomePage       from './pages/public/HomePage';
import AboutPage      from './pages/public/AboutPage';
import PlansPage      from './pages/public/PlansPage';
import HowItWorksPage from './pages/public/HowItWorksPage';
import FaqPage        from './pages/public/FaqPage';
import ContactPage    from './pages/public/ContactPage';
import PrivacyPolicyPage from './pages/public/PrivacyPolicyPage';
import LoginPage      from './pages/public/LoginPage';
import RegisterPage   from './pages/public/RegisterPage';
import ForgotPasswordPage from './pages/public/ForgotPassword';
import ResetPasswordPage from './pages/public/ResetPassword';

// Investor Pages
import InvestorDashboard    from './pages/investor/InvestorDashboard';
import InvestorInvestments  from './pages/investor/InvestorInvestments';
import InvestorPlans        from './pages/investor/InvestorPlans';
import InvestorSectors      from './pages/investor/InvestorSectors';
import InvestorDeposits     from './pages/investor/InvestorDeposits';
import InvestorWithdrawals  from './pages/investor/InvestorWithdrawals';
import InvestorMessages     from './pages/investor/InvestorMessages';
import InvestorProfile      from './pages/investor/InvestorProfile';
import InvestorRank         from './pages/investor/InvestorRank';
import InvestorNotifications from './pages/investor/InvestorNotifications';
import InvestorReferrals    from './pages/investor/InvestorReferrals';
import FinancialReferrals from './pages/financial/FinancialReferrals';
import FinancialWithdrawalFees from './pages/financial/FinancialWithdrawalFees';
import InvestorAnnouncements from './pages/investor/InvestorAnnouncements';
import InvestorTasks        from './pages/investor/InvestorTasks';
import InvestorEmails       from './pages/investor/InvestorEmails';
import InvestorMarket       from './pages/investor/InvestorMarket';
import InvestorFixtures     from './pages/investor/InvestorFixtures';

// Admin Pages
import AdminDashboard        from './pages/admin/AdminDashboard';
import AdminUsers            from './pages/admin/AdminUsers';
import AdminUserDetail       from './pages/admin/AdminUserDetail';
import AdminInvestments      from './pages/admin/AdminInvestments';
import AdminDeposits         from './pages/admin/AdminDeposits';
import AdminWithdrawals      from './pages/admin/AdminWithdrawals';
import AdminMessages         from './pages/admin/AdminMessages';
import AdminAnnouncements    from './pages/admin/AdminAnnouncements';
import AdminTasks            from './pages/admin/AdminTasks';
import AdminAnalytics        from './pages/admin/AdminAnalytics';
import AdminPlans            from './pages/admin/AdminPlans';
import AdminSectors          from './pages/admin/AdminSectors';
import AdminGlobalManagement from './pages/admin/AdminGlobalManagement';
import AdminKyc              from './pages/admin/AdminKyc';
import AdminRanks            from './pages/admin/AdminRanks';
import AdminRankInvestor     from './pages/admin/ranks/AdminRankInvestor';
import AdminNotifications    from './pages/admin/AdminNotifications';
import FinancialDashboard    from './pages/financial/FinancialDashboard';
import FinancialInvestors       from './pages/financial/FinancialInvestors';
import FinancialInvestorDetail  from './pages/financial/FinancialInvestorDetail';
import FinancialDeposits     from './pages/financial/FinancialDeposits';
import FinancialWithdrawals  from './pages/financial/FinancialWithdrawals';
import FinancialTransactions from './pages/financial/FinancialTransactions';
import FinancialInvestments  from './pages/financial/FinancialInvestments';
import FinancialNotifications from './pages/financial/FinancialNotifications';
import FinancialProfile      from './pages/financial/FinancialProfile';
import FinancialMessages     from './pages/financial/FinancialMessages';
import FinancialAuditLog     from './pages/financial/FinancialAuditLog';
import FinancialCurrency     from './pages/financial/FinancialCurrency';
import FinancialRankApprovals from './pages/financial/FinancialRankApprovals';
import ApprovalsInbox from './pages/shared/ApprovalsInbox';
import AdminEmailCenter      from './pages/admin/AdminEmailCenter';
import AdminMailing          from './pages/admin/AdminMailing';        // Task 3
import AdminNewsMedia        from './pages/admin/AdminNewsMedia';      // Task 4
import NewsPage              from './pages/public/NewsPage';           // Task 4
import InvestorNewsHub, { UpdatesRedirect } from './pages/investor/InvestorNewsHub';
import RegistrationProfile   from './pages/registration/RegistrationProfile';
import StaffMailing          from './pages/staff/StaffMailing';        // delegated staff (permission-driven)
import StaffNews             from './pages/staff/StaffNews';           // delegated staff (permission-driven)  // Task 4 (integration wrapper: one investor news experience)
import AdminFixtures         from './pages/admin/AdminFixtures';

// Market (public)
import MarketPage            from './pages/public/MarketPage';

// Shared — MarvFlow Team Dashboard, Smart System Investment side
// ("Contact Development Team"), mounted under both /admin and
// /financial (see route groups below).
import DevRequests       from './pages/shared/DevRequests';
import DevRequestDetail  from './pages/shared/DevRequestDetail';
import StaffChannel      from './pages/shared/StaffChannel';
import MarvflowInbox     from './pages/shared/MarvflowInbox';

// MarvFlow Team Dashboard — MarvFlow Technologies' own side. Entirely
// separate from Smart System Investment's admin/financial dashboards.
import MarvflowDashboard     from './pages/marvflow/MarvflowDashboard';
import MarvflowRequests      from './pages/marvflow/MarvflowRequests';
import MarvflowRequestDetail from './pages/marvflow/MarvflowRequestDetail';
import MarvflowTeamMembers   from './pages/marvflow/MarvflowTeamMembers';
import MarvflowNotifications from './pages/marvflow/MarvflowNotifications';
import MarvflowProfile       from './pages/marvflow/MarvflowProfile';
import MarvflowMessages      from './pages/marvflow/MarvflowMessages';

// Registration Team (Task 2) — onboarding and KYC review only; no financial pages.
import RegistrationDashboard         from './pages/registration/RegistrationDashboard';
import RegistrationApplications      from './pages/registration/RegistrationApplications';
import RegistrationApplicationDetail from './pages/registration/RegistrationApplicationDetail';
import RegistrationActivity          from './pages/registration/RegistrationActivity';
import RegistrationNotifications     from './pages/registration/RegistrationNotifications';

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function isAdminUser(user)     { return user?.role === 'admin' || user?.is_admin === true; }
function isFinancialUser(user) { return user?.role === 'financial'; }
function isRegistrationUser(user) { return user?.role === 'registration_member' || user?.role === 'registration_lead'; }

// Registration is a 4-stage flow (see RegisterPage). A Sanctum token
// already exists after Stage 1 (needed so the OTP/stage2-4 requests can
// authenticate), so `isAuthenticated` alone can't tell "fully registered"
// apart from "mid-registration". registration_stage on the user object
// (returned by /user) is what actually tells them apart — admins and
// financial team members never go through this flow (their accounts
// are created directly), so both are always treated as complete.
function isRegistrationComplete(user) {
  return isAdminUser(user) || isFinancialUser(user) || isMarvflowUser(user) || isRegistrationUser(user) || (user?.registration_stage ?? 1) >= 4;
}

function getDashboardPath(user) {
  if (isAdminUser(user)) return '/admin/dashboard';
  if (isFinancialUser(user)) return '/financial/dashboard';
  if (isMarvflowUser(user)) return '/marvflow/dashboard';
  if (isRegistrationUser(user)) return '/registration/dashboard';
  return '/investor/dashboard';
}

// ─── ROUTE GUARDS ─────────────────────────────────────────────────────────────
function GuestRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  // A mid-registration user (Stage 1/OTP done, Stages 2-4 not) still has
  // a valid token, but should stay able to reach /register to resume —
  // sending them to the dashboard instead traps them with an incomplete
  // profile and no way back into the flow.
  if (isAuthenticated && user && isRegistrationComplete(user)) {
    return <Navigate to={getDashboardPath(user)} replace />;
  }
  return children;
}

function InvestorRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (isAdminUser(user)) return <Navigate to="/admin/dashboard" replace />;
  if (isFinancialUser(user)) return <Navigate to="/financial/dashboard" replace />;
  if (isRegistrationUser(user)) return <Navigate to="/registration/dashboard" replace />;
  // Defense in depth: even if something links straight to the dashboard,
  // an incomplete registration is sent back to finish it, not shown a
  // dashboard for KYC/profile data that doesn't exist yet.
  if (!isRegistrationComplete(user)) return <Navigate to="/register" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!isAdminUser(user)) return <Navigate to="/investor/dashboard" replace />;
  return children;
}

// Financial Team dashboard — admins are also allowed through here
// (existing admin access is meant to retain overall platform control),
// but a financial user is only ever let into /financial/*, never
// /admin/* — that boundary is enforced by AdminRoute above checking
// isAdminUser() specifically, which a financial-role user never
// satisfies, and independently by FinancialMiddleware server-side.
function FinancialRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!isFinancialUser(user) && !isAdminUser(user)) return <Navigate to="/investor/dashboard" replace />;
  return children;
}

// MarvFlow Team Dashboard — deliberately DOES NOT follow FinancialRoute's
// pattern of also letting admin through. MarvFlow is Smart System
// Investment's external development team, not part of SSI's own staff
// hierarchy — per the spec this was built to, SSI admins must never
// reach MarvFlow's private dashboard, even though they're SSI's most
// privileged role everywhere else. Backend enforcement is what actually
// matters here (MarvflowMiddleware), but this guard keeps the frontend
// consistent with it rather than momentarily rendering a page the API
// would then 403 on.
function isMarvflowUser(user) { return user?.role === 'marvflow_member' || user?.role === 'marvflow_lead'; }

function MarvflowRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!isMarvflowUser(user)) return <Navigate to="/investor/dashboard" replace />;
  return children;
}

// Registration Team (Task 2) — registration_member / registration_lead, plus Admin (platform oversight, mirroring RegistrationTeamMiddleware).
// Financial and MarvFlow users are sent home. The API enforces this independently; this only avoids rendering pages that would 403.
function RegistrationRoute({ children }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!isRegistrationUser(user) && !isAdminUser(user)) return <Navigate to={getDashboardPath(user)} replace />;
  return children;
}

// ─── FULL-SCREEN LOADING SPLASH ───────────────────────────────────────────────
function AuthLoadingScreen() {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0f172a', gap: '1.25rem', zIndex: 9999,
    }}>
      <img src="/logo-mark.png" alt="Smart System Investment" style={{ width: 64, height: 64, borderRadius: 12 }} />
      <div style={{
        width: 40, height: 40,
        border: '3px solid rgba(255,255,255,0.15)',
        borderTop: '3px solid #f59e0b',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── APP ─────────────────────────────────────────────────────────────────────
export default function App() {
  const { hydrated, initializeAuth } = useAuthStore();

  // On mount, validate the stored token before rendering any routes.
  // This prevents a flash of /login on reload for already-authenticated users.
  useEffect(() => {
    initializeAuth();
  }, []);

  // Block all route rendering until the token check is complete.
  if (!hydrated) {
    return <AuthLoadingScreen />;
  }

  return (
    <Routes>
      {/* ── PUBLIC ── */}
      <Route element={<PublicLayout />}>
        <Route path="/"             element={<HomePage />} />
        <Route path="/about"        element={<AboutPage />} />
        <Route path="/plans"        element={<PlansPage />} />
        <Route path="/how-it-works" element={<HowItWorksPage />} />
        <Route path="/faq"          element={<FaqPage />} />
        <Route path="/contact"      element={<ContactPage />} />
        <Route path="/news"         element={<NewsPage />} />
        <Route path="/news/:slug"   element={<NewsPage />} />
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/market"       element={<MarketPage />} />
      </Route>

      {/* ── AUTH ── */}
      <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
     <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* ── INVESTOR ── */}
      <Route path="/investor" element={<InvestorRoute><InvestorLayout /></InvestorRoute>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<InvestorDashboard />} />
        <Route path="investments"       element={<InvestorInvestments />} />
        <Route path="investments/plans" element={<InvestorPlans />} />
        <Route path="sectors"           element={<InvestorSectors />} />
        <Route path="tasks"             element={<InvestorTasks />} />
        <Route path="market"            element={<InvestorMarket />} />
        <Route path="predictions"       element={<InvestorFixtures />} />
        <Route path="deposits"          element={<InvestorDeposits />} />
        <Route path="withdrawals"       element={<InvestorWithdrawals />} />
        <Route path="messages"          element={<InvestorMessages />} />
        <Route path="emails"            element={<InvestorEmails />} />
        <Route path="profile"           element={<InvestorProfile />} />
        <Route path="rank"              element={<InvestorRank />} />
        <Route path="notifications"     element={<InvestorNotifications />} />
        <Route path="referrals"         element={<InvestorReferrals />} />
        {/* Integration: ONE investor news experience.
            /investor/news[/:slug]  = the Task 4 News & Updates module (InvestorNewsHub; an old announcement slug falls through to the legacy page).
            /investor/announcements[/:slug] = the original announcements-based page, kept so existing links, the dashboard link and legacy items still work.
            /investor/updates[/:slug] = redirected to /investor/news so there is no second feed. */}
        <Route path="announcements"     element={<InvestorAnnouncements />} />
        <Route path="announcements/:slug" element={<InvestorAnnouncements />} />
        <Route path="news"              element={<InvestorNewsHub />} />
        <Route path="news/:slug"        element={<InvestorNewsHub />} />
        <Route path="updates"           element={<Navigate to="/investor/news" replace />} />
        <Route path="updates/:slug"     element={<UpdatesRedirect />} />
      </Route>

      {/* ── ADMIN ── */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<AdminDashboard />} />
        <Route path="users"         element={<AdminUsers />} />
        <Route path="users/:id"     element={<AdminUserDetail />} />
        <Route path="investments"   element={<AdminInvestments />} />
        <Route path="tasks"         element={<AdminTasks />} />
        <Route path="predictions"   element={<AdminFixtures />} />
        <Route path="deposits"      element={<AdminDeposits />} />
        <Route path="withdrawals"   element={<AdminWithdrawals />} />
        <Route path="messages"      element={<AdminMessages />} />
        <Route path="email-center"  element={<AdminEmailCenter />} />
        <Route path="mailing/public"   element={<AdminMailing environment="public" />} />
        <Route path="mailing/investor" element={<AdminMailing environment="investor" />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="news-media"    element={<AdminNewsMedia />} />
        <Route path="plans"         element={<AdminPlans />} />
        <Route path="sectors"       element={<AdminSectors />} />
        <Route path="global"        element={<AdminGlobalManagement />} />
        <Route path="approvals"     element={<ApprovalsInbox />} />
        <Route path="kyc"           element={<AdminKyc />} />
        {/* Investor Rank & Badge module — the specific investor route must precede :tab */}
        <Route path="ranks"                 element={<Navigate to="/admin/ranks/investors" replace />} />
        <Route path="ranks/investors/:id"   element={<AdminRankInvestor />} />
        <Route path="ranks/:tab"            element={<AdminRanks />} />
        <Route path="notifications"         element={<AdminNotifications />} />
        <Route path="dev-requests"      element={<DevRequests />} />
        <Route path="dev-requests/:id"  element={<DevRequestDetail />} />
        <Route path="staff-messages"    element={<StaffChannel />} />
        <Route path="marvflow-messages" element={<MarvflowInbox />} />
         <Route path="analytics"     element={<AdminAnalytics />} />
      </Route>

      {/* ── FINANCIAL TEAM ── */}
      <Route path="/financial" element={<FinancialRoute><FinancialLayout /></FinancialRoute>}>
        <Route index               element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<FinancialDashboard />} />
        <Route path="mailing"       element={<StaffMailing />} />
        <Route path="news"          element={<StaffNews />} />
        <Route path="investors"    element={<FinancialInvestors />} />
        <Route path="investors/:id" element={<FinancialInvestorDetail />} />
        <Route path="deposits"     element={<FinancialDeposits />} />
        <Route path="withdrawals"  element={<FinancialWithdrawals />} />
        <Route path="transactions" element={<FinancialTransactions />} />
        <Route path="investments"  element={<FinancialInvestments />} />
        <Route path="messages"      element={<FinancialMessages />} />
        <Route path="audit-log"     element={<FinancialAuditLog />} />
        <Route path="currency"      element={<FinancialCurrency />} />
        <Route path="rank-approvals" element={<FinancialRankApprovals />} />
        <Route path="referrals" element={<FinancialReferrals />} />
        <Route path="withdrawal-fees" element={<FinancialWithdrawalFees />} />
        <Route path="approvals"      element={<ApprovalsInbox />} />
        <Route path="notifications" element={<FinancialNotifications />} />
        <Route path="profile"      element={<FinancialProfile />} />
        <Route path="dev-requests"      element={<DevRequests />} />
        <Route path="dev-requests/:id"  element={<DevRequestDetail />} />
        <Route path="staff-messages"    element={<StaffChannel />} />
        <Route path="marvflow-messages" element={<MarvflowInbox />} />
      </Route>

      {/* ── MARVFLOW TEAM DASHBOARD ──
           MarvFlow Technologies' own private dashboard — entirely
           separate from Smart System Investment's admin/financial
           areas above. Guarded by MarvflowRoute, which (unlike
           FinancialRoute) never admits an admin — see that guard's
           comment for why. */}
      <Route path="/marvflow" element={<MarvflowRoute><MarvflowLayout /></MarvflowRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<MarvflowDashboard />} />
        <Route path="mailing"       element={<StaffMailing />} />
        <Route path="news"          element={<StaffNews />} />
        <Route path="requests"      element={<MarvflowRequests title="Requests" />} />
        <Route path="urgent"        element={<MarvflowRequests title="Urgent Requests" forcedFilter={{ priority: 'urgent' }} />} />
        <Route path="my-requests"   element={<MarvflowRequests title="My Assigned Requests" forcedFilter={{ assigned_to: 'me' }} />} />
        <Route path="requests/:id"  element={<MarvflowRequestDetail />} />
        <Route path="messages"      element={<MarvflowMessages />} />
        <Route path="message-admin" element={<MarvflowMessages initialTab="direct" />} />
        <Route path="team"          element={<MarvflowTeamMembers />} />
        <Route path="notifications" element={<MarvflowNotifications />} />
        <Route path="profile"       element={<MarvflowProfile />} />
      </Route>

      {/* ── REGISTRATION TEAM DASHBOARD (Task 2) ── */}
      <Route path="/registration" element={<RegistrationRoute><RegistrationLayout /></RegistrationRoute>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<RegistrationDashboard />} />
        <Route path="mailing"       element={<StaffMailing />} />
        <Route path="news"          element={<StaffNews />} />
        <Route path="applications"      element={<RegistrationApplications />} />
        <Route path="applications/:id"  element={<RegistrationApplicationDetail />} />
        <Route path="activity"          element={<RegistrationActivity />} />
        <Route path="notifications"     element={<RegistrationNotifications />} />
        <Route path="profile"           element={<RegistrationProfile />} />
      </Route>

      {/* ── CATCH-ALL ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}