/**
 * Admin dashboard API service — wraps all admin dashboard endpoints.
 */
import axios from '../../../config/axios';

// === Admin Auth ===
export const adminLogin = async (username: string, password: string) => {
  const res = await axios.post('/auth/login', { username_or_email: username, password });
  
  // Extract role and verify admin
  const user = res.data.user;
  if (user.role !== 'admin') {
      throw new Error("User does not have admin privileges");
  }
  
  return {
      access_token: res.data.access_token,
      admin_name: user.name,
      role: user.role
  };
};

export const verifyAdmin = async () => {
  const res = await axios.get('/auth/me');
  if (res.data.role !== 'admin') {
      throw new Error("Not an admin");
  }
  return res.data;
};

// === Dashboard Summary ===
export const getDashboardSummary = async () => {
  const res = await axios.get('/dashboard/summary');
  return res.data;
};

// === Fields Health ===
export const getFieldsHealth = async (params?: {
  health_status?: string;
  crop_type?: string;
  search?: string;
  sort_by?: string;
}) => {
  const res = await axios.get('/dashboard/fields-health', { params });
  return res.data;
};

// === VI Trend All ===
export const getVITrendAll = async (vi_type = 'NDVI', period = '6m') => {
  const res = await axios.get('/dashboard/vi-trend-all', {
    params: { vi_type, period },
  });
  return res.data;
};

// === Alerts ===
export const getDashboardAlerts = async (severity?: string) => {
  const res = await axios.get('/dashboard/alerts', {
    params: severity ? { severity } : {},
  });
  return res.data;
};

// === Activity Log ===
export const getActivityLog = async (limit = 20) => {
  const res = await axios.get('/dashboard/activity-log', {
    params: { limit },
  });
  return res.data;
};

export const createActivityLog = async (data: {
  action_type: string;
  field_id?: string;
  description?: string;
}) => {
  const res = await axios.post('/dashboard/activity-log', data);
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
  const res = await axios.get('/dashboard/users', { params });
  return res.data;
};
export const createUser = async (userData: any) => {
  const res = await axios.post('/dashboard/users', userData);
  return res.data;
};

export const updateUserRole = async (userId: string, role: string) => {
  const res = await axios.patch(`/dashboard/users/${userId}/role`, { role });
  return res.data;
};

export const updateUserStatus = async (userId: string, is_active: boolean) => {
  const res = await axios.patch(`/dashboard/users/${userId}/status`, { is_active });
  return res.data;
};

export const deleteUser = async (userId: string) => {
  const res = await axios.delete(`/dashboard/users/${userId}`);
  return res.data;
};

// === Security Audit Logs ===
export const getSecurityLogs = async (params?: {
  page?: number;
  limit?: number;
  severity?: string;
  event_type?: string;
}) => {
  const res = await axios.get('/dashboard/security-logs', { params });
  return res.data;
};

// === Field Snapshots for Admin Details ===
export const getFieldSnapshots = async (fieldId: string, viType: string = 'NDVI', limit: number = 4) => {
  const res = await axios.get(`/vi-analysis/snapshots/${fieldId}`, {
    params: { vi_type: viType, limit },
  });
  return res.data;
};

export const analyzeFieldHistorical = async (fieldId: string, viType: string = 'NDVI', count: number = 4) => {
  const res = await axios.post(`/vi-analysis/${fieldId}/analyze-historical`, null, {
    params: { vi_type: viType, count, clear_old: true },
  });
  return res.data;
};

// === GEE Asset Monitor ===
export const getGeeMonitorStatus = async () => {
  const res = await axios.get('/api/gee-monitor/status');
  return res.data;
};

export const getGeeViHistory = async (viType: string) => {
  const res = await axios.get(`/api/gee-monitor/history/${viType}`);
  return res.data;
};

export const triggerGeeExport = async (viType = 'ALL') => {
  const res = await axios.post('/api/gee-monitor/trigger-export', null, {
    params: { vi_type: viType },
  });
  return res.data;
};
