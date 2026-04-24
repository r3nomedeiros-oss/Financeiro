import React, { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';

/**
 * Botão/banner para instalar o PWA.
 * - Em Chrome/Edge/Android: captura `beforeinstallprompt` e mostra botão "Instalar app".
 * - Em iOS Safari: mostra instrução (não existe API de prompt).
 * - Se já instalado (display-mode: standalone), não renderiza nada.
 */
export default function InstallPWAButton() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(
    typeof window !== 'undefined' && localStorage.getItem('pwa-install-dismissed') === '1'
  );

  useEffect(() => {
    const standalone =
      window.matchMedia?.('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) {
      setDismissed(true);
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !/crios|fxios/.test(ua);
    if (isIos && !standalone) setShowIosHint(true);

    const onInstalled = () => {
      setDeferredPrompt(null);
      setShowIosHint(false);
    };
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  const dismiss = () => {
    localStorage.setItem('pwa-install-dismissed', '1');
    setDismissed(true);
  };

  if (dismissed) return null;
  if (!deferredPrompt && !showIosHint) return null;

  return (
    <div
      data-testid="pwa-install-banner"
      className="fixed bottom-4 right-4 left-4 md:left-auto md:max-w-sm bg-slate-900 text-white rounded-xl shadow-2xl border border-cyan-500/20 p-4 z-[100] flex items-start gap-3"
    >
      <div className="flex-shrink-0 w-10 h-10 bg-cyan-500/10 rounded-lg flex items-center justify-center">
        <Download size={20} className="text-cyan-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Instalar aplicativo</p>
        {deferredPrompt ? (
          <p className="text-xs text-slate-300 mt-0.5">
            Acesso rápido pela tela inicial, igual um app nativo.
          </p>
        ) : (
          <p className="text-xs text-slate-300 mt-0.5">
            No iOS: toque em <span className="font-semibold">Compartilhar</span> e depois em{' '}
            <span className="font-semibold">"Adicionar à Tela de Início"</span>.
          </p>
        )}
        {deferredPrompt && (
          <button
            data-testid="pwa-install-button"
            onClick={handleInstall}
            className="mt-2 bg-cyan-500 hover:bg-cyan-400 text-slate-900 text-sm font-semibold px-4 py-1.5 rounded-lg transition-colors"
          >
            Instalar agora
          </button>
        )}
      </div>
      <button
        data-testid="pwa-install-dismiss"
        onClick={dismiss}
        aria-label="Dispensar"
        className="flex-shrink-0 text-slate-400 hover:text-white transition-colors"
      >
        <X size={18} />
      </button>
    </div>
  );
}
