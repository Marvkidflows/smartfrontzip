import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, Suspense } from 'react';
import useAuthStore from './store/authStore';
import lazyWithRetry from './utils/lazyWithRetry';
import { RouteFallback, ScreenFallback } from './components/RouteFallback';
import ChunkErrorBoundary from './components/ChunkErrorBoundary';

// ─── CODE SPLITTING (performance remediation) ────────────────────────────────
// Only the landing experience is bundled eagerly: the public layout (header/footer) and the home page. Every other page and every
// role layout (Investor / Admin / Financial / MarvFlow / Registration Team) is its own lazily-downloaded chunk, so a visitor on the
// landing, login or registration page no longer downloads the dashboards, charts, rich-text editor, etc.
// The role guards below (InvestorRoute, AdminRoute, ...) are UNCHANGED and still wrap the lazy layouts, so an unauthenticated or
// unauthorised user is redirected before the protected chunk is ever requested.
import PublicLayout from './layouts/PublicLayout';
import HomePage     from './pages/public/HomePage';

const lazyPage = (loader) => lazyWithRetry(loader);

// Layouts
const InvestorLayout     = lazyPage(() => import('./layouts/InvestorLayout'));
const AdminLayout        = lazyPage(() => import('./layouts/AdminLayout'));
const FinancialLayout    = lazyPage(() => import('./layouts/FinancialLayout'));
const MarvflowLayout     = lazyPage(() => import('./layouts/MarvflowLayout'));
const RegistrationLayout = lazyPage(() => import('./layouts/RegistrationLayout'));

// Public pages
const AboutPage          = lazyPage(() => import('./pages/public/AboutPage'));
const PlansPage          = lazyPage(() => import('./pages/public/PlansPage'));
const HowItWorksPage     = lazyPage(() => import('./pages/public/HowItWorksPage'));
const FaqPage            = lazyPage(() => import('./pages/public/FaqPage'));
const ContactPage        = lazyPage(() => import('./pages/public/ContactPage'));
const PrivacyPolicyPage  = lazyPage(() => import('./pages/public/PrivacyPolicyPage'));
const LoginPage          = lazyPage(() => import('./pages/public/LoginPage'));
const RegisterPage       = lazyPage(() => import('./pages/public/RegisterPage'));
const ForgotPasswordPage = lazyPage(() => import('./pages/public/ForgotPassword'));
const ResetPasswordPage  = lazyPage(() => import('./pages/public/ResetPassword'));
const NewsPage           = lazyPage(() => import('./pages/public/NewsPage'));
const MarketPage         = lazyPage(() => import('./pages/public/MarketPage'));

// Investor pages
const InvestorDashboard     = lazyPage(() => import('./pages/investor/InvestorDashboard'));
const InvestorInvestments   = lazyPage(() => import('./pages/investor/InvestorInvestments'));
const InvestorPlans         = lazyPage(() => import('./pages/investor/InvestorPlans'));
const InvestorSectors       = lazyPage(() => import('./pages/investor/InvestorSectors'));
const InvestorDeposits      = lazyPage(() => import('./pages/investor/InvestorDeposits'));
const InvestorWithdrawals   = lazyPage(() => import('./pages/investor/InvestorWithdrawals'));
const InvestorMessages      = lazyPage(() => import('./pages/investor/InvestorMessages'));
const InvestorProfile       = lazyPage(() => import('./pages/investor/InvestorProfile'));
const InvestorRank          = lazyPage(() => import('./pages/investor/InvestorRank'));
const InvestorNotifications = lazyPage(() => import('./pages/investor/InvestorNotifications'));
const InvestorReferrals     = lazyPage(() => import('./pages/investor/InvestorReferrals'));
const InvestorAnnouncements = lazyPage(() => import('./pages/investor/InvestorAnnouncements'));
const InvestorTasks         = lazyPage(() => import('./pages/investor/InvestorTasks'));
const InvestorEmails        = lazyPage(() => import('./pages/investor/InvestorEmails'));
const InvestorMarket        = lazyPage(() => import('./pages/investor/InvestorMarket'));
const InvestorFixtures      = lazyPage(() => import('./pages/investor/InvestorFixtures'));
const InvestorNewsHub       = lazyPage(() => import('./pages/investor/InvestorNewsHub'));
const UpdatesRedirect       = lazyPage(() => import('./pages/investor/InvestorNewsHub').then((m) => ({ default: m.UpdatesRedirect })));

