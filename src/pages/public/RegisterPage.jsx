import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiUser, FiMail, FiLock, FiCheck, FiShield, FiAlertCircle, FiMapPin } from 'react-icons/fi';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import SearchableCountrySelect from '../../components/common/SearchableCountrySelect';
import 'react-phone-number-input/style.css';
import { authService, referralPublicService } from '../../services/api';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';
import './AuthPages.css';
import './PrivacyPolicy.css';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import { SUMMARY } from './privacyPolicyContent';
import RegistrationTrackingNotice from '../../components/RegistrationTrackingNotice';
import { getConsentedToken } from '../../utils/registrationTracking';
import { buildStage1Payload, buildResumePayload, needsResumeVerification, isValidCode, resumeCooldownSeconds } from '../../utils/registrationResume';

const STAGES = [
  { n:1, label:'Account'          },
  { n:2, label:'Verify Email'     },
  { n:3, label:'Personal Info'    },
  { n:4, label:'Investor Profile' },
  { n:5, label:'Security'         },
];

const RESEND_COOLDOWN_SECONDS = 60;

function extractErrors(err) {
  const data = err.response?.data;
  if (!data) return `Network error — is the server running?`;
  if (data.message) return data.message;
  if (data.errors) {
    // Return the first validation error message
    const first = Object.values(data.errors)[0];
    return Array.isArray(first) ? first[0] : String(first);
  }
  return `Error ${err.response?.status || ''}`;
}

