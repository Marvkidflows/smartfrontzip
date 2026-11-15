import { FiMail } from 'react-icons/fi';

// ─────────────────────────────────────────────────────────────────────────────
// DATA PRIVACY POLICY CONTENT — DRAFT FOR SSI MANAGEMENT / LEGAL REVIEW
//
// Single source of truth, rendered by BOTH the /privacy-policy page and the
// in-registration dialog, so the two can never drift apart.
//
// Every statement is tied to behaviour verified in the backend/frontend code.
// Do NOT add claims about encryption, certifications, retention periods,
// response times or legal bases unless the implementation or an authorised SSI
// policy confirms them. The version shown to users comes from the backend
// (config/privacy.php → GET /api/privacy-policy).
// ─────────────────────────────────────────────────────────────────────────────

// Taken from the existing Contact page. General support address, not a
// dedicated privacy mailbox — SSI Management should confirm or replace it.
export const SUPPORT_EMAIL = 'support@smartsysteminvestmentglobal.com';

// Plain-language summary shown first, and inside the registration panel.
// Short on purpose; the full sections below are the authoritative text.
export const SUMMARY = [
  {
    key: 'collect',
    title: 'What we collect',
    text: 'Your account and contact details, personal and investor-profile details, identity-verification files, and your deposit, withdrawal and investment records.',
    anchor: 'collect',
  },
  {
    key: 'access',
    title: 'Who can see it',
    text: 'Authorised SSI administrators and finance staff, plus the service providers we use for email, image storage and staff notifications.',
    anchor: 'sharing',
  },
  {
    key: 'rights',
    title: 'Your choices',
    text: 'You can ask to access, correct or delete your information by emailing our support team.',
    anchor: 'rights',
  },
];

const COLLECTED = [
  ['Account and contact', 'Full name, email address, phone number and country, a password (stored hashed), and a referral code if you enter one.', 'When you register'],
  ['Personal details', 'Date of birth and residential address.', 'During registration'],
  ['Investor profile', 'Employment status, annual income range, source of funds, investment experience, risk tolerance and (optionally) your investment objectives.', 'During registration'],
  ['Security', 'An optional 4-digit withdrawal PIN (stored hashed).', 'If you set one'],
  ['Identity verification', 'ID type, ID number, a photo of your ID document and a selfie.', 'When you submit verification'],
  ['Account activity', 'Deposits (including any proof-of-payment image), withdrawals, investments, balance, referrals, investor rank status, and messages with SSI staff.', 'As you use the platform'],
  ['Enquiries', 'Anything you type into a contact or support message.', 'When you contact us'],
  ['Technical data', 'The time of your last sign-in and your IP address as seen by our servers (see section 8).', 'Automatically'],
];

