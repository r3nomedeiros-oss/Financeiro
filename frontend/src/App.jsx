import React, { useState, useEffect, lazy, Suspense, createContext, useContext, useCallback, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';

// Lazy load de páginas - carrega apenas quando necessário
const LoginPage = lazy(() => import('./pages/LoginPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const MovimentacoesPage = lazy(() => import('./pages/MovimentacoesPage'));
const DREPage = lazy(() => import('./pages/DREPage'));
const FluxoCaixaPage = lazy(() => import('./pages/FluxoCaixaPage'));
const PlanejamentoPage = lazy(() => import('./pages/PlanejamentoPage'));
const ComparativoPage = lazy(() => import('./pages/ComparativoPage'));
const RelatoriosPage = lazy(() => import('./pages/RelatoriosPage'));
const ConfiguracoesPage = lazy(() => import('./pages/ConfiguracoesPage'));

// Loading spinner compacto
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
  </div>
);

// Cache Context para dados compartilhados
const CacheContext = createContext(null);

export const useCache = () => {
  const context = useContext(CacheContext);
  if (!context) {
    throw new Error('useCache must be used within CacheProvider');
  }
  return context;
};

// Provider de Cache Global
function CacheProvider({ children }) {
  const [cache, setCache] = useState({
    contas: null,
    planoContas: null,
    hierarquia: null,
    categoriasDRE: null,
    lastFetch: {}
  });

  const CACHE_TTL = 60000; // 1 minuto de cache

  const setData = useCallback((key, data) => {
    setCache(prev => ({
      ...prev,
      [key]: data,
      lastFetch: { ...prev.lastFetch, [key]: Date.now() }
    }));
  }, []);

  const getData = useCallback((key) => {
    const lastFetch = cache.lastFetch[key];
    if (lastFetch && Date.now() - lastFetch < CACHE_TTL) {
      return cache[key];
    }
    return null;
  }, [cache]);

  const invalidate = useCallback((key) => {
    if (key) {
      setCache(prev => ({
        ...prev,
        [key]: null,
        lastFetch: { ...prev.lastFetch, [key]: 0 }
      }));
    } else {
      setCache({
        contas: null,
        planoContas: null,
        hierarquia: null,
        categoriasDRE: null,
        lastFetch: {}
      });
    }
  }, []);

  const value = useMemo(() => ({ getData, setData, invalidate, cache }), [getData, setData, invalidate, cache]);

  return (
    <CacheContext.Provider value={value}>
      {children}
    </CacheContext.Provider>
  );
}

// Prefetch das próximas páginas prováveis
function usePrefetch() {
  const location = useLocation();
  
  useEffect(() => {
    // Prefetch baseado na página atual
    const prefetchMap = {
      '/dashboard': [
        () => import('./pages/MovimentacoesPage'),
        () => import('./pages/DREPage')
      ],
      '/movimentacoes': [
        () => import('./pages/DashboardPage'),
        () => import('./pages/ConfiguracoesPage')
      ],
      '/dre': [
        () => import('./pages/FluxoCaixaPage'),
        () => import('./pages/ComparativoPage')
      ]
    };

    const toPrefetch = prefetchMap[location.pathname];
    if (toPrefetch) {
      // Prefetch após um pequeno delay para não bloquear renderização
      const timer = setTimeout(() => {
        toPrefetch.forEach(fn => fn());
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);
}

// Componente de rotas com prefetch
function AppRoutes() {
  usePrefetch();
  
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/movimentacoes" element={<MovimentacoesPage />} />
        <Route path="/dre" element={<DREPage />} />
        <Route path="/fluxo-caixa" element={<FluxoCaixaPage />} />
        <Route path="/planejamento" element={<PlanejamentoPage />} />
        <Route path="/comparativo" element={<ComparativoPage />} />
        <Route path="/relatorios" element={<RelatoriosPage />} />
        <Route path="/configuracoes" element={<ConfiguracoesPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Verificar usuário logado de forma síncrona
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (error) {
        console.error('Erro ao carregar usuário:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <LoginPage onLogin={handleLogin} />
      </Suspense>
    );
  }

  return (
    <CacheProvider>
      <BrowserRouter>
        <Layout user={user} onLogout={handleLogout}>
          <AppRoutes />
        </Layout>
      </BrowserRouter>
    </CacheProvider>
  );
}

export default App;
