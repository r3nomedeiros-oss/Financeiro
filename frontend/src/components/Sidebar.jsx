import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FileText, 
  Target, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Wallet
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentação Financeira' },
  { path: '/dre', icon: FileText, label: 'Demonstrativo de Resultado' },
  { path: '/fluxo-caixa', icon: Wallet, label: 'Fluxo de Caixa Diário' },
  { path: '/planejamento', icon: Target, label: 'Planejamento Orçamentário' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios Comparativos' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();
  const [isMinimized, setIsMinimized] = useState(false);

  return (
    <div className={`h-screen ${isMinimized ? 'w-16' : 'w-64'} bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-2xl transition-all duration-300 relative`}>
      {/* Toggle Button */}
      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className="absolute -right-3 top-8 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center shadow-lg hover:bg-blue-500 transition z-10"
        data-testid="toggle-sidebar-btn"
      >
        {isMinimized ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Logo */}
      <div className={`p-4 border-b border-blue-700 ${isMinimized ? 'px-2' : 'p-6'}`}>
        {isMinimized ? (
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-sm mx-auto">
            SF
          </div>
        ) : (
          <>
            <h1 className="text-xl font-bold">Sistema Financeiro</h1>
            <p className="text-blue-200 text-sm mt-1">Industrial</p>
          </>
        )}
      </div>

      {/* User Info */}
      {!isMinimized && (
        <div className="p-4 bg-blue-800/50 border-b border-blue-700">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-semibold">
              {user?.nome?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{user?.nome || 'Usuário'}</p>
              <p className="text-xs text-blue-200 truncate">{user?.email || ''}</p>
            </div>
          </div>
        </div>
      )}

      {isMinimized && (
        <div className="p-2 bg-blue-800/50 border-b border-blue-700 flex justify-center">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-semibold text-xs">
            {user?.nome?.charAt(0).toUpperCase() || 'U'}
          </div>
        </div>
      )}

      {/* Menu */}
      <nav className="flex-1 overflow-y-auto py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center ${isMinimized ? 'justify-center px-2' : 'space-x-3 px-6'} py-3 transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-700 border-r-4 border-white text-white'
                    : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                }
              `}
              title={isMinimized ? item.label : ''}
            >
              <Icon size={20} />
              {!isMinimized && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className={`flex items-center ${isMinimized ? 'justify-center px-2' : 'space-x-3 px-6'} py-4 text-blue-100 hover:bg-red-600 hover:text-white transition-all duration-200 border-t border-blue-700`}
        title={isMinimized ? 'Sair' : ''}
      >
        <LogOut size={20} />
        {!isMinimized && <span className="text-sm font-medium">Sair</span>}
      </button>
    </div>
  );
}
