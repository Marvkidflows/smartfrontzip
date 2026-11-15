// LOCATION: src/utils/registrationStatus.js
// Task 2 — display metadata for the six application review statuses (labels come from the API too; this only supplies colours/order).

export const STATUS_ORDER = ['pending', 'submitted', 'under_review', 'additional_info_required', 'approved', 'rejected'];

export const STATUS_META = {
  pending:                  { label: 'Pending',                         badge: 'warning' },
  submitted:                { label: 'Submitted',                       badge: 'info'    },
  under_review:             { label: 'Under Review',                    badge: 'navy'    },
  additional_info_required: { label: 'Additional Information Required', badge: 'gold'    },
  approved:                 { label: 'Approved',                        badge: 'success' },
  rejected:                 { label: 'Rejected',                        badge: 'danger'  },
};

export const statusLabel = (s) => STATUS_META[s]?.label || s || '—';
export const statusBadge = (s) => `badge badge-${STATUS_META[s]?.badge || 'warning'}`;

export const EVENT_LABELS = {
  page_opened: 'Opened the registration page',
  application_started: 'Started an application',
  application_resumed: 'Resumed registration',
  attempt_blocked_duplicate: 'Registration attempt with an existing email',
  stage_completed: 'Completed a registration stage',
  application_submitted: 'Submitted the application',
  kyc_submitted: 'Submitted KYC documents',
  kyc_viewed: 'KYC documents viewed',
  status_changed: 'Status changed',
  note_added: 'Internal note',
  assigned: 'Assignment changed',
  communication_sent: 'Message sent to applicant',
  communication_failed: 'Message delivery failed',
  followup_opt_out: 'Applicant opted out of follow-up',
  followup_opt_in: 'Follow-up opt-out lifted',
  admin_kyc_decision: 'Decision recorded by Admin',
  resume_code_requested: 'Verification code emailed to resume registration',
  resume_code_locked: 'Resume code locked after too many wrong attempts',
  resume_verified: 'Resumed registration after proving email ownership',
  backfilled: 'Record created from earlier data',
};

export const eventLabel = (t) => EVENT_LABELS[t] || t;

/** Is the signed-in user part of the Registration Team? */
export const isRegistrationRole = (role) => role === 'registration_member' || role === 'registration_lead';

export const fmtDateTime = (iso) => (iso ? new Date(iso).toLocaleString() : '—');
export const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString() : '—');
