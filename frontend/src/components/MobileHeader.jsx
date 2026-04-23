import React from 'react';
import { useLocation } from 'react-router-dom';

// Mapa de títulos curtos para mobile
const TITLES = {
  '/dashboard': 'Dashboard',
  '/movimentacoes': 'Movimentação',
  '/dre': 'DRE',
  '/fluxo-caixa': 'Fluxo de Caixa',
  '/planejamento': 'Planejamento',
  '/comparativo': 'Orçado x Realizado',
  '/relatorios': 'Relatórios',
  '/configuracoes': 'Configurações',
};

export default function MobileHeader() {
  const location = useLocation();
  const title = TITLES[location.pathname] || 'Sistema Financeiro';

  return (
    <header
      className="md:hidden sticky top-0 z-30 bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-md"
      data-testid="mobile-header"
    >
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 bg-white/15 backdrop-blur rounded-md flex items-center justify-center font-bold text-sm shrink-0">
            SF
          </div>
          <h1 className="text-base font-semibold truncate">{title}</h1>
        </div>
      </div>
    </header>
  );
}
