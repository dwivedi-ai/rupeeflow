import axios from 'axios';
import toast from 'react-hot-toast';

const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      sessionStorage.removeItem('authToken');
      sessionStorage.removeItem('user');
      window.location.href = '/login';
      toast.error('Session expired. Please login again.');
    } else if (error.response?.status >= 500) {
      toast.error('Server error. Please try again later.');
    } else if (error.message === 'Network Error') {
      toast.error('Network error. Please check your connection.');
    }
    return Promise.reject(error);
  }
);

// Auth API functions
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  },
  
  register: async (email, password, full_name) => {
    const response = await api.post('/auth/register', { email, password, full_name });
    return response.data;
  },
  
  getMe: async () => {
    const response = await api.get('/me');
    return response.data;
  },
  
  updateProfile: async (profileData) => {
    const response = await api.put('/me', profileData);
    return response.data;
  },

  changePassword: async (passwordData) => {
    const response = await api.put('/me/password', passwordData);
    return response.data;
  },

  deleteAccount: async () => {
    const response = await api.delete('/me');
    return response.data;
  },
  
  googleLogin: () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  },
};

// Transaction API functions
export const transactionAPI = {
  create: async (transactionData) => {
    const response = await api.post('/transactions', transactionData);
    return response.data;
  },
  
  list: async (params = {}) => {
    const { limit = 50, offset = 0 } = params;
    const response = await api.get(`/transactions?limit=${limit}&offset=${offset}`);
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/transactions/${id}`);
    return response.data;
  },
  
  update: async (id, transactionData) => {
    const response = await api.put(`/transactions/${id}`, transactionData);
    return response.data;
  },
  
  delete: async (id) => {
    const response = await api.delete(`/transactions/${id}`);
    return response.data;
  },
  
  parse: async (text) => {
    const response = await api.post('/transactions/parse', { text });
    return response.data;
  },
  
  getDashboardSummary: async (startDate, endDate) => {
    const response = await api.get(`/transactions/summary?start_date=${startDate}&end_date=${endDate}`);
    return response.data;
  },

  getAll: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.search) queryParams.append('search', params.search);
    if (params.type) queryParams.append('type', params.type);
    if (params.sort_by) queryParams.append('sort_by', params.sort_by);
    if (params.sort_order) queryParams.append('sort_order', params.sort_order);
    if (params.limit) queryParams.append('limit', params.limit);
    if (params.offset) queryParams.append('offset', params.offset);
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const response = await api.get(`/transactions?${queryParams.toString()}`);
    return response.data;
  },

  getStats: async (params = {}) => {
    const queryParams = new URLSearchParams();
    
    if (params.start_date) queryParams.append('start_date', params.start_date);
    if (params.end_date) queryParams.append('end_date', params.end_date);
    
    const response = await api.get(`/transactions/stats?${queryParams.toString()}`);
    return response.data;
  },
};

// NLP API functions
export const nlpAPI = {
  parse: async (text) => {
    const response = await api.post('/transactions/parse', { text });
    return response.data;
  },
};

// Utility function to format currency
export const formatCurrency = (amount, currency = 'INR') => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

// Utility function to format dates
export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

// Utility function to get relative time
export const getRelativeTime = (date) => {
  const now = new Date();
  const targetDate = new Date(date);
  const diffInMs = now - targetDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  return `${Math.floor(diffInDays / 365)} years ago`;
};

export default api;
