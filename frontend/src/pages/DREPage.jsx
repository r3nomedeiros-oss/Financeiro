import React, { useState, useEffect } from 'react';
import { dreAPI } from '../services/api';

export default function DREPage() {
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());

  useEffect(() => {
    carregarDRE();
  }, [mes, ano]);

  const carregarDRE = async () => {
    try {
      setLoading(true);
      const response = await dreAPI.get(mes, ano);
      setDre(response.data);
    } catch (error) {
      console.error('Erro ao carregar DRE:', error);
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

  return (
    <div className="space-y-6" data-testid="dre-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Demonstrativo de Resultado (DRE)</h1>
          <p className="text-gray-600 mt-1">DRE Gerencial Mensal</p>
        </div>

        {/* Filtros */}
        <div className="flex gap-3">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>
                {new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>

          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DRE */}
      {dre && (
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="space-y-4">
            {/* Receitas */}
            <div className="flex justify-between items-center pb-3 border-b-2 border-blue-600">
              <span className="text-lg font-bold text-gray-800">RECEITAS</span>
              <span className="text-xl font-bold text-green-600" data-testid="dre-receitas">
                {formatCurrency(dre.receitas)}
              </span>
            </div>

            {/* Custos */}
            <div className="flex justify-between items-center pl-6">
              <span className="text-gray-700">(-) Custos</span>
              <span className="text-red-600" data-testid="dre-custos">
                {formatCurrency(dre.custos)}
              </span>
            </div>

            {/* Lucro Bruto */}
            <div className="flex justify-between items-center bg-blue-50 p-4 rounded-lg">
              <div>
                <span className="text-lg font-semibold text-gray-800">(=) LUCRO BRUTO</span>
                <span className="ml-3 text-sm text-gray-600">
                  Margem: {dre.margem_bruta_pct.toFixed(2)}%
                </span>
              </div>
              <span className="text-xl font-bold text-blue-600" data-testid="dre-lucro-bruto">
                {formatCurrency(dre.lucro_bruto)}
              </span>
            </div>

            {/* Despesas Operacionais */}
            <div className="flex justify-between items-center pl-6">
              <span className="text-gray-700">(-) Despesas Operacionais</span>
              <span className="text-red-600" data-testid="dre-despesas">
                {formatCurrency(dre.despesas_operacionais)}
              </span>
            </div>

            {/* Lucro Operacional */}
            <div className="flex justify-between items-center bg-yellow-50 p-4 rounded-lg">
              <div>
                <span className="text-lg font-semibold text-gray-800">(=) LUCRO OPERACIONAL</span>
                <span className="ml-3 text-sm text-gray-600">
                  Margem: {dre.margem_operacional_pct.toFixed(2)}%
                </span>
              </div>
              <span className={`text-xl font-bold ${dre.lucro_operacional >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="dre-lucro-operacional">
                {formatCurrency(dre.lucro_operacional)}
              </span>
            </div>

            {/* Impostos */}
            <div className="flex justify-between items-center pl-6">
              <span className="text-gray-700">(-) Impostos</span>
              <span className="text-red-600" data-testid="dre-impostos">
                {formatCurrency(dre.impostos)}
              </span>
            </div>

            {/* Lucro Líquido */}
            <div className="flex justify-between items-center bg-gradient-to-r from-purple-50 to-pink-50 p-4 rounded-lg border-2 border-purple-200">
              <div>
                <span className="text-xl font-bold text-gray-800">(=) LUCRO LÍQUIDO</span>
                <span className="ml-3 text-sm text-gray-600">
                  Margem: {dre.margem_liquida_pct.toFixed(2)}%
                </span>
              </div>
              <span className={`text-2xl font-bold ${dre.lucro_liquido >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid="dre-lucro-liquido">
                {formatCurrency(dre.lucro_liquido)}
              </span>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              <strong>Nota:</strong> Os valores de custos, despesas e impostos são calculados proporcionalmente
              com base nas movimentações registradas. Para uma DRE mais precisa, configure as categorias do
              plano de contas adequadamente.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
