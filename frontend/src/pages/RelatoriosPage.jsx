import React, { useState, useEffect } from 'react';
import { movimentacoesAPI, planoContasAPI } from '../services/api';
import { Download, Filter, Eye, EyeOff } from 'lucide-react';

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [hierarquia, setHierarquia] = useState({});
  
  // Filtros de período 1
  const [periodo1Inicio, setPeriodo1Inicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [periodo1Fim, setPeriodo1Fim] = useState(
    new Date().toISOString().split('T')[0]
  );
  
  // Filtros de período 2
  const [periodo2Inicio, setPeriodo2Inicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0]
  );
  const [periodo2Fim, setPeriodo2Fim] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
  );

  // Dados dos períodos
  const [dadosPeriodo1, setDadosPeriodo1] = useState([]);
  const [dadosPeriodo2, setDadosPeriodo2] = useState([]);

  // Opções de exibição
  const [mostrarAV, setMostrarAV] = useState(true);
  const [mostrarAH, setMostrarAH] = useState(true);

  useEffect(() => {
    carregarHierarquia();
  }, []);

  const carregarHierarquia = async () => {
    try {
      const res = await planoContasAPI.getHierarquico();
      setHierarquia(res.data);
    } catch (error) {
      console.error('Erro ao carregar hierarquia:', error);
    }
  };

  const compararPeriodos = async () => {
    try {
      setLoading(true);
      
      const [movs1, movs2] = await Promise.all([
        movimentacoesAPI.getAll({ 
          data_inicio: periodo1Inicio, 
          data_fim: periodo1Fim 
        }),
        movimentacoesAPI.getAll({ 
          data_inicio: periodo2Inicio, 
          data_fim: periodo2Fim 
        })
      ]);

      setDadosPeriodo1(movs1.data);
      setDadosPeriodo2(movs2.data);
    } catch (error) {
      console.error('Erro ao comparar períodos:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '-';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  // Agrupar movimentações por categoria
  const agruparPorCategoria = (movimentacoes) => {
    const agrupado = {};
    
    movimentacoes.forEach(mov => {
      const planoId = mov.plano_contas_id;
      if (!agrupado[planoId]) {
        agrupado[planoId] = {
          nome: mov.plano_contas?.nome || 'Sem categoria',
          categoria: mov.plano_contas?.categoria || '',
          tipo: mov.tipo,
          total: 0
        };
      }
      agrupado[planoId].total += mov.valor;
    });

    return agrupado;
  };

  const dadosAgrupados1 = agruparPorCategoria(dadosPeriodo1);
  const dadosAgrupados2 = agruparPorCategoria(dadosPeriodo2);

  // Calcular totais
  const totalReceitas1 = dadosPeriodo1.filter(m => m.tipo === 'entrada').reduce((a, m) => a + m.valor, 0);
  const totalReceitas2 = dadosPeriodo2.filter(m => m.tipo === 'entrada').reduce((a, m) => a + m.valor, 0);
  const totalDespesas1 = dadosPeriodo1.filter(m => m.tipo === 'saida').reduce((a, m) => a + m.valor, 0);
  const totalDespesas2 = dadosPeriodo2.filter(m => m.tipo === 'saida').reduce((a, m) => a + m.valor, 0);
  const resultado1 = totalReceitas1 - totalDespesas1;
  const resultado2 = totalReceitas2 - totalDespesas2;

  // Análise Vertical (AV) - % sobre receita total
  const calcularAV = (valor, totalReceita) => {
    if (!totalReceita || totalReceita === 0) return 0;
    return (valor / totalReceita) * 100;
  };

  // Análise Horizontal (AH) - variação entre períodos
  const calcularAH = (valorAtual, valorAnterior) => {
    if (!valorAnterior || valorAnterior === 0) {
      return valorAtual > 0 ? 100 : 0;
    }
    return ((valorAtual - valorAnterior) / valorAnterior) * 100;
  };

  // Obter todas as categorias únicas
  const todasCategorias = new Set([
    ...Object.keys(dadosAgrupados1),
    ...Object.keys(dadosAgrupados2)
  ]);

  const formatarPeriodo = (inicio, fim) => {
    const di = new Date(inicio + 'T00:00:00');
    const df = new Date(fim + 'T00:00:00');
    return `${di.toLocaleDateString('pt-BR')} - ${df.toLocaleDateString('pt-BR')}`;
  };

  return (
    <div className="space-y-6" data-testid="relatorios-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Relatórios Comparativos</h1>
          <p className="text-gray-600 text-sm">Compare períodos com análise vertical e horizontal</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
          <Filter size={18} /> Configuração de Períodos
        </h3>
        
        <div className="grid grid-cols-2 gap-6">
          {/* Período 1 */}
          <div className="space-y-3 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800">Período 1 (Atual)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={periodo1Inicio}
                  onChange={(e) => setPeriodo1Inicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="periodo1-inicio"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={periodo1Fim}
                  onChange={(e) => setPeriodo1Fim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="periodo1-fim"
                />
              </div>
            </div>
          </div>

          {/* Período 2 */}
          <div className="space-y-3 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-700">Período 2 (Comparação)</h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Início</label>
                <input
                  type="date"
                  value={periodo2Inicio}
                  onChange={(e) => setPeriodo2Inicio(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="periodo2-inicio"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">Data Fim</label>
                <input
                  type="date"
                  value={periodo2Fim}
                  onChange={(e) => setPeriodo2Fim(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="periodo2-fim"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          {/* Opções de Exibição */}
          <div className="flex gap-4">
            <button
              onClick={() => setMostrarAV(!mostrarAV)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                mostrarAV ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}
              data-testid="toggle-av"
            >
              {mostrarAV ? <Eye size={16} /> : <EyeOff size={16} />}
              Análise Vertical (AV%)
            </button>
            <button
              onClick={() => setMostrarAH(!mostrarAH)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                mostrarAH ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
              }`}
              data-testid="toggle-ah"
            >
              {mostrarAH ? <Eye size={16} /> : <EyeOff size={16} />}
              Análise Horizontal (AH%)
            </button>
          </div>

          <button
            onClick={compararPeriodos}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            data-testid="comparar-btn"
          >
            {loading ? 'Carregando...' : 'Comparar Períodos'}
          </button>
        </div>
      </div>

      {/* Tabela Comparativa */}
      {(dadosPeriodo1.length > 0 || dadosPeriodo2.length > 0) && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" data-testid="tabela-comparativa">
              <thead className="bg-gray-100">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700 border-b min-w-[200px]">Descrição</th>
                  <th className="text-right p-3 font-semibold text-blue-700 border-b bg-blue-50">
                    Período 1
                    <div className="text-xs font-normal text-blue-500">{formatarPeriodo(periodo1Inicio, periodo1Fim)}</div>
                  </th>
                  {mostrarAV && (
                    <th className="text-right p-3 font-semibold text-green-700 border-b bg-green-50">AV%</th>
                  )}
                  <th className="text-right p-3 font-semibold text-gray-700 border-b">
                    Período 2
                    <div className="text-xs font-normal text-gray-500">{formatarPeriodo(periodo2Inicio, periodo2Fim)}</div>
                  </th>
                  {mostrarAV && (
                    <th className="text-right p-3 font-semibold text-green-700 border-b bg-green-50">AV%</th>
                  )}
                  {mostrarAH && (
                    <th className="text-right p-3 font-semibold text-purple-700 border-b bg-purple-50">AH%</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {/* Receitas */}
                <tr className="bg-cyan-50 font-semibold">
                  <td className="p-3 text-cyan-700">RECEITAS</td>
                  <td className="p-3 text-right text-cyan-700">{formatCurrency(totalReceitas1)}</td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">100%</td>}
                  <td className="p-3 text-right text-cyan-700">{formatCurrency(totalReceitas2)}</td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">100%</td>}
                  {mostrarAH && (
                    <td className={`p-3 text-right font-semibold ${calcularAH(totalReceitas1, totalReceitas2) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(calcularAH(totalReceitas1, totalReceitas2))}
                    </td>
                  )}
                </tr>

                {/* Itens de Receita */}
                {Array.from(todasCategorias)
                  .filter(id => dadosAgrupados1[id]?.tipo === 'entrada' || dadosAgrupados2[id]?.tipo === 'entrada')
                  .map(id => {
                    const item1 = dadosAgrupados1[id];
                    const item2 = dadosAgrupados2[id];
                    const valor1 = item1?.total || 0;
                    const valor2 = item2?.total || 0;
                    
                    return (
                      <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 pl-6">{item1?.nome || item2?.nome}</td>
                        <td className="p-3 text-right">{formatCurrency(valor1)}</td>
                        {mostrarAV && <td className="p-3 text-right text-green-600 text-xs">{formatPercent(calcularAV(valor1, totalReceitas1))}</td>}
                        <td className="p-3 text-right">{formatCurrency(valor2)}</td>
                        {mostrarAV && <td className="p-3 text-right text-green-600 text-xs">{formatPercent(calcularAV(valor2, totalReceitas2))}</td>}
                        {mostrarAH && (
                          <td className={`p-3 text-right text-xs ${calcularAH(valor1, valor2) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(calcularAH(valor1, valor2))}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                {/* Despesas */}
                <tr className="bg-red-50 font-semibold">
                  <td className="p-3 text-red-700">DESPESAS</td>
                  <td className="p-3 text-right text-red-700">{formatCurrency(totalDespesas1)}</td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">{formatPercent(calcularAV(totalDespesas1, totalReceitas1))}</td>}
                  <td className="p-3 text-right text-red-700">{formatCurrency(totalDespesas2)}</td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">{formatPercent(calcularAV(totalDespesas2, totalReceitas2))}</td>}
                  {mostrarAH && (
                    <td className={`p-3 text-right font-semibold ${calcularAH(totalDespesas1, totalDespesas2) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatPercent(calcularAH(totalDespesas1, totalDespesas2))}
                    </td>
                  )}
                </tr>

                {/* Itens de Despesa */}
                {Array.from(todasCategorias)
                  .filter(id => dadosAgrupados1[id]?.tipo === 'saida' || dadosAgrupados2[id]?.tipo === 'saida')
                  .map(id => {
                    const item1 = dadosAgrupados1[id];
                    const item2 = dadosAgrupados2[id];
                    const valor1 = item1?.total || 0;
                    const valor2 = item2?.total || 0;
                    
                    return (
                      <tr key={id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="p-3 pl-6">{item1?.nome || item2?.nome}</td>
                        <td className="p-3 text-right">{formatCurrency(valor1)}</td>
                        {mostrarAV && <td className="p-3 text-right text-green-600 text-xs">{formatPercent(calcularAV(valor1, totalReceitas1))}</td>}
                        <td className="p-3 text-right">{formatCurrency(valor2)}</td>
                        {mostrarAV && <td className="p-3 text-right text-green-600 text-xs">{formatPercent(calcularAV(valor2, totalReceitas2))}</td>}
                        {mostrarAH && (
                          <td className={`p-3 text-right text-xs ${calcularAH(valor1, valor2) <= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(calcularAH(valor1, valor2))}
                          </td>
                        )}
                      </tr>
                    );
                  })}

                {/* Resultado */}
                <tr className="bg-gray-200 font-bold">
                  <td className="p-3">RESULTADO</td>
                  <td className={`p-3 text-right ${resultado1 >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(resultado1)}
                  </td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">{formatPercent(calcularAV(resultado1, totalReceitas1))}</td>}
                  <td className={`p-3 text-right ${resultado2 >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {formatCurrency(resultado2)}
                  </td>
                  {mostrarAV && <td className="p-3 text-right text-green-600">{formatPercent(calcularAV(resultado2, totalReceitas2))}</td>}
                  {mostrarAH && (
                    <td className={`p-3 text-right ${calcularAH(resultado1, resultado2) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                      {formatPercent(calcularAH(resultado1, resultado2))}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Legenda:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-green-600">AV%</span>
            <span className="text-gray-600">= Análise Vertical (% sobre receita total)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-purple-600">AH%</span>
            <span className="text-gray-600">= Análise Horizontal (variação entre períodos)</span>
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Use os filtros de data para comparar qualquer período: dia a dia, semana, mês, trimestre, etc.
        </p>
      </div>
    </div>
  );
}
