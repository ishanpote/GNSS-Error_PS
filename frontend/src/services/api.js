import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('Interceptor - Token from localStorage:', token);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
      console.log('Interceptor - Authorization header set:', config.headers['Authorization']);
    } else {
      console.log('Interceptor - No token found in localStorage');
      console.log('Interceptor - All localStorage keys:', Object.keys(localStorage));
    }
    return config;
  },
  (error) => {
    console.error('Interceptor request error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.log('API Error:', error.response);
    if (error.response && error.response.status === 401) {
      console.log('Unauthorized - Token may be invalid');
      localStorage.removeItem('token');
    }
    return Promise.reject(error);
  }
);

// Helper function to set auth token
export const setAuthToken = (token) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    localStorage.setItem('token', token);
    console.log('Auth token set in axios defaults and localStorage:', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    localStorage.removeItem('token');
    console.log('Auth token removed from axios defaults and localStorage');
  }
};

// Initialize token from localStorage on app start
const token = localStorage.getItem('token');
if (token) {
  setAuthToken(token);
}

// Auth Services
export const authService = {
  login: (username, password) => {
    return api.post('/auth/login', { username, password });
  },
  register: (username, email, password, category) => {
    return api.post('/auth/register', { username, email, password, category });
  },
  getCurrentUser: () => {
    return api.get('/auth/me');
  },
  getAccessibleDashboards: () => {
    return api.get('/dashboard/access');
  },
};

// Dashboard Services
export const dashboardService = {
  getDashboardData: (dashboardType) => {
    return api.get(`/dashboard/${dashboardType}`);
  },
  getAnalytics: (dashboardType) => {
    return api.get(`/analytics/${dashboardType}`);
  },
};

// Prediction Services
export const predictionService = {
  getSamplePredictions: () => {
    return api.get('/predict/sample');
  },
  uploadAndPredict: (file, params) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('n_past_days', params.n_past_days || 7);
    formData.append('n_future_days', params.n_future_days || 1);
    formData.append('points_per_day', params.points_per_day || 41);
    
    return api.post('/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;
