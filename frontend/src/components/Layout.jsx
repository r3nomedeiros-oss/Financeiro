import React from 'react';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import MobileHeader from './MobileHeader';

export default function Layout({ children, user, onLogout }) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar (desktop apenas) */}
      <Sidebar user={user} onLogout={onLogout} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header de mobile (oculto em desktop) */}
        <MobileHeader />

        {/* Conteúdo principal - rolável. Padding menor em mobile + espaço p/ bottom nav */}
        <main className="flex-1 overflow-auto p-4 md:p-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      {/* Barra inferior de navegação (apenas mobile) */}
      <MobileBottomNav user={user} onLogout={onLogout} />
    </div>
  );
}