// Admin pages
const AdminDashboard        = lazyPage(() => import('./pages/admin/AdminDashboard'));
const AdminUsers            = lazyPage(() => import('./pages/admin/AdminUsers'));
const AdminUserDetail       = lazyPage(() => import('./pages/admin/AdminUserDetail'));
const AdminInvestments      = lazyPage(() => import('./pages/admin/AdminInvestments'));
const AdminDeposits         = lazyPage(() => import('./pages/admin/AdminDeposits'));
const AdminWithdrawals      = lazyPage(() => import('./pages/admin/AdminWithdrawals'));
const AdminMessages         = lazyPage(() => import('./pages/admin/AdminMessages'));
const AdminAnnouncements    = lazyPage(() => import('./pages/admin/AdminAnnouncements'));
const AdminTasks            = lazyPage(() => import('./pages/admin/AdminTasks'));
const AdminAnalytics        = lazyPage(() => import('./pages/admin/AdminAnalytics'));
const AdminPlans            = lazyPage(() => import('./pages/admin/AdminPlans'));
const AdminSectors          = lazyPage(() => import('./pages/admin/AdminSectors'));
const AdminGlobalManagement = lazyPage(() => import('./pages/admin/AdminGlobalManagement'));
const AdminKyc              = lazyPage(() => import('./pages/admin/AdminKyc'));
const AdminRanks            = lazyPage(() => import('./pages/admin/AdminRanks'));
const AdminRankInvestor     = lazyPage(() => import('./pages/admin/ranks/AdminRankInvestor'));
const AdminNotifications    = lazyPage(() => import('./pages/admin/AdminNotifications'));
const AdminEmailCenter      = lazyPage(() => import('./pages/admin/AdminEmailCenter'));
const AdminMailing          = lazyPage(() => import('./pages/admin/AdminMailing'));
const AdminNewsMedia        = lazyPage(() => import('./pages/admin/AdminNewsMedia'));
const AdminFixtures         = lazyPage(() => import('./pages/admin/AdminFixtures'));

// Financial pages
const FinancialReferrals      = lazyPage(() => import('./pages/financial/FinancialReferrals'));
const FinancialWithdrawalFees = lazyPage(() => import('./pages/financial/FinancialWithdrawalFees'));
const FinancialDashboard      = lazyPage(() => import('./pages/financial/FinancialDashboard'));
const FinancialInvestors      = lazyPage(() => import('./pages/financial/FinancialInvestors'));
const FinancialInvestorDetail = lazyPage(() => import('./pages/financial/FinancialInvestorDetail'));
const FinancialDeposits       = lazyPage(() => import('./pages/financial/FinancialDeposits'));
const FinancialWithdrawals    = lazyPage(() => import('./pages/financial/FinancialWithdrawals'));
const FinancialTransactions   = lazyPage(() => import('./pages/financial/FinancialTransactions'));
const FinancialInvestments    = lazyPage(() => import('./pages/financial/FinancialInvestments'));
const FinancialNotifications  = lazyPage(() => import('./pages/financial/FinancialNotifications'));
const FinancialProfile        = lazyPage(() => import('./pages/financial/FinancialProfile'));
const FinancialMessages       = lazyPage(() => import('./pages/financial/FinancialMessages'));
const FinancialAuditLog       = lazyPage(() => import('./pages/financial/FinancialAuditLog'));
const FinancialCurrency       = lazyPage(() => import('./pages/financial/FinancialCurrency'));
const FinancialRankApprovals  = lazyPage(() => import('./pages/financial/FinancialRankApprovals'));

// Shared / delegated-staff pages
const ApprovalsInbox   = lazyPage(() => import('./pages/shared/ApprovalsInbox'));
const StaffMailing     = lazyPage(() => import('./pages/staff/StaffMailing'));
const StaffNews        = lazyPage(() => import('./pages/staff/StaffNews'));
const DevRequests      = lazyPage(() => import('./pages/shared/DevRequests'));
const DevRequestDetail = lazyPage(() => import('./pages/shared/DevRequestDetail'));
const StaffChannel     = lazyPage(() => import('./pages/shared/StaffChannel'));
const MarvflowInbox    = lazyPage(() => import('./pages/shared/MarvflowInbox'));