export default function RegisterPage() {
  const [stage, setStage]           = useState(1);
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [resumeMode, setResumeMode] = useState(false);   // true while proving ownership of an unfinished registration
  const [otpCode, setOtpCode]       = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [loading, setLoading]       = useState(false);
  const [stageError, setStageError] = useState('');
  // Data Privacy Policy: current version / whether acknowledgement is mandatory
  // come from the backend (authoritative). The checkbox always starts unticked.
  const [policyMeta, setPolicyMeta] = useState(null);
  const [privacyAck, setPrivacyAck] = useState(false);
  const [policyOpen, setPolicyOpen] = useState(false);
  const [searchParams]              = useSearchParams();
  const { setUser, user: resumingUser } = useAuthStore();
  const navigate                    = useNavigate();

  // Task 5: record that a referral link was opened (write-only beacon; never blocks or alters registration).
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref && /^[A-Za-z0-9]{1,20}$/.test(ref)) referralPublicService.visit(ref).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [form, setForm] = useState({
    // Stage 1 — Account
    // `phone` is kept in E.164 form (e.g. "+2348012345678") by PhoneInput
    // itself; `country_iso2` is the 2-letter region the investor picked
    // from the country dropdown (e.g. "NG"). The backend derives the
    // dial code and display country name from country_iso2 — see
    // PhoneNumberService.
    full_name: '', email: '', phone: '', country_iso2: '',
    password: '', password_confirmation: '',
    referral_code: searchParams.get('ref') || '',

    // Stage 3 — Personal / KYC
    date_of_birth: '', residential_address: '', address_line_2: '', city: '', state: '', postal_code: '',

    // Stage 4 — Investor Profile
    employment_status: '', annual_income_range: '', source_of_funds: '',
    investment_experience: '', risk_tolerance: '', investment_objectives: '',

    // Stage 5 — Security
    withdrawal_pin: '', withdrawal_pin_confirmation: '',
  });

  // Visual step shown in the sidebar/header (maps internal `stage` + awaitingOtp to the 5-step display)
  const visualStep = awaitingOtp ? 2 : stage === 1 ? 1 : stage + 1;

  // Resume mid-registration instead of restarting at Stage 1. A token
  // already exists after Stage 1 (needed to authenticate the OTP/stage2-4
  // requests), so reloading this page — whether on purpose or after a
  // crash — would otherwise always show the Stage 1 form again, even
  // for someone who already verified their email or finished KYC.
  // App.jsx's initializeAuth() has already resolved by the time this
  // page can render (routes are gated on `hydrated`), so the store's
  // `user` is ready to read here without an extra fetch.
  useEffect(() => {
    if (!resumingUser) return; // fresh registration — Stage 1 as normal
    const stageNum = resumingUser.registration_stage ?? 1;
    if (stageNum >= 4) return; // fully registered — GuestRoute already redirects this case away
    if (stageNum === 1 && !resumingUser.email_verified) {
      setAwaitingOtp(true);
    } else {
      setStage(Math.max(stageNum, 2));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadPolicyMeta = async () => {
    try {
      const res = await authService.getPrivacyPolicy();
      setPolicyMeta(res.data);
      return res.data;
    } catch {
      return null;
    }
  };

  useEffect(() => { loadPolicyMeta(); }, []);

  // Resend cooldown countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const update = (key, val) => {
    setStageError('');
    setForm(f => ({ ...f, [key]: val }));
  };

  const submitStage = async () => {
    setLoading(true);
    setStageError('');

    try {
      if (stage === 1) {
        const res = await authService.registerStage1(buildStage1Payload(form, { privacyAck, policyMeta, visitorToken: getConsentedToken() }));

        // Stage 1 never creates an account and answers every email identically (no account-existence oracle). A one-time code is emailed when
        // appropriate; only someone who can read that mailbox can create or resume the account by entering it (POST /register/verify).
        if (needsResumeVerification(res.data)) {
          localStorage.removeItem('auth_token');
          setResumeMode(true);
          setAwaitingOtp(true);
          setResendCooldown(resumeCooldownSeconds(res.data, RESEND_COOLDOWN_SECONDS));
          if (res.data?.email_sent === false) toast.error(res.data.message || 'We could not send the code just now. Please try again in a moment.');
          else toast.success('If this email can be used to register, we sent a 6-digit code to it. Enter it below.');
          return;
        }

        // Save token for OTP + stages 2-4
        if (res.data?.token) {
          localStorage.setItem('auth_token', res.data.token);
        }

        // Be honest about whether the verification email actually went
        // out — the backend can create the account successfully while
        // the email send itself fails, and that's easy to miss silently.
        if (res.data?.email_sent === false) {
          toast.error(res.data.message || 'Account created, but the verification email failed to send. Tap "Resend code" below.');
        } else {
          toast.success('Verification code sent to your email.');
        }

        // Move to email verification instead of stage 2
        setAwaitingOtp(true);
        setResendCooldown(RESEND_COOLDOWN_SECONDS);

      } else if (stage === 2) {
        await authService.registerStage2({
          date_of_birth:        form.date_of_birth,
          residential_address:  form.residential_address,
          address_line_2:       form.address_line_2 || undefined,
          city:                 form.city,
          state:                form.state || undefined,
          postal_code:          form.postal_code || undefined,
        });
        setStage(3);

      } else if (stage === 3) {
        await authService.registerStage3({
          employment_status:     form.employment_status,
          annual_income_range:   form.annual_income_range,
          source_of_funds:       form.source_of_funds,
          investment_experience: form.investment_experience,
          risk_tolerance:        form.risk_tolerance,
          investment_objectives: form.investment_objectives || undefined,
        });
        setStage(4);

      } else if (stage === 4) {
        const payload = {};
        if (form.withdrawal_pin) {
          payload.withdrawal_pin = form.withdrawal_pin;
          payload.withdrawal_pin_confirmation = form.withdrawal_pin_confirmation;
        }

        const res = await authService.registerStage4(payload);

        // After stage 4, user should be logged in
        const user = res.data?.user || res.data;
        if (user?.id) {
          setUser({ ...user, role: user.role || 'investor' });
        }

        toast.success('Account created! Welcome to Smart System.');
        navigate('/investor/dashboard', { replace: true });
      }

    } catch (err) {
      const msg = extractErrors(err);
      setStageError(msg);
      // The policy changed since this page loaded: make the user re-read and
      // re-acknowledge the current version rather than silently re-sending.
      if (err.response?.data?.errors?.privacy_policy_version) {
        setPrivacyAck(false);
        loadPolicyMeta();
      }
    } finally {
      setLoading(false);
    }
  };

  const submitOtp = async () => {
    setLoading(true);
    setStageError('');

    try {
      if (resumeMode) {
        const res = await authService.resumeVerify(buildResumePayload(form, otpCode, { privacyAck, policyMeta, visitorToken: getConsentedToken() }));
        if (res.data?.token) localStorage.setItem('auth_token', res.data.token);
        toast.success('Email verified!');
        setResumeMode(false);
        setAwaitingOtp(false);
        setOtpCode('');
        setStage(Math.max(Number(res.data?.registration_stage) || 1, 2));   // the code also verified the email, so skip straight on
        return;
      }
      await authService.verifyOtp({ otp: otpCode });
      toast.success('Email verified!');
      setAwaitingOtp(false);
      setOtpCode('');
      setStage(2);
    } catch (err) {
      setStageError(extractErrors(err));
    } finally {
      setLoading(false);
    }
  };

  const resendOtp = async () => {
    if (resendCooldown > 0) return;
    setStageError('');
    try {
      if (resumeMode) {
        // No token exists yet, so ask for a fresh code the same way the first one was requested (the server rate-limits this).
        const res = await authService.registerStage1(buildStage1Payload(form, { privacyAck, policyMeta, visitorToken: getConsentedToken() }));
        setResendCooldown(resumeCooldownSeconds(res.data, RESEND_COOLDOWN_SECONDS));
        if (res.data?.email_sent === false) { setStageError(res.data.message || 'We could not confirm the email was sent.'); return; }
        toast.success('If a code was due, it has been sent. Check your inbox and spam folder.');
        return;
      }
      await authService.resendOtp();
      toast.success('A new code has been sent.');
      setResendCooldown(RESEND_COOLDOWN_SECONDS);
    } catch (err) {
      setStageError(extractErrors(err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (awaitingOtp) {
      if (!isValidCode(otpCode)) {
        setStageError('Enter the 6-digit code from your email.');
        return;
      }
      submitOtp();
      return;
    }

    // Client-side validation before hitting API
    // (Immediate feedback only — the backend re-validates the phone
    // number authoritatively via libphonenumber; this never replaces it.)
    if (stage === 1) {
      if (!form.phone || !isValidPhoneNumber(form.phone)) {
        setStageError('Please enter a valid phone number.');
        return;
      }
      if (!form.country_iso2) {
        setStageError('Please select your country.');
        return;
      }
      if (form.password.length < 8) {
        setStageError('Password must be at least 8 characters.');
        return;
      }
      if (form.password !== form.password_confirmation) {
        setStageError('Passwords do not match.');
        return;
      }

      // Policy information must be known so the correct version is recorded.
      const meta = policyMeta || await loadPolicyMeta();
      if (!meta) {
        setStageError('We could not load the Data Privacy Policy details. Please check your connection and try again.');
        return;
      }
      if (meta.acknowledgement_required && !privacyAck) {
        setStageError('You must acknowledge the Data Privacy Policy to create an account.');
        return;
      }
    }

    if (stage === 4 && form.withdrawal_pin) {
      if (!/^\d{4}$/.test(form.withdrawal_pin)) {
        setStageError('Withdrawal PIN must be exactly 4 digits.');
        return;
      }
      if (form.withdrawal_pin !== form.withdrawal_pin_confirmation) {
        setStageError('Withdrawal PINs do not match.');
        return;
      }
    }

    submitStage();
  };

  return (
    <div className="auth-page">
      {/* ── LEFT ── */}
      <div className="auth-panel auth-panel--left">
        <div className="auth-brand">
          <Link to="/" className="auth-logo">
            <span className="auth-logo__icon"><img src="/logo-mark.png" alt="Smart System Investment" /></span>
            Smart<b>System</b>
          </Link>
          <h2>Start building wealth today.</h2>
          <p>Complete registration in 5 simple steps and join thousands of successful investors.</p>

          <div className="reg-stages">
            {STAGES.map(s => (
              <div key={s.n} className={`reg-stage ${s.n < visualStep ? 'done' : s.n === visualStep ? 'active' : ''}`}>
                <div className="reg-stage__num">
                  {s.n < visualStep ? <FiCheck size={13} /> : s.n}
                </div>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div className="auth-panel auth-panel--right">
        <div className="auth-form-wrap">
          <div className="auth-form-header">
            <FiShield size={32} className="auth-shield" />
            <h1>Create Account</h1>
            <p>Step {visualStep} of 5 — {STAGES[visualStep - 1].label}</p>
          </div>

          {/* PROGRESS BAR */}
          <div className="stage-progress">
            <div className="stage-progress__bar" style={{ width:`${(visualStep / 5) * 100}%` }} />
          </div>

          {/* ERROR BANNER */}
          {stageError && (
            <div className="auth-error" style={{ display:'flex', alignItems:'flex-start', gap:'0.6rem', marginBottom:'1.25rem' }}>
              <FiAlertCircle size={16} style={{ flexShrink:0, marginTop:2 }} />
              <span>{stageError}</span>
            </div>
          )}

          <form className="auth-form" onSubmit={handleSubmit}>

            {/* ── VERIFY EMAIL (OTP) ── */}
            {awaitingOtp && (
              <>
                <div className="reg-success-banner">
                  <div>📧</div>
                  <div>
                    <strong>{resumeMode ? 'Confirm it\'s you' : 'Check your email'}</strong>
                    <p>
                      {resumeMode
                        ? <>You already started registering with {form.email}. To continue, enter the 6-digit code we just sent to that address. Your password is only changed once the code is confirmed.</>
                        : <>We sent a 6-digit code to {form.email}. Enter it below to continue.</>}
                    </p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    className="form-control auth-input"
                    style={{ textAlign:'center', fontSize:'1.4rem', letterSpacing:'0.5rem' }}
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    value={otpCode}
                    onChange={e => { setStageError(''); setOtpCode(e.target.value.replace(/\D/g, '')); }}
                  />
                </div>

                <div style={{ textAlign:'center', fontSize:'0.85rem', color:'var(--gray-400)' }}>
                  Didn't get the code?{' '}
                  {resendCooldown > 0 ? (
                    <span>Resend in {resendCooldown}s</span>
                  ) : (
                    <button type="button" className="link-btn" onClick={resendOtp} style={{ background:'none', border:'none', color:'var(--info)', cursor:'pointer', padding:0 }}>
                      Resend code
                    </button>
                  )}
                  {resumeMode && (
                    <div style={{ marginTop:'0.5rem' }}>
                      <button type="button" className="link-btn" style={{ background:'none', border:'none', color:'var(--info)', cursor:'pointer', padding:0 }}
                        onClick={() => { setResumeMode(false); setAwaitingOtp(false); setOtpCode(''); setStageError(''); }}>
                        Use a different email
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── STAGE 1 — Account ── */}
            {!awaitingOtp && stage === 1 && (
              <>
                <div className="form-group">
                  <label className="form-label">Full Name</label>
                  <div className="auth-input-wrap">
                    <FiUser className="auth-input-icon" size={15} />
                    <input className="form-control auth-input" placeholder="John Doe" required
                      value={form.full_name} onChange={e => update('full_name', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <div className="auth-input-wrap">
                    <FiMail className="auth-input-icon" size={15} />
                    <input type="email" className="form-control auth-input"
                      placeholder="your@email.com" required autoComplete="email"
                      value={form.email} onChange={e => update('email', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  {/* International country select + formatted number input,
                      backed by libphonenumber-js. Selecting a country here
                      IS how "Country" is now set — there's no separate free
                      -text country field left to get out of sync with it. */}
                  <PhoneInput
                    international
                    countryCallingCodeEditable={false}
                    countrySelectComponent={SearchableCountrySelect}
                    placeholder="Enter phone number"
                    className="form-control auth-input phone-input"
                    value={form.phone}
                    onChange={val => update('phone', val || '')}
                    defaultCountry={form.country_iso2 || undefined}
                    onCountryChange={iso2 => update('country_iso2', iso2 || '')}
                  />
                  {form.phone && !isValidPhoneNumber(form.phone) && (
                    <div className="field-hint" style={{ color:'#e05252', marginTop:'0.35rem', fontSize:'0.8rem' }}>
                      That doesn't look like a valid number for the selected country.
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <div className="auth-input-wrap">
                    <FiLock className="auth-input-icon" size={15} />
                    <input type="password" className="form-control auth-input"
                      placeholder="Min. 8 characters" required minLength={8}
                      autoComplete="new-password"
                      value={form.password} onChange={e => update('password', e.target.value)} />
                  </div>
                  {/* Password strength indicator */}
                  {form.password.length > 0 && (
                    <div style={{ marginTop:'0.4rem' }}>
                      <div style={{ height:4, background:'var(--gray-200)', borderRadius:999, overflow:'hidden' }}>
                        <div style={{
                          height:'100%', borderRadius:999, transition:'all 0.3s',
                          width: form.password.length < 6 ? '25%' : form.password.length < 8 ? '50%' : form.password.length < 12 ? '75%' : '100%',
                          background: form.password.length < 6 ? 'var(--danger)' : form.password.length < 8 ? 'var(--warning)' : form.password.length < 12 ? 'var(--info)' : 'var(--success)',
                        }} />
                      </div>
                      <div style={{ fontSize:'0.72rem', color:'var(--gray-400)', marginTop:'0.25rem' }}>
                        {form.password.length < 6 ? 'Too weak' : form.password.length < 8 ? 'Weak' : form.password.length < 12 ? 'Good' : 'Strong'}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm Password</label>
                  <div className="auth-input-wrap">
                    <FiLock className="auth-input-icon" size={15} />
                    <input type="password" className="form-control auth-input"
                      placeholder="Repeat password" required autoComplete="new-password"
                      value={form.password_confirmation}
                      onChange={e => update('password_confirmation', e.target.value)} />
                  </div>
                  {form.password_confirmation.length > 0 && form.password !== form.password_confirmation && (
                    <div className="form-error">Passwords do not match</div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Referral Code{' '}
                    <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span>
                  </label>
                  <input className="form-control" placeholder="e.g. REF123456"
                    value={form.referral_code}
                    onChange={e => update('referral_code', e.target.value)} />
                </div>

                {/* Data Privacy Policy: short summary + in-page full policy + an
                    unchecked acknowledgement. The dialog keeps the form intact. */}
                <section className="privacy-panel" aria-labelledby="privacy-panel-h">
                  <h3 id="privacy-panel-h" className="privacy-panel__title">Your privacy</h3>
                  <ul className="privacy-panel__points">
                    {SUMMARY.map(item => (
                      <li key={item.key}><strong>{item.title}:</strong> {item.text}</li>
                    ))}
                  </ul>
                  <button type="button" className="privacy-panel__read" onClick={() => setPolicyOpen(true)}>
                    Read the full Data Privacy Policy
                  </button>

                  <label className="privacy-ack__label" htmlFor="privacy-ack">
                    <input
                      id="privacy-ack"
                      type="checkbox"
                      checked={privacyAck}
                      required={!!policyMeta?.acknowledgement_required}
                      aria-required={!!policyMeta?.acknowledgement_required}
                      onChange={e => { setStageError(''); setPrivacyAck(e.target.checked); }}
                    />
                    <span>
                      I have read and acknowledge the Data Privacy Policy
                      {policyMeta?.acknowledgement_required ? '' : ' (optional)'}.
                      <small className="privacy-ack__hint">
                        This only confirms you have read how we handle your personal information.
                      </small>
                    </span>
                  </label>
                </section>

                <RegistrationTrackingNotice />

                <PrivacyPolicyModal open={policyOpen} onClose={() => setPolicyOpen(false)} meta={policyMeta} />
              </>
            )}

            {/* ── STAGE 2 — Personal Info / KYC ── */}
            {!awaitingOtp && stage === 2 && (
              <>
                <div className="form-group">
                  <label className="form-label">Date of Birth</label>
                  <input type="date" className="form-control" required
                    max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    value={form.date_of_birth} onChange={e => update('date_of_birth', e.target.value)} />
                  <div style={{ fontSize:'0.72rem', color:'var(--gray-400)', marginTop:'0.25rem' }}>
                    You must be at least 18 years old.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Residential Address</label>
                  <div className="auth-input-wrap">
                    <FiMapPin className="auth-input-icon" size={15} />
                    <input className="form-control auth-input" placeholder="123 Main Street" required
                      value={form.residential_address} onChange={e => update('residential_address', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Address Line 2{' '}
                    <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span>
                  </label>
                  <input className="form-control" placeholder="Apartment, suite, unit, etc."
                    value={form.address_line_2} onChange={e => update('address_line_2', e.target.value)} />
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'1rem' }}>
                  <div className="form-group">
                    <label className="form-label">City</label>
                    <input className="form-control" placeholder="New York" required
                      value={form.city} onChange={e => update('city', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      State / Province{' '}
                      <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span>
                    </label>
                    <input className="form-control" placeholder="NY"
                      value={form.state} onChange={e => update('state', e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Postal Code{' '}
                    <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span>
                  </label>
                  <input className="form-control" placeholder="10001"
                    value={form.postal_code} onChange={e => update('postal_code', e.target.value)} />
                </div>
              </>
            )}

            {/* ── STAGE 3 — Investor Profile ── */}
            {!awaitingOtp && stage === 3 && (
              <>
                <div className="form-group">
                  <label className="form-label">Employment Status</label>
                  <select className="form-control" required
                    value={form.employment_status}
                    onChange={e => update('employment_status', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="employed">Employed</option>
                    <option value="self_employed">Self-employed</option>
                    <option value="unemployed">Unemployed</option>
                    <option value="retired">Retired</option>
                    <option value="student">Student</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Annual Income Range</label>
                  <select className="form-control" required
                    value={form.annual_income_range}
                    onChange={e => update('annual_income_range', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="under_25000">Under $25,000</option>
                    <option value="25000_50000">$25,000 – $50,000</option>
                    <option value="50000_100000">$50,000 – $100,000</option>
                    <option value="100000_250000">$100,000 – $250,000</option>
                    <option value="over_250000">Over $250,000</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Source of Funds</label>
                  <select className="form-control" required
                    value={form.source_of_funds}
                    onChange={e => update('source_of_funds', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="salary">Salary / Employment Income</option>
                    <option value="business_income">Business Income</option>
                    <option value="savings">Savings</option>
                    <option value="investments">Investments</option>
                    <option value="inheritance">Inheritance</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Investment Experience</label>
                  <select className="form-control" required
                    value={form.investment_experience}
                    onChange={e => update('investment_experience', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="none">None</option>
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced / Professional</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Risk Tolerance</label>
                  <select className="form-control" required
                    value={form.risk_tolerance}
                    onChange={e => update('risk_tolerance', e.target.value)}>
                    <option value="">Select…</option>
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Investment Objectives{' '}
                    <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional)</span>
                  </label>
                  <textarea className="form-control" rows={3}
                    placeholder="e.g. Long-term growth, retirement planning…"
                    value={form.investment_objectives}
                    onChange={e => update('investment_objectives', e.target.value)} />
                </div>
              </>
            )}

            {/* ── STAGE 4 — Security ── */}
            {!awaitingOtp && stage === 4 && (
              <>
                <div className="reg-success-banner">
                  <div>🎉</div>
                  <div>
                    <strong>Almost there!</strong>
                    <p>Optionally set a 4-digit withdrawal PIN to secure future withdrawals.</p>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Withdrawal PIN{' '}
                    <span style={{ color:'var(--gray-400)', fontWeight:400 }}>(optional, 4 digits)</span>
                  </label>
                  <div className="auth-input-wrap">
                    <FiLock className="auth-input-icon" size={15} />
                    <input type="password" inputMode="numeric" maxLength={4}
                      className="form-control auth-input" placeholder="••••"
                      autoComplete="off"
                      value={form.withdrawal_pin}
                      onChange={e => update('withdrawal_pin', e.target.value.replace(/\D/g, ''))} />
                  </div>
                </div>

                {form.withdrawal_pin.length > 0 && (
                  <div className="form-group">
                    <label className="form-label">Confirm Withdrawal PIN</label>
                    <div className="auth-input-wrap">
                      <FiLock className="auth-input-icon" size={15} />
                      <input type="password" inputMode="numeric" maxLength={4}
                        className="form-control auth-input" placeholder="••••"
                        autoComplete="off"
                        value={form.withdrawal_pin_confirmation}
                        onChange={e => update('withdrawal_pin_confirmation', e.target.value.replace(/\D/g, ''))} />
                    </div>
                    {form.withdrawal_pin_confirmation.length > 0 && form.withdrawal_pin !== form.withdrawal_pin_confirmation && (
                      <div className="form-error">PINs do not match</div>
                    )}
                  </div>
                )}
              </>
            )}

            {/* NAVIGATION BUTTONS */}
            <div style={{ display:'flex', gap:'0.75rem', marginTop:'0.5rem' }}>
              {!awaitingOtp && stage > 1 && (
                <button type="button" className="btn btn-ghost"
                  style={{ flex:1 }}
                  disabled={loading}
                  onClick={() => { setStageError(''); setStage(s => s - 1); }}>
                  Back
                </button>
              )}
              <button
                type="submit"
                className="btn btn-primary"
                style={{ flex: (!awaitingOtp && stage > 1) ? 1 : '1 0 100%', padding:'0.9rem' }}
                disabled={loading}
              >
                {loading
                  ? <><span className="spinner" style={{ borderTopColor:'white' }} /> {awaitingOtp ? 'Verifying…' : stage === 4 ? 'Creating account…' : 'Saving…'}</>
                  : awaitingOtp ? (resumeMode ? 'Confirm & Continue' : 'Verify Email') : stage === 4 ? 'Create Account' : 'Continue'
                }
              </button>
            </div>
          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
