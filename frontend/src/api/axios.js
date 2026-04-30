import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api',
  timeout: 30000,
});

// Attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 401 bo'lsa faqat admin sahifalarida admin-login ga yo'naltir
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const isAdminPath = window.location.pathname.startsWith('/admin');
      if (isAdminPath) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/admin-login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
