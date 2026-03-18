import React from 'react';
import { BarChart3, FileText, TrendingUp } from 'lucide-react';

export default function RelatoriosPage() {
  return (
    <div className="space-y-6" data-testid="relatorios-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Relatórios</h1>
        <p className="text-gray-600 mt-1">Análises e relatórios financeiros</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-blue-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Relatório de Fluxo de Caixa</h3>
          <p className="text-gray-600 text-sm">Análise detalhada das entradas e saídas</p>
          <button className="mt-4 text-blue-600 font-medium text-sm hover:underline">
            Em breve →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-green-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <FileText className="text-green-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Relatório Comparativo</h3>
          <p className="text-gray-600 text-sm">Compare períodos diferentes</p>
          <button className="mt-4 text-green-600 font-medium text-sm hover:underline">
            Em breve →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition">
          <div className="bg-purple-100 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
            <TrendingUp className="text-purple-600" size={24} />
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Análise de Tendências</h3>
          <p className="text-gray-600 text-sm">Projeções e tendências financeiras</p>
          <button className="mt-4 text-purple-600 font-medium text-sm hover:underline">
            Em breve →
          </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <p className="text-blue-800">
          <strong>💡 Dica:</strong> Novos relatórios serão adicionados em breve. Continue usando o sistema
          para ter dados mais precisos nas análises.
        </p>
      </div>
    </div>
  );
}
