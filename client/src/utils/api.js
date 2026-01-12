import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses and errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - only redirect if not already on login/register pages
      const currentPath = window.location.pathname;
      if (!currentPath.includes('/login') && !currentPath.includes('/register') && !currentPath.includes('/admin/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use setTimeout to avoid navigation during render
        setTimeout(() => {
          window.location.href = '/login';
        }, 100);
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  adminLogin: (data) => api.post('/auth/admin/login', data),
  googleAuth: (data) => api.post('/auth/google', data),
  getCurrentUser: () => api.get('/auth/current-user'),
  logout: () => api.post('/auth/logout'),
};

// Worker API
export const workerAPI = {
  submitApplication: (data) => {
    // If data is FormData, don't set Content-Type header (let browser set it)
    if (data instanceof FormData) {
      return api.post('/workers/application', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return api.post('/workers/application', data);
  },
  getDashboard: () => api.get('/workers/dashboard/me'),
  updateProfile: (data) => api.put('/workers/profile', data),
  getAllWorkers: (params) => api.get('/workers', { params }),
  getWorkerById: (id) => api.get(`/workers/${id}`),
  recordWorkerView: (workerId) => api.post(`/workers/${workerId}/view`),
  markNotificationsRead: () => api.put('/workers/notifications/read'),
  getStats: () => api.get('/workers/stats/me'),
};

// Payment API
export const paymentAPI = {
  initiateWorkerPayment: (data) => api.post('/payments/worker/initiate', data),
  initiateCustomerPayment: (data) => api.post('/payments/customer/initiate', data),
  checkPaymentStatus: (id) => api.get(`/payments/status/${id}`),
  getCustomerAccessStatus: () => api.get('/payments/customer/access-status'),
  recordWorkerContact: (data) => api.post('/payments/customer/record-contact', data),
};

// Admin API
export const adminAPI = {
  getAllApplications: (params) => api.get('/admin/workers', { params }),
  getApplicationDetails: (id) => api.get(`/admin/workers/${id}`),
  approveWorker: (id) => api.put(`/admin/workers/${id}/approve`),
  rejectWorker: (id, data) => api.put(`/admin/workers/${id}/reject`, data),
  toggleWorkerVisibility: (id) => api.put(`/admin/workers/${id}/toggle-visibility`),
  getAnalytics: () => api.get('/admin/analytics'),
  getAllUsers: (params) => api.get('/admin/users', { params }),
  toggleUserStatus: (id) => api.put(`/admin/users/${id}/toggle-status`),
  getPaymentHistory: (params) => api.get('/admin/payments', { params }),
};

// Dev API
export const devAPI = {
  checkDevMode: () => api.get('/dev-mode'),
};
