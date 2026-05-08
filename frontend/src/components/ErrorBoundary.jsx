import React from 'react';

/**
 * Captura erros de carregamento de chunks (comum após deploys novos
 * quando o navegador ainda tem index.html cacheado apontando para
 * hashes de JS que já não existem). Recarrega a página automaticamente
 * uma única vez por sessão.
 */
const RELOAD_KEY = 'app:chunk-error-reloaded';

function isChunkLoadError(error) {
  if (!error) return false;
  const msg = (error.message || '') + (error.stack || '');
  return (
    error.name === 'ChunkLoadError' ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk/i.test(msg) ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg)
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    if (isChunkLoadError(error)) {
      // Já tentou recarregar uma vez? Se sim, mostra UI manual.
      const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === '1';
      if (!alreadyReloaded) {
        sessionStorage.setItem(RELOAD_KEY, '1');
        // Limpa caches do SW e recarrega
        try {
          if ('caches' in window) {
            caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
          }
        } catch (e) {
          // ignore
        }
        // Pequeno delay pra dar tempo dos caches limparem
        setTimeout(() => window.location.reload(), 200);
        return;
      }
    }
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary capturou:', error, info);
  }

  handleManualReload = () => {
    sessionStorage.removeItem(RELOAD_KEY);
    try {
      if ('caches' in window) {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).finally(() => window.location.reload());
        return;
      }
    } catch (e) {
      // ignore
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const isChunk = isChunkLoadError(this.state.error);
      // Se for chunk error, já está recarregando (componentDidCatch). Mostra um spinner.
      if (isChunk) {
        return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-700 text-sm">Atualizando para a versão mais recente…</p>
          </div>
        );
      }
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-6 text-center">
            <h2 className="text-lg font-bold text-gray-800 mb-2">Algo deu errado</h2>
            <p className="text-sm text-gray-600 mb-4">
              Ocorreu um erro inesperado. Você pode tentar recarregar a página.
            </p>
            <button
              onClick={this.handleManualReload}
              data-testid="error-boundary-reload"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-5 py-2 rounded-lg text-sm"
            >
              Recarregar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
