import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  Wallet,
  Menu as MenuIcon,
  X,
  Target,
  GitCompare,
  BarChart3,
  Settings,
  LogOut,
  User,
  Users
} from 'lucide-react';

// Itens principais (barra inferior)
const primaryItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentação' },
  { path: '/dre', icon: FileText, label: 'DRE' },
  { path: '/fluxo-caixa', icon: Wallet, label: 'Fluxo' },
];

// Itens secundários (gaveta "Mais")
const baseSecondaryItems = [
  { path: '/planejamento', icon: Target, label: 'Planejamento Orçamentário' },
  { path: '/comparativo', icon: GitCompare, label: 'Orçado x Realizado' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios Comparativos' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

const adminSecondaryItem = { path: '/usuarios', icon: Users, label: 'Usuários' };

export default function MobileBottomNav({ user, onLogout }) {
  const location = useLocation();
  const [showDrawer, setShowDrawer] = useState(false);

  const secondaryItems = user?.is_admin
    ? [...baseSecondaryItems, adminSecondaryItem]
    : baseSecondaryItems;

  const isActive = (path) => location.pathname === path;
  const isSecondaryActive = secondaryItems.some((i) => isActive(i.path));

  return (
    <>
      {/* Bottom Nav fixo (só mobile) */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] pb-safe"
        data-testid="mobile-bottom-nav"
      >
        <div className="grid grid-cols-5">
          {primaryItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
                  active ? 'text-blue-600' : 'text-gray-500 active:text-blue-600'
                }`}
                data-testid={`mobile-nav-${item.path.replace('/', '')}`}
              >
                <Icon size={22} />
                <span className="text-[10px] mt-0.5 font-medium truncate max-w-full">{item.label}</span>
              </Link>
            );
          })}

          <button
            onClick={() => setShowDrawer(true)}
            className={`flex flex-col items-center justify-center py-2 px-1 transition-colors ${
              isSecondaryActive ? 'text-blue-600' : 'text-gray-500 active:text-blue-600'
            }`}
            data-testid="mobile-nav-more"
          >
            <MenuIcon size={22} />
            <span className="text-[10px] mt-0.5 font-medium">Mais</span>
          </button>
        </div>
      </nav>

      {/* Drawer "Mais" (bottom sheet) */}
      {showDrawer && (
        <div
          className="md:hidden fixed inset-0 z-50 flex flex-col justify-end"
          onClick={() => setShowDrawer(false)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="relative bg-white rounded-t-2xl shadow-2xl max-h-[80vh] overflow-y-auto animate-[slideUp_0.2s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle visual */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-800">Menu</h3>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1 text-gray-500 hover:text-gray-800"
                aria-label="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* User info */}
            <div className="flex items-center gap-3 px-5 py-4 bg-blue-50/50">
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold">
                {user?.nome?.charAt(0).toUpperCase() || <User size={18} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{user?.nome || 'Usuário'}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email || ''}</p>
              </div>
            </div>

            {/* Links secundários */}
            <div className="py-2">
              {secondaryItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setShowDrawer(false)}
                    className={`flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
                      active ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100'
                    }`}
                    data-testid={`mobile-drawer-${item.path.replace('/', '')}`}
                  >
                    <Icon size={20} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 py-2 pb-5">
              <button
                onClick={() => {
                  setShowDrawer(false);
                  onLogout?.();
                }}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-sm text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors"
                data-testid="mobile-drawer-logout"
              >
                <LogOut size={20} />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
