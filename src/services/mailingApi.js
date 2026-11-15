// TASK 3 — Mailing API client. NEW FILE: kept separate so the shared src/services/api.js is NOT modified.
// Re-uses the existing axios instance (auth token + 401 handling) exported as default from ./api.
import api from './api';

const e = (env) => `/mailing/${env}`;

export const mailingService = {
  dashboard:        (env)            => api.get(`${e(env)}/dashboard`),
  messages:         (env, params)    => api.get(`${e(env)}/messages`, { params }),
  failures:         (env, params)    => api.get(`${e(env)}/failures`, { params }),
  message:          (id)             => api.get(`/mailing/messages/${id}`),
  myMessages:       (params)         => api.get('/mailing/my/messages', { params }),
  myPermissions:    ()               => api.get('/mailing/my/permissions'),
  retry:            (env, id)        => api.post(`${e(env)}/messages/${id}/retry`),
  assign:           (env, id, userId)=> api.post(`${e(env)}/messages/${id}/assign`, { assigned_to: userId }),
  compose:          (env, data)      => api.post(`${e(env)}/messages`, data),

  audiences:        (env)            => api.get(`${e(env)}/audiences`),
  campaigns:        (env, params)    => api.get(`${e(env)}/campaigns`, { params }),
  campaign:         (env, id)        => api.get(`${e(env)}/campaigns/${id}`),
  createCampaign:   (env, data)      => api.post(`${e(env)}/campaigns`, data),
  updateCampaign:   (env, id, data)  => api.put(`${e(env)}/campaigns/${id}`, data),
  deleteCampaign:   (env, id)        => api.delete(`${e(env)}/campaigns/${id}`),
  previewAudience:  (env, id)        => api.get(`${e(env)}/campaigns/${id}/audience-preview`),
  scheduleCampaign: (env, id, at)    => api.post(`${e(env)}/campaigns/${id}/schedule`, { scheduled_at: at }),
  sendCampaign:     (env, id)        => api.post(`${e(env)}/campaigns/${id}/send`),
  cancelCampaign:   (env, id)        => api.post(`${e(env)}/campaigns/${id}/cancel`),

  templates:        (env)            => api.get(`${e(env)}/templates`),
  createTemplate:   (env, data)      => api.post(`${e(env)}/templates`, data),
  updateTemplate:   (env, id, data)  => api.put(`${e(env)}/templates/${id}`, data),
  deleteTemplate:   (env, id)        => api.delete(`${e(env)}/templates/${id}`),

  subscribers:      (env, params)    => api.get(`${e(env)}/subscribers`, { params }),
  inviteSubscriber: (data)           => api.post('/mailing/public/subscribers', data),
  unsubscribe:      (env, id)        => api.post(`${e(env)}/subscribers/${id}/unsubscribe`),
  unsubscribes:     (env, params)    => api.get(`${e(env)}/unsubscribes`, { params }),

  departments:      ()               => api.get('/mailing/departments'),
  createMailbox:    (deptId, data)   => api.post(`/mailing/departments/${deptId}/mailboxes`, data),
  checkMailbox:     (id)             => api.post(`/mailing/mailboxes/${id}/check`),
  deactivateMailbox:(id)             => api.delete(`/mailing/mailboxes/${id}`),
  audit:            (params)         => api.get('/mailing/audit', { params }),
  permissions:      ()               => api.get('/mailing/permissions'),
  setPermissions:   (userId, perms)  => api.put(`/mailing/permissions/${userId}`, { permissions: perms }),
};

// Public (no auth needed; the shared instance simply sends no token when none is stored).
export const publicMailing = {
  contact:   (data) => api.post('/public/mailing/contact', data),
  subscribe: (data) => api.post('/public/mailing/subscribe', data),
};

// Investor self-service (optional-email preferences + own history).
export const investorMailing = {
  history:     (params) => api.get('/investor/mailing/history', { params }),
  message:     (id)     => api.get(`/investor/mailing/history/${id}`),
  preferences: ()       => api.get('/investor/mailing/preferences'),
  setPreferences: (data) => api.put('/investor/mailing/preferences', data),
};