// MarvFlow pages
const MarvflowDashboard     = lazyPage(() => import('./pages/marvflow/MarvflowDashboard'));
const MarvflowRequests      = lazyPage(() => import('./pages/marvflow/MarvflowRequests'));
const MarvflowRequestDetail = lazyPage(() => import('./pages/marvflow/MarvflowRequestDetail'));
const MarvflowTeamMembers   = lazyPage(() => import('./pages/marvflow/MarvflowTeamMembers'));
const MarvflowNotifications = lazyPage(() => import('./pages/marvflow/MarvflowNotifications'));
const MarvflowProfile       = lazyPage(() => import('./pages/marvflow/MarvflowProfile'));
const MarvflowMessages      = lazyPage(() => import('./pages/marvflow/MarvflowMessages'));

// Registration Team pages
const RegistrationProfile           = lazyPage(() => import('./pages/registration/RegistrationProfile'));
const RegistrationDashboard         = lazyPage(() => import('./pages/registration/RegistrationDashboard'));
const RegistrationApplications      = lazyPage(() => import('./pages/registration/RegistrationApplications'));
const RegistrationApplicationDetail = lazyPage(() => import('./pages/registration/RegistrationApplicationDetail'));
const RegistrationActivity          = lazyPage(() => import('./pages/registration/RegistrationActivity'));
const RegistrationNotifications     = lazyPage(() => import('./pages/registration/RegistrationNotifications'));

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

