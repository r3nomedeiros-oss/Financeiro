import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ArrowLeftRight, 
  FileText, 
  Target, 
  BarChart3, 
  Settings,
  LogOut
} from 'lucide-react';

const menuItems = [
  { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { path: '/movimentacoes', icon: ArrowLeftRight, label: 'Movimentação Financeira' },
  { path: '/dre', icon: FileText, label: 'Demonstrativo de Resultado' },
  { path: '/planejamento', icon: Target, label: 'Planejamento Orçamentário' },
  { path: '/relatorios', icon: BarChart3, label: 'Relatórios' },
  { path: '/configuracoes', icon: Settings, label: 'Configurações' },
];

export default function Sidebar({ user, onLogout }) {
  const location = useLocation();

  return (
    <div className="h-screen w-64 bg-gradient-to-b from-blue-900 to-blue-800 text-white flex flex-col shadow-2xl">
      {/* Logo */}
      <div className="p-6 border-b border-blue-700">
        <h1 className="text-2xl font-bold">Sistema Financeiro</h1>
        <p className="text-blue-200 text-sm mt-1">Industrial</p>
      </div>

      {/* User Info */}
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
                flex items-center space-x-3 px-6 py-3 transition-all duration-200
                ${
                  isActive
                    ? 'bg-blue-700 border-r-4 border-white text-white'
                    : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
                }
              `}
            >
              <Icon size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex items-center space-x-3 px-6 py-4 text-blue-100 hover:bg-red-600 hover:text-white transition-all duration-200 border-t border-blue-700"
      >
        <LogOut size={20} />
        <span className="text-sm font-medium">Sair</span>
      </button>
    </div>
  );
}
