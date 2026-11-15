// TASK 4 — News & Media API client. NEW FILE (the shared src/services/api.js is NOT modified).
import api from './api';

export const publicNews = {
  list:       (params) => api.get('/public/news', { params }),
  article:    (slug)   => api.get(`/public/news/${slug}`),
  categories: ()       => api.get('/public/news/categories'),
};

export const investorNews = {
  list:    (params) => api.get('/investor/news', { params }),
  article: (slug)   => api.get(`/investor/news/${slug}`),
};

const A = '/news-admin';
export const newsAdmin = {
  articles:   (params)       => api.get(`${A}/articles`, { params }),
  article:    (id)           => api.get(`${A}/articles/${id}`),
  create:     (data)         => api.post(`${A}/articles`, data),
  update:     (id, data)     => api.put(`${A}/articles/${id}`, data),
  remove:     (id)           => api.delete(`${A}/articles/${id}`),
  submit:     (id)           => api.post(`${A}/articles/${id}/submit`),
  approve:    (id, note)     => api.post(`${A}/articles/${id}/approve`, { note }),
  reject:     (id, note)     => api.post(`${A}/articles/${id}/reject`, { note }),
  publish:    (id, at)       => api.post(`${A}/articles/${id}/publish`, at ? { scheduled_at: at } : {}),
  unpublish:  (id)           => api.post(`${A}/articles/${id}/unpublish`),
  media:      (params)       => api.get(`${A}/media`, { params }),
  uploadImage:(file, alt)    => { const f = new FormData(); f.append('file', file); if (alt) f.append('alt', alt); return api.post(`${A}/media/image`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  uploadVideo:(file)         => { const f = new FormData(); f.append('file', file); return api.post(`${A}/media/video`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); },
  embed:      (url)          => api.post(`${A}/media/embed`, { url }),
  approveMedia:(id)          => api.post(`${A}/media/${id}/approve`),
  rejectMedia: (id)          => api.post(`${A}/media/${id}/reject`),
  deleteMedia: (id)          => api.delete(`${A}/media/${id}`),
  categories: ()             => api.get(`${A}/categories`),
  createCategory: (data)     => api.post(`${A}/categories`, data),
  updateCategory: (id, data) => api.put(`${A}/categories/${id}`, data),
  myPermissions:  ()         => api.get(`${A}/my/permissions`),
  permissions:    ()         => api.get(`${A}/permissions`),
  setPermissions: (id, p)    => api.put(`${A}/permissions/${id}`, { permissions: p }),
  audit:      (params)       => api.get(`${A}/audit`, { params }),
};
