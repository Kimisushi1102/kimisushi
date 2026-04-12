import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Menu API
export const menuApi = {
  getAll: () => api.get('/menu'),
  getCategories: () => api.get('/menu/categories')
};

// Orders API
export const ordersApi = {
  create: (data) => api.post('/orders', data),
  getById: (id) => api.get(`/orders/${id}`),
  getAll: (params) => api.get('/orders', { params }),
  updateStatus: (id, status) => api.put(`/orders/${id}/status`, { status })
};

// Reservations API
export const reservationsApi = {
  create: (data) => api.post('/reservations', data),
  getById: (id) => api.get(`/reservations/${id}`),
  getAll: (params) => api.get('/reservations', { params }),
  updateStatus: (id, status) => api.put(`/reservations/${id}/status`, { status })
};

// Config API
export const configApi = {
  get: () => api.get('/config')
};

export default api;
