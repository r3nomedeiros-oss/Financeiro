import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token em todas as requisições
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

// Interceptor para lidar com erros de autenticação
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH
// ============================================

export const authAPI = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  getMe: () => api.get('/api/auth/me'),
};

// ============================================
// CONTAS BANCÁRIAS
// ============================================

export const contasAPI = {
  getAll: () => api.get('/api/contas-bancarias'),
  create: (data) => api.post('/api/contas-bancarias', data),
  update: (id, data) => api.put(`/api/contas-bancarias/${id}`, data),
  delete: (id) => api.delete(`/api/contas-bancarias/${id}`),
};

// ============================================
// PLANO DE CONTAS
// ============================================

export const planoContasAPI = {
  getAll: () => api.get('/api/plano-contas'),
  getHierarquico: () => api.get('/api/plano-contas/hierarquico'),
  getCategoriasDRE: () => api.get('/api/categorias-dre'),
  create: (data) => api.post('/api/plano-contas', data),
  update: (id, data) => api.put(`/api/plano-contas/${id}`, data),
  delete: (id) => api.delete(`/api/plano-contas/${id}`),
};

// ============================================
// MOVIMENTAÇÕES
// ============================================

export const movimentacoesAPI = {
  getAll: (params) => api.get('/api/movimentacoes', { params }),
  create: (data) => api.post('/api/movimentacoes', data),
  update: (id, data) => api.put(`/api/movimentacoes/${id}`, data),
  delete: (id) => api.delete(`/api/movimentacoes/${id}`),
};

// ============================================
// DASHBOARD
// ============================================

export const dashboardAPI = {
  getDados: (params) => api.get('/api/dashboard/dados', { params }),
};

// ============================================
// DRE
// ============================================

export const dreAPI = {
  get: (mes, ano) => api.get(`/api/dre/${mes}/${ano}`),
  getAnual: (ano) => api.get(`/api/dre/anual/${ano}`),
  criarPlanoPadrao: () => api.post('/api/plano-contas/criar-padrao'),
};

// ============================================
// PLANEJAMENTO
// ============================================

export const planejamentoAPI = {
  getAll: (params) => api.get('/api/planejamento', { params }),
  create: (data) => api.post('/api/planejamento', data),
  update: (id, data) => api.put(`/api/planejamento/${id}`, data),
  delete: (id) => api.delete(`/api/planejamento/${id}`),
};

export default api;
