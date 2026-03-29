import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { dashboardAPI } from '../services/api';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Wallet } from 'lucide-react';

const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#ec4899', '#14b8a6', '#84cc16'];

// Formatador memoizado
const formatCurrency = (value) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

// Formatador compacto para valores grandes
const formatCurrencyCompact = (value) => {
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return (value / 1000000).toFixed(1) + 'M';
  }
  if (absValue >= 1000) {
    return (value / 1000).toFixed(1) + 'K';
  }
  return formatCurrency(value);
};

// Card memoizado para evitar re-renders - AJUSTADO para valores grandes
const IndicatorCard = memo(({ title, value, percentage, icon: Icon, borderColor, bgColor, iconColor, percentColor }) => (
  <div className={`bg-white rounded-xl shadow-md p-4 border-l-4 ${borderColor} min-h-[120px]`}>
    <div className="flex justify-between items-start gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-gray-600 text-xs font-medium truncate">{title}</p>
        <p className={`text-lg font-bold mt-1 truncate ${value < 0 ? 'text-red-600' : 'text-gray-800'}`} title={formatCurrency(value)}>
          {formatCurrency(value)}
        </p>
        {percentage !== undefined && (
          <p className={`text-xs font-semibold mt-1 ${percentColor}`}>
            {percentage.toFixed(2)}%
          </p>
        )}
      </div>
      <div className={`${bgColor} p-2 rounded-lg flex-shrink-0`}>
        <Icon className={iconColor} size={20} />
      </div>
    </div>
  </div>
));

// Gráfico de barras memoizado
const EntradasSaidasChart = memo(({ data }) => (
  <div className="bg-white rounded-xl shadow-md p-6">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Entradas x Saídas</h3>
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis tickFormatter={formatCurrencyCompact} />
        <Tooltip formatter={(value) => formatCurrency(value)} />
        <Bar dataKey="valor">
          {data.map((entry, index) => (
            <Cell 
              key={`cell-${index}`} 
              fill={entry.name === 'Entradas' ? '#16a34a' : '#dc2626'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  </div>
));

// Gráfico de barras horizontal com legenda lateral para Saídas
const SaidasBarChart = memo(({ data, title }) => {
  // Ordenar por valor decrescente e limitar a 8 itens
  const sortedData = useMemo(() => {
    return [...data]
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 8)
      .map((item, index) => ({
        ...item,
        color: COLORS[index % COLORS.length]
      }));
  }, [data]);

  const total = useMemo(() => {
    return sortedData.reduce((acc, item) => acc + item.valor, 0);
  }, [sortedData]);

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
      <div className="flex gap-4">
        {/* Gráfico de barras horizontal */}
        <div className="flex-1">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={sortedData} layout="vertical" margin={{ left: 10, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
              <XAxis type="number" tickFormatter={formatCurrencyCompact} />
              <YAxis type="category" dataKey="nome" hide />
              <Tooltip 
                formatter={(value) => formatCurrency(value)}
                labelFormatter={(label) => label}
              />
              <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                {sortedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legenda lateral */}
        <div className="w-48 flex-shrink-0 overflow-y-auto max-h-[280px]">
          <div className="space-y-2">
            {sortedData.map((item, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div 
                  className="w-3 h-3 rounded flex-shrink-0" 
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1 min-w-0">
                  <p className="truncate text-gray-700" title={item.nome}>{item.nome}</p>
                  <p className="text-gray-500 font-medium">{formatCurrency(item.valor)}</p>
                </div>
              </div>
            ))}
            {total > 0 && (
              <div className="pt-2 border-t mt-2">
                <p className="text-xs font-semibold text-gray-800">
                  Total: {formatCurrency(total)}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// Conta Card memoizado
const ContaCard = memo(({ conta }) => (
  <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
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
));

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtros, setFiltros] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
  });

  const carregarDados = useCallback(async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getDados(filtros);
      setDados(response.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  }, [filtros]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Memoizar dados processados
  const entradasVsSaidas = useMemo(() => {
    if (!dados) return [];
    return [
      { name: 'Entradas', valor: dados.total_entradas },
      { name: 'Saídas', valor: dados.total_saidas },
    ];
  }, [dados?.total_entradas, dados?.total_saidas]);

  const saidasPorPlano = useMemo(() => {
    if (!dados?.saidas_por_plano) return [];
    return Object.entries(dados.saidas_por_plano).map(([nome, valor]) => ({ nome, valor }));
  }, [dados?.saidas_por_plano]);

  const entradasPorPlano = useMemo(() => {
    if (!dados?.entradas_por_plano) return [];
    return Object.entries(dados.entradas_por_plano).map(([nome, valor]) => ({ nome, valor }));
  }, [dados?.entradas_por_plano]);

  const handleFiltroChange = useCallback((campo, valor) => {
    setFiltros(prev => ({ ...prev, [campo]: parseInt(valor) }));
  }, []);

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
            onChange={(e) => handleFiltroChange('mes', e.target.value)}
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
            onChange={(e) => handleFiltroChange('ano', e.target.value)}
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
        <IndicatorCard
          title="Receita"
          value={dados.indicadores.receita}
          icon={DollarSign}
          borderColor="border-blue-500"
          bgColor="bg-blue-100"
          iconColor="text-blue-600"
          data-testid="receita-valor"
        />
        <IndicatorCard
          title="Margem de Contribuição"
          value={dados.indicadores.margem_contribuicao}
          percentage={dados.indicadores.margem_contribuicao_pct}
          icon={TrendingUp}
          borderColor="border-green-500"
          bgColor="bg-green-100"
          iconColor="text-green-600"
          percentColor="text-green-600"
          data-testid="margem-contribuicao-valor"
        />
        <IndicatorCard
          title="Lucro Operacional"
          value={dados.indicadores.lucro_operacional}
          percentage={dados.indicadores.lucro_operacional_pct}
          icon={TrendingUp}
          borderColor="border-yellow-500"
          bgColor="bg-yellow-100"
          iconColor="text-yellow-600"
          percentColor={dados.indicadores.lucro_operacional >= 0 ? 'text-green-600' : 'text-red-600'}
          data-testid="lucro-operacional-valor"
        />
        <IndicatorCard
          title="Lucro Líquido"
          value={dados.indicadores.lucro_liquido}
          percentage={dados.indicadores.lucro_liquido_pct}
          icon={TrendingDown}
          borderColor="border-purple-500"
          bgColor="bg-purple-100"
          iconColor="text-purple-600"
          percentColor={dados.indicadores.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}
          data-testid="lucro-liquido-valor"
        />
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EntradasSaidasChart data={entradasVsSaidas} />
        
        {saidasPorPlano.length > 0 && (
          <SaidasBarChart data={saidasPorPlano} title="Saídas por Plano de Contas" />
        )}

        {entradasPorPlano.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Entradas por Plano de Contas</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={entradasPorPlano}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{ fontSize: 10 }} interval={0} angle={-45} textAnchor="end" height={80} />
                <YAxis tickFormatter={formatCurrencyCompact} />
                <Tooltip formatter={(value) => formatCurrency(value)} />
                <Bar dataKey="valor">
                  {entradasPorPlano.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Saldo das Contas */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Saldo das Contas</h3>
          <div className="space-y-3">
            {dados.contas && dados.contas.length > 0 ? (
              dados.contas.map((conta) => (
                <ContaCard key={conta.id} conta={conta} />
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
