/**
 * Admin dashboard API service — wraps all admin dashboard endpoints.
 */
import axios from '../../../config/axios';

const getAdminHeaders = () => {
  const token = localStorage.getItem('admin_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// === Admin Auth ===
export const adminLogin = async (username: string, password: string) => {
  const res = await axios.post('/admin/login', { username, password });
  return res.data;
};

export const verifyAdmin = async () => {
  const res = await axios.get('/admin/verify', { headers: getAdminHeaders() });
  return res.data;
};

// === Dashboard Summary ===
export const getDashboardSummary = async () => {
  const res = await axios.get('/dashboard/summary', { headers: getAdminHeaders() });
  return res.data;
};

// === Fields Health ===
export const getFieldsHealth = async (params?: {
  health_status?: string;
  crop_type?: string;
  search?: string;
  sort_by?: string;
}) => {
  const res = await axios.get('/dashboard/fields-health', {
    headers: getAdminHeaders(),
    params,
  });
  return res.data;
};

// === VI Trend All ===
export const getVITrendAll = async (vi_type = 'NDVI', period = '6m') => {
  const res = await axios.get('/dashboard/vi-trend-all', {
    headers: getAdminHeaders(),
    params: { vi_type, period },
  });
  return res.data;
};

// === Alerts ===
export const getDashboardAlerts = async (severity?: string) => {
  const res = await axios.get('/dashboard/alerts', {
    headers: getAdminHeaders(),
    params: severity ? { severity } : {},
  });
  return res.data;
};

// === Activity Log ===
export const getActivityLog = async (limit = 20) => {
  const res = await axios.get('/dashboard/activity-log', {
    headers: getAdminHeaders(),
    params: { limit },
  });
  return res.data;
};

export const createActivityLog = async (data: {
  action_type: string;
  field_id?: string;
  description?: string;
}) => {
  const res = await axios.post('/dashboard/activity-log', data, {
    headers: getAdminHeaders(),
  });
  return res.data;
};

// === Users Management ===
export const getAllUsers = async (params?: {
  role?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) => {
  const res = await axios.get('/dashboard/users', {
    headers: getAdminHeaders(),
    params,
  });
  return res.data;
};

export const updateUserRole = async (userId: string, role: string) => {
  const res = await axios.patch(`/dashboard/users/${userId}/role`, { role }, {
    headers: getAdminHeaders(),
  });
  return res.data;
};

export const updateUserStatus = async (userId: string, is_active: boolean) => {
  const res = await axios.patch(`/dashboard/users/${userId}/status`, { is_active }, {
    headers: getAdminHeaders(),
  });
  return res.data;
};

export const deleteUser = async (userId: string) => {
  const res = await axios.delete(`/dashboard/users/${userId}`, {
    headers: getAdminHeaders(),
  });
  return res.data;
};

// === Field Snapshots for Admin Details ===
export const getFieldSnapshots = async (fieldId: string, viType: string = 'NDVI', limit: number = 4) => {
  const res = await axios.get(`/vi-analysis/snapshots/${fieldId}`, {
    headers: getAdminHeaders(),
    params: { vi_type: viType, limit },
  });
  return res.data;
};

export const analyzeFieldHistorical = async (fieldId: string, viType: string = 'NDVI', count: number = 4) => {
  const res = await axios.post(`/vi-analysis/${fieldId}/analyze-historical`, null, {
    headers: getAdminHeaders(),
    params: { vi_type: viType, count, clear_old: true },
  });
  return res.data;
};