// Suspense wrapper for a lazily-loaded element. `screen` = full-screen fallback (layouts / auth pages); default = inline fallback that
// keeps the surrounding layout (sidebar, header) on screen while the page body downloads.
function Lazy({ children, screen = false }) {
  return <Suspense fallback={screen ? <ScreenFallback /> : <RouteFallback />}>{children}</Suspense>;
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
    <ChunkErrorBoundary>
    <Routes>
      {/* ── PUBLIC ── */}
      <Route element={<PublicLayout />}>
        <Route path="/"             element={<HomePage />} />
        <Route path="/about"        element={<Lazy><AboutPage /></Lazy>} />
        <Route path="/plans"        element={<Lazy><PlansPage /></Lazy>} />
        <Route path="/how-it-works" element={<Lazy><HowItWorksPage /></Lazy>} />
        <Route path="/faq"          element={<Lazy><FaqPage /></Lazy>} />
        <Route path="/contact"      element={<Lazy><ContactPage /></Lazy>} />
        <Route path="/news"         element={<Lazy><NewsPage /></Lazy>} />
        <Route path="/news/:slug"   element={<Lazy><NewsPage /></Lazy>} />
        <Route path="/privacy-policy" element={<Lazy><PrivacyPolicyPage /></Lazy>} />
        <Route path="/market"       element={<Lazy><MarketPage /></Lazy>} />
      </Route>

      {/* ── AUTH ── */}
      <Route path="/login"    element={<GuestRoute><Lazy screen><LoginPage /></Lazy></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Lazy screen><RegisterPage /></Lazy></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><Lazy screen><ForgotPasswordPage /></Lazy></GuestRoute>} />
     <Route path="/reset-password" element={<Lazy screen><ResetPasswordPage /></Lazy>} />

      {/* ── INVESTOR ── */}
      <Route path="/investor" element={<InvestorRoute><Lazy screen><InvestorLayout /></Lazy></InvestorRoute>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<Lazy><InvestorDashboard /></Lazy>} />
        <Route path="investments"       element={<Lazy><InvestorInvestments /></Lazy>} />
        <Route path="investments/plans" element={<Lazy><InvestorPlans /></Lazy>} />
        <Route path="sectors"           element={<Lazy><InvestorSectors /></Lazy>} />
        <Route path="tasks"             element={<Lazy><InvestorTasks /></Lazy>} />
        <Route path="market"            element={<Lazy><InvestorMarket /></Lazy>} />
        <Route path="predictions"       element={<Lazy><InvestorFixtures /></Lazy>} />
        <Route path="deposits"          element={<Lazy><InvestorDeposits /></Lazy>} />
        <Route path="withdrawals"       element={<Lazy><InvestorWithdrawals /></Lazy>} />
        <Route path="messages"          element={<Lazy><InvestorMessages /></Lazy>} />
        <Route path="emails"            element={<Lazy><InvestorEmails /></Lazy>} />
        <Route path="profile"           element={<Lazy><InvestorProfile /></Lazy>} />
        <Route path="rank"              element={<Lazy><InvestorRank /></Lazy>} />
        <Route path="notifications"     element={<Lazy><InvestorNotifications /></Lazy>} />
        <Route path="referrals"         element={<Lazy><InvestorReferrals /></Lazy>} />
        {/* Integration: ONE investor news experience.
            /investor/news[/:slug]  = the Task 4 News & Updates module (InvestorNewsHub; an old announcement slug falls through to the legacy page).
            /investor/announcements[/:slug] = the original announcements-based page, kept so existing links, the dashboard link and legacy items still work.
            /investor/updates[/:slug] = redirected to /investor/news so there is no second feed. */}
        <Route path="announcements"     element={<Lazy><InvestorAnnouncements /></Lazy>} />
        <Route path="announcements/:slug" element={<Lazy><InvestorAnnouncements /></Lazy>} />
        <Route path="news"              element={<Lazy><InvestorNewsHub /></Lazy>} />
        <Route path="news/:slug"        element={<Lazy><InvestorNewsHub /></Lazy>} />
        <Route path="updates"           element={<Navigate to="/investor/news" replace />} />
        <Route path="updates/:slug"     element={<Lazy><UpdatesRedirect /></Lazy>} />
      </Route>

      {/* ── ADMIN ── */}
      <Route path="/admin" element={<AdminRoute><Lazy screen><AdminLayout /></Lazy></AdminRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<Lazy><AdminDashboard /></Lazy>} />
        <Route path="users"         element={<Lazy><AdminUsers /></Lazy>} />
        <Route path="users/:id"     element={<Lazy><AdminUserDetail /></Lazy>} />
        <Route path="investments"   element={<Lazy><AdminInvestments /></Lazy>} />
        <Route path="tasks"         element={<Lazy><AdminTasks /></Lazy>} />
        <Route path="predictions"   element={<Lazy><AdminFixtures /></Lazy>} />
        <Route path="deposits"      element={<Lazy><AdminDeposits /></Lazy>} />
        <Route path="withdrawals"   element={<Lazy><AdminWithdrawals /></Lazy>} />
        <Route path="messages"      element={<Lazy><AdminMessages /></Lazy>} />
        <Route path="email-center"  element={<Lazy><AdminEmailCenter /></Lazy>} />
        <Route path="mailing/public"   element={<Lazy><AdminMailing environment="public"/></Lazy>} />
        <Route path="mailing/investor" element={<Lazy><AdminMailing environment="investor"/></Lazy>} />
        <Route path="announcements" element={<Lazy><AdminAnnouncements /></Lazy>} />
        <Route path="news-media"    element={<Lazy><AdminNewsMedia /></Lazy>} />
        <Route path="plans"         element={<Lazy><AdminPlans /></Lazy>} />
        <Route path="sectors"       element={<Lazy><AdminSectors /></Lazy>} />
        <Route path="global"        element={<Lazy><AdminGlobalManagement /></Lazy>} />
        <Route path="approvals"     element={<Lazy><ApprovalsInbox /></Lazy>} />
        <Route path="kyc"           element={<Lazy><AdminKyc /></Lazy>} />
        {/* Investor Rank & Badge module — the specific investor route must precede :tab */}
        <Route path="ranks"                 element={<Navigate to="/admin/ranks/investors" replace />} />
        <Route path="ranks/investors/:id"   element={<Lazy><AdminRankInvestor /></Lazy>} />
        <Route path="ranks/:tab"            element={<Lazy><AdminRanks /></Lazy>} />
        <Route path="notifications"         element={<Lazy><AdminNotifications /></Lazy>} />
        <Route path="dev-requests"      element={<Lazy><DevRequests /></Lazy>} />
        <Route path="dev-requests/:id"  element={<Lazy><DevRequestDetail /></Lazy>} />
        <Route path="staff-messages"    element={<Lazy><StaffChannel /></Lazy>} />
        <Route path="marvflow-messages" element={<Lazy><MarvflowInbox /></Lazy>} />
         <Route path="analytics"     element={<Lazy><AdminAnalytics /></Lazy>} />
      </Route>

      {/* ── FINANCIAL TEAM ── */}
      <Route path="/financial" element={<FinancialRoute><Lazy screen><FinancialLayout /></Lazy></FinancialRoute>}>
        <Route index               element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"    element={<Lazy><FinancialDashboard /></Lazy>} />
        <Route path="mailing"       element={<Lazy><StaffMailing /></Lazy>} />
        <Route path="news"          element={<Lazy><StaffNews /></Lazy>} />
        <Route path="investors"    element={<Lazy><FinancialInvestors /></Lazy>} />
        <Route path="investors/:id" element={<Lazy><FinancialInvestorDetail /></Lazy>} />
        <Route path="deposits"     element={<Lazy><FinancialDeposits /></Lazy>} />
        <Route path="withdrawals"  element={<Lazy><FinancialWithdrawals /></Lazy>} />
        <Route path="transactions" element={<Lazy><FinancialTransactions /></Lazy>} />
        <Route path="investments"  element={<Lazy><FinancialInvestments /></Lazy>} />
        <Route path="messages"      element={<Lazy><FinancialMessages /></Lazy>} />
        <Route path="audit-log"     element={<Lazy><FinancialAuditLog /></Lazy>} />
        <Route path="currency"      element={<Lazy><FinancialCurrency /></Lazy>} />
        <Route path="rank-approvals" element={<Lazy><FinancialRankApprovals /></Lazy>} />
        <Route path="referrals" element={<Lazy><FinancialReferrals /></Lazy>} />
        <Route path="withdrawal-fees" element={<Lazy><FinancialWithdrawalFees /></Lazy>} />
        <Route path="approvals"      element={<Lazy><ApprovalsInbox /></Lazy>} />
        <Route path="notifications" element={<Lazy><FinancialNotifications /></Lazy>} />
        <Route path="profile"      element={<Lazy><FinancialProfile /></Lazy>} />
        <Route path="dev-requests"      element={<Lazy><DevRequests /></Lazy>} />
        <Route path="dev-requests/:id"  element={<Lazy><DevRequestDetail /></Lazy>} />
        <Route path="staff-messages"    element={<Lazy><StaffChannel /></Lazy>} />
        <Route path="marvflow-messages" element={<Lazy><MarvflowInbox /></Lazy>} />
      </Route>

      {/* ── MARVFLOW TEAM DASHBOARD ──
           MarvFlow Technologies' own private dashboard — entirely
           separate from Smart System Investment's admin/financial
           areas above. Guarded by MarvflowRoute, which (unlike
           FinancialRoute) never admits an admin — see that guard's
           comment for why. */}
      <Route path="/marvflow" element={<MarvflowRoute><Lazy screen><MarvflowLayout /></Lazy></MarvflowRoute>}>
        <Route index                element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"     element={<Lazy><MarvflowDashboard /></Lazy>} />
        <Route path="mailing"       element={<Lazy><StaffMailing /></Lazy>} />
        <Route path="news"          element={<Lazy><StaffNews /></Lazy>} />
        <Route path="requests"      element={<Lazy><MarvflowRequests title="Requests"/></Lazy>} />
        <Route path="urgent"        element={<Lazy><MarvflowRequests title="Urgent Requests" forcedFilter={{ priority: 'urgent' }}/></Lazy>} />
        <Route path="my-requests"   element={<Lazy><MarvflowRequests title="My Assigned Requests" forcedFilter={{ assigned_to: 'me' }}/></Lazy>} />
        <Route path="requests/:id"  element={<Lazy><MarvflowRequestDetail /></Lazy>} />
        <Route path="messages"      element={<Lazy><MarvflowMessages /></Lazy>} />
        <Route path="message-admin" element={<Lazy><MarvflowMessages initialTab="direct"/></Lazy>} />
        <Route path="team"          element={<Lazy><MarvflowTeamMembers /></Lazy>} />
        <Route path="notifications" element={<Lazy><MarvflowNotifications /></Lazy>} />
        <Route path="profile"       element={<Lazy><MarvflowProfile /></Lazy>} />
      </Route>

      {/* ── REGISTRATION TEAM DASHBOARD (Task 2) ── */}
      <Route path="/registration" element={<RegistrationRoute><Lazy screen><RegistrationLayout /></Lazy></RegistrationRoute>}>
        <Route index                    element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard"         element={<Lazy><RegistrationDashboard /></Lazy>} />
        <Route path="mailing"       element={<Lazy><StaffMailing /></Lazy>} />
        <Route path="news"          element={<Lazy><StaffNews /></Lazy>} />
        <Route path="applications"      element={<Lazy><RegistrationApplications /></Lazy>} />
        <Route path="applications/:id"  element={<Lazy><RegistrationApplicationDetail /></Lazy>} />
        <Route path="activity"          element={<Lazy><RegistrationActivity /></Lazy>} />
        <Route path="notifications"     element={<Lazy><RegistrationNotifications /></Lazy>} />
        <Route path="profile"           element={<Lazy><RegistrationProfile /></Lazy>} />
      </Route>

      {/* ── CATCH-ALL ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </ChunkErrorBoundary>
  );
}