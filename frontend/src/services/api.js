import axios from 'axios';

const API_URL = import.meta.env.VITE_BACKEND_URL || '';

// Cache em memória para requests GET
const requestCache = new Map();
const CACHE_TTL = 30000; // 30 segundos
const pendingRequests = new Map();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15s timeout
});

// Interceptor para adicionar token e cache
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Cache apenas para GET requests
    if (config.method === 'get' && config.cache !== false) {
      const cacheKey = config.url + JSON.stringify(config.params || {});
      const cached = requestCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        // Retornar dados do cache
        config.adapter = () => Promise.resolve({
          data: cached.data,
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
          request: {},
          cached: true
        });
      }
      
      // Deduplicar requests pendentes
      if (pendingRequests.has(cacheKey)) {
        config.adapter = () => pendingRequests.get(cacheKey);
      }
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Interceptor para cache de respostas
api.interceptors.response.use(
  (response) => {
    // Cachear respostas GET
    if (response.config.method === 'get' && !response.cached && response.config.cache !== false) {
      const cacheKey = response.config.url + JSON.stringify(response.config.params || {});
      requestCache.set(cacheKey, {
        data: response.data,
        timestamp: Date.now()
      });
      pendingRequests.delete(cacheKey);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    // Limpar request pendente em caso de erro
    if (error.config) {
      const cacheKey = error.config.url + JSON.stringify(error.config.params || {});
      pendingRequests.delete(cacheKey);
    }
    return Promise.reject(error);
  }
);

// Função para invalidar cache
export const invalidateCache = (pattern = null) => {
  if (pattern) {
    for (const key of requestCache.keys()) {
      if (key.includes(pattern)) {
        requestCache.delete(key);
      }
    }
  } else {
    requestCache.clear();
  }
};

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
// FLUXO DE CAIXA
// ============================================

export const fluxoCaixaAPI = {
  getDiario: (params) => api.get('/api/fluxo-caixa/diario', { params }),
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
