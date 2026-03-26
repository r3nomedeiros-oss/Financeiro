import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316'];

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
  });

  useEffect(() => {
    carregarDados();
  }, [filtros]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getDados(filtros);
      setDados(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!dados) {
    return <div>Erro ao carregar dados</div>;
  }

  // Preparar dados para gráficos
  const entradasVsSaidas = [
    {
      name: 'Entradas',
      valor: dados.total_entradas,
    },
    {
      name: 'Saídas',
      valor: dados.total_saidas,
    },
  ];

  const saidasPorPlano = Object.entries(dados.saidas_por_plano || {}).map(([nome, valor]) => ({
    nome,
    valor,
  }));

  const entradasPorPlano = Object.entries(dados.entradas_por_plano || {}).map(([nome, valor]) => ({
    nome,
    valor,
  }));

  return (
    <div className="space-y-6" data-testid="dashboard">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-600 mt-1">Visão geral financeira</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <select
            value={filtros.mes}
            onChange={(e) => setFiltros({ ...filtros, mes: parseInt(e.target.value) })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filtro-mes"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => (
              <option key={mes} value={mes}>
                {new Date(2000, mes - 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={filtros.ano}
            onChange={(e) => setFiltros({ ...filtros, ano: parseInt(e.target.value) })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filtro-ano"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((ano) => (
              <option key={ano} value={ano}>
                {ano}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Indicadores */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Receita */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Receita</p>
              <p className="text-2xl font-bold text-gray-800 mt-2" data-testid="receita-valor">
                {formatCurrency(dados.indicadores.receita)}
              </p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <DollarSign className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        {/* Margem de Contribuição */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-green-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Margem de Contribuição</p>
              <p className="text-2xl font-bold text-gray-800 mt-2" data-testid="margem-contribuicao-valor">
                {formatCurrency(dados.indicadores.margem_contribuicao)}
              </p>
              <p className="text-green-600 text-sm font-semibold mt-1">
                {dados.indicadores.margem_contribuicao_pct.toFixed(2)}%
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        {/* Lucro Operacional */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-yellow-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Lucro Operacional</p>
              <p className="text-2xl font-bold text-gray-800 mt-2" data-testid="lucro-operacional-valor">
                {formatCurrency(dados.indicadores.lucro_operacional)}
              </p>
              <p className={`text-sm font-semibold mt-1 ${dados.indicadores.lucro_operacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dados.indicadores.lucro_operacional_pct.toFixed(2)}%
              </p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <TrendingUp className="text-yellow-600" size={24} />
            </div>
          </div>
        </div>

        {/* Lucro Líquido */}
        <div className="bg-white rounded-xl shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Lucro Líquido</p>
              <p className="text-2xl font-bold text-gray-800 mt-2" data-testid="lucro-liquido-valor">
                {formatCurrency(dados.indicadores.lucro_liquido)}
              </p>
              <p className={`text-sm font-semibold mt-1 ${dados.indicadores.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {dados.indicadores.lucro_liquido_pct.toFixed(2)}%
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <TrendingDown className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Entradas x Saídas */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Entradas x Saídas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={entradasVsSaidas}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="valor">
                {entradasVsSaidas.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.name === 'Entradas' ? '#16a34a' : '#dc2626'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Saídas por Plano de Contas */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Saídas por Plano de Contas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={saidasPorPlano}
                cx="35%"
                cy="50%"
                outerRadius={80}
                innerRadius={40}
                fill="#8884d8"
                dataKey="valor"
                paddingAngle={2}
              >
                {saidasPorPlano.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value, name, props) => [formatCurrency(value), props.payload.nome]}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                wrapperStyle={{ paddingLeft: '20px', maxWidth: '45%' }}
                formatter={(value, entry) => {
                  const nome = entry.payload.nome;
                  const percent = entry.payload.percent ? `${(entry.payload.percent * 100).toFixed(0)}%` : '';
                  const nomeDisplay = nome.length > 18 ? nome.substring(0, 18) + '...' : nome;
                  return <span style={{ fontSize: '12px' }}>{nomeDisplay}</span>;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Entradas por Plano de Contas */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Entradas por Plano de Contas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={entradasPorPlano}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="nome" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="valor">
                {entradasPorPlano.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Saldo das Contas */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Saldo das Contas</h3>
          <div className="space-y-3">
            {dados.contas && dados.contas.length > 0 ? (
              dados.contas.map((conta) => (
                <div key={conta.id} className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <Wallet className="text-blue-600" size={20} />
                    </div>
                    <span className="font-medium text-gray-800">{conta.nome}</span>
                  </div>
                  <span className={`font-bold text-lg ${conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldo_atual)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">Nenhuma conta cadastrada</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