export const SECTIONS = [
  {
    id: 'scope',
    title: 'About this policy',
    body: (
      <>
        <p>
          This policy explains how Smart System Investment (“SSI”, “we”, “us”) handles personal
          information when you visit this website, register an account and use the investor platform.
        </p>
        <p>
          Reading and acknowledging this policy is not consent to unrelated purposes, and it is
          separate from any other choice you may be asked to make.
        </p>
      </>
    ),
  },
  {
    id: 'collect',
    title: 'Information we collect',
    body: (
      <>
        <p>Depending on how you use the platform, we collect and store:</p>
        <div className="policy-table" role="table" aria-label="Information we collect">
          <div className="policy-table__head" role="row">
            <span role="columnheader">Category</span>
            <span role="columnheader">What</span>
            <span role="columnheader">When</span>
          </div>
          {COLLECTED.map(([cat, what, when]) => (
            <div className="policy-table__row" role="row" key={cat}>
              <span className="policy-table__cat" role="rowheader">{cat}</span>
              <span className="policy-table__what" role="cell">{what}</span>
              <span className="policy-table__when" role="cell">{when}</span>
            </div>
          ))}
        </div>
      </>
    ),
  },
  {
    id: 'purpose',
    title: 'Why we use your information',
    body: (
      <ul>
        <li>To create and manage your account and verify your email address.</li>
        <li>To sign you in and keep your account secure, including limiting repeated sign-in and registration attempts.</li>
        <li>To verify your identity where verification is requested.</li>
        <li>To provide the service: processing and reviewing deposits, withdrawals and investments, and operating account features such as referrals and investor ranks.</li>
        <li>To respond to your messages and provide customer support, and to send account-related emails such as verification codes and notices.</li>
        <li>To detect and prevent misuse or fraud, and to meet legal, regulatory and recordkeeping obligations.</li>
      </ul>
    ),
  },
  {
    id: 'storage',
    title: 'How information is stored and protected',
    body: (
      <>
        <p>The safeguards we can confirm are in place in the platform are:</p>
        <ul>
          <li>Passwords and withdrawal PINs are stored hashed, not in readable form.</li>
          <li>Email addresses are verified with a one-time code during registration.</li>
          <li>Access to administrative and finance functions is restricted by role and checked on our servers.</li>
          <li>Sign-in, registration and similar requests are rate-limited.</li>
        </ul>
        <p>
          No online system can be guaranteed completely secure, and we cannot promise that information
          will never be accessed, altered, disclosed or lost without authorisation. Please keep your
          password and PIN confidential.
        </p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who can access your information',
    body: (
      <>
        <p>
          <strong>SSI personnel.</strong> Authorised administrators and finance team members can view
          the account, verification and transaction information they need to review accounts, approve
          or reject deposits and withdrawals, and support investors.
        </p>
        <p><strong>Service providers we use to run the platform:</strong></p>
        <ul>
          <li><strong>Brevo</strong> — delivers our emails, so it processes your email address and the content of emails we send you (for example verification codes).</li>
          <li><strong>Cloudinary</strong> — stores images you upload, including identity-verification images (ID document and selfie).</li>
          <li><strong>Telegram</strong> — used for internal notifications to SSI staff. These can include your name and email (new registrations), deposit and withdrawal details, and messages you send to support.</li>
          <li><strong>Our hosting and infrastructure providers</strong> — which necessarily process data to keep the platform running.</li>
          <li><strong>Google Fonts and image hosts</strong> — your browser loads fonts from Google and some images from third-party hosts when you visit the site, so those providers can see your IP address and browser details.</li>
        </ul>
        <p>
          We may also disclose information when required by law, to respond to lawful requests from
          authorities, or to protect the rights, safety and security of SSI, our investors or others.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep information',
    body: (
      <>
        <p>
          We keep information for as long as your account is active and for as long as needed to
          provide the service, maintain security, resolve disputes and meet legal and recordkeeping
          obligations.
        </p>
        <p>
          We have not yet set fixed retention periods, and the platform does not currently include an
          automated process for deletion or anonymisation. Deletion or anonymisation requests are
          therefore handled individually, and some records may have to be kept where we are legally or
          operationally required to keep them.
        </p>
      </>
    ),
  },
  {
    id: 'rights',
    title: 'Your rights and how to make a request',
    body: (
      <>
        <p>
          You can ask us to give you access to the personal information we hold about you, to correct
          information that is inaccurate, or to delete your personal information. You can review and
          update some details yourself from your account profile.
        </p>
        <p>
          To make a privacy request, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>{' '}
          from the email address registered on your account, and tell us what you are asking for.
          We may need to verify your identity first, and we may be unable to delete records we are
          required to keep. The rights available to you depend on the laws that apply to you.
        </p>
      </>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and technical data',
    body: (
      <>
        <p>
          The SSI website does not set advertising or analytics cookies. To keep you signed in, your
          browser stores a sign-in token in its local storage, and it also remembers which
          announcements you have dismissed. You can remove these by signing out or clearing your
          browser’s site data.
        </p>
        <p>
          Our servers receive your IP address with each request and use it, among other things, to
          limit repeated sign-in and registration attempts. Our hosting providers may keep standard
          server logs.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact us',
    body: (
      <p className="policy-contact">
        <FiMail aria-hidden="true" />
        <span>General support: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a></span>
      </p>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy. Each version has a version identifier shown at the top of this
        page. When we make a material change we will update that identifier and, where appropriate,
        tell registered users through the platform or by email, and may ask you to acknowledge the
        updated version.
      </p>
    ),
  },
];

/** Numbered sections, shared by the page and the dialog. */
export function PolicyBody({ headingLevel = 2, idPrefix = '' }) {
  const H = `h${headingLevel}`;
  return SECTIONS.map((s, i) => (
    <article key={s.id} id={`${idPrefix}${s.id}`} className="policy-block" aria-labelledby={`${idPrefix}${s.id}-h`}>
      <H id={`${idPrefix}${s.id}-h`}><span className="policy-block__num">{i + 1}</span>{s.title}</H>
      {s.body}
    </article>
  ));
}

/** "Draft" notice — shown unless the backend says the policy is approved. */
export function DraftNotice({ approved }) {
  if (approved) return null;
  return (
    <div className="policy-draft" role="note">
      <strong>Draft.</strong> This policy has not yet been approved by SSI Management or reviewed by
      qualified legal counsel and may change.
    </div>
  );
}
