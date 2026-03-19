import React, { useState, useEffect } from 'react';
import { planejamentoAPI, movimentacoesAPI, planoContasAPI } from '../services/api';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight } from 'lucide-react';

// Categorias fixas do DRE
const CATEGORIAS_DRE = {
  receita_bruta: { nome: "(+) Receita Bruta", tipo: "receita", cor: "cyan" },
  deducoes_vendas: { nome: "(-) Deduções Sobre Vendas", tipo: "despesa", cor: "red" },
  custos_variaveis: { nome: "(-) Custos Variáveis", tipo: "despesa", cor: "red" },
  custos_fixos: { nome: "(-) Custos Fixos", tipo: "despesa", cor: "red" },
  resultado_nao_operacional: { nome: "Resultado Não Operacional", tipo: "misto", cor: "gray" },
};

export default function ComparativoPage() {
  const [planejamentos, setPlanejamentos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [hierarquia, setHierarquia] = useState({});
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [expandedCategories, setExpandedCategories] = useState({});

  useEffect(() => {
    carregarDados();
  }, [mes, ano]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [planRes, movRes, hierRes] = await Promise.all([
        planejamentoAPI.getAll(),
        movimentacoesAPI.getAll({ mes, ano }),
        planoContasAPI.getHierarquico()
      ]);
      
      setPlanejamentos(planRes.data);
      setMovimentacoes(movRes.data);
      setHierarquia(hierRes.data);
      
      // Expandir todas as categorias
      const expanded = {};
      Object.keys(CATEGORIAS_DRE).forEach(catId => {
        expanded[catId] = true;
      });
      setExpandedCategories(expanded);
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
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    if (!value || !isFinite(value)) return '-';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  const toggleCategoria = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  // Extrair itens do plano de contas com sua categoria
  const getItensComCategoria = () => {
    const itens = [];
    
    Object.entries(hierarquia).forEach(([catId, categoria]) => {
      (categoria.subcategorias || []).forEach(subcat => {
        (subcat.itens || []).forEach(item => {
          itens.push({
            id: item.id,
            nome: item.nome,
            subcategoria: subcat.nome,
            subcategoriaId: subcat.id,
            categoriaId: catId,
            tipo: item.tipo
          });
        });
        
        // Se subcategoria não tem itens
        if (!subcat.itens || subcat.itens.length === 0) {
          itens.push({
            id: subcat.id,
            nome: subcat.nome,
            subcategoria: '',
            subcategoriaId: subcat.id,
            categoriaId: catId,
            tipo: subcat.tipo
          });
        }
      });
    });

    return itens;
  };

  // Calcular comparativo por item
  const calcularComparativo = () => {
    const itens = getItensComCategoria();
    const comparativo = {};

    // Inicializar categorias
    Object.keys(CATEGORIAS_DRE).forEach(catId => {
      comparativo[catId] = {
        orcado: 0,
        realizado: 0,
        itens: []
      };
    });

    // Filtrar planejamentos do período
    const planejamentosPeriodo = planejamentos.filter(p => p.mes === mes && p.ano === ano);

    // Processar cada item
    itens.forEach(item => {
      // Orçado
      const orcadoItem = planejamentosPeriodo
        .filter(p => p.plano_contas_id === item.id)
        .reduce((acc, p) => acc + p.valor_planejado, 0);

      // Realizado
      const realizadoItem = movimentacoes
        .filter(m => m.plano_contas_id === item.id)
        .reduce((acc, m) => acc + m.valor, 0);

      if (orcadoItem > 0 || realizadoItem > 0) {
        const variacao = orcadoItem > 0 ? ((realizadoItem - orcadoItem) / orcadoItem) * 100 : (realizadoItem > 0 ? 100 : 0);
        
        comparativo[item.categoriaId].itens.push({
          ...item,
          orcado: orcadoItem,
          realizado: realizadoItem,
          diferenca: realizadoItem - orcadoItem,
          variacao: variacao
        });

        comparativo[item.categoriaId].orcado += orcadoItem;
        comparativo[item.categoriaId].realizado += realizadoItem;
      }
    });

    return comparativo;
  };

  const comparativo = calcularComparativo();

  // Totais gerais
  const totaisReceitas = {
    orcado: comparativo.receita_bruta?.orcado || 0,
    realizado: comparativo.receita_bruta?.realizado || 0
  };

  const totaisDespesas = {
    orcado: (comparativo.deducoes_vendas?.orcado || 0) + 
            (comparativo.custos_variaveis?.orcado || 0) + 
            (comparativo.custos_fixos?.orcado || 0) +
            (comparativo.resultado_nao_operacional?.orcado || 0),
    realizado: (comparativo.deducoes_vendas?.realizado || 0) + 
               (comparativo.custos_variaveis?.realizado || 0) + 
               (comparativo.custos_fixos?.realizado || 0) +
               (comparativo.resultado_nao_operacional?.realizado || 0)
  };

  const resultadoOrcado = totaisReceitas.orcado - totaisDespesas.orcado;
  const resultadoRealizado = totaisReceitas.realizado - totaisDespesas.realizado;

  const getCorClasse = (cor) => {
    const cores = {
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return cores[cor] || 'bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (variacao, tipo) => {
    // Para receitas: positivo é bom
    // Para despesas: negativo é bom
    const isDespesa = tipo === 'despesa';
    
    if (Math.abs(variacao) < 5) {
      return <Minus className="text-gray-400" size={16} />;
    }
    
    if (isDespesa) {
      // Despesa: gastar menos é bom (variação negativa)
      return variacao < 0 
        ? <TrendingDown className="text-green-500" size={16} />
        : <TrendingUp className="text-red-500" size={16} />;
    } else {
      // Receita: ganhar mais é bom (variação positiva)
      return variacao > 0 
        ? <TrendingUp className="text-green-500" size={16} />
        : <TrendingDown className="text-red-500" size={16} />;
    }
  };

  const getStatusColor = (variacao, tipo) => {
    const isDespesa = tipo === 'despesa';
    
    if (Math.abs(variacao) < 5) return 'text-gray-600';
    
    if (isDespesa) {
      return variacao < 0 ? 'text-green-600' : 'text-red-600';
    } else {
      return variacao > 0 ? 'text-green-600' : 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="comparativo-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Comparativo Orçado x Realizado</h1>
          <p className="text-gray-600 text-sm">Acompanhe o desempenho em relação ao planejamento</p>
        </div>

        <div className="flex gap-3 items-center">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-cyan-500">
          <p className="text-sm text-gray-500">Receitas</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <p className="text-xs text-gray-400">Orçado</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(totaisReceitas.orcado)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Realizado</p>
              <p className={`text-lg font-bold ${totaisReceitas.realizado >= totaisReceitas.orcado ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totaisReceitas.realizado)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-right">
            <span className={`text-sm ${totaisReceitas.realizado >= totaisReceitas.orcado ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(totaisReceitas.orcado > 0 ? ((totaisReceitas.realizado - totaisReceitas.orcado) / totaisReceitas.orcado) * 100 : 0)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-red-500">
          <p className="text-sm text-gray-500">Despesas</p>
          <div className="flex justify-between items-end mt-2">
            <div>
              <p className="text-xs text-gray-400">Orçado</p>
              <p className="text-lg font-semibold text-gray-700">{formatCurrency(totaisDespesas.orcado)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Realizado</p>
              <p className={`text-lg font-bold ${totaisDespesas.realizado <= totaisDespesas.orcado ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totaisDespesas.realizado)}
              </p>
            </div>
          </div>
          <div className="mt-2 text-right">
            <span className={`text-sm ${totaisDespesas.realizado <= totaisDespesas.orcado ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercent(totaisDespesas.orcado > 0 ? ((totaisDespesas.realizado - totaisDespesas.orcado) / totaisDespesas.orcado) * 100 : 0)}
            </span>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-gray-500">Resultado Orçado</p>
          <p className={`text-2xl font-bold mt-2 ${resultadoOrcado >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(resultadoOrcado)}
          </p>
        </div>

        <div className={`rounded-lg shadow p-4 border-l-4 ${resultadoRealizado >= resultadoOrcado ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
          <p className="text-sm text-gray-500">Resultado Realizado</p>
          <p className={`text-2xl font-bold mt-2 ${resultadoRealizado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {formatCurrency(resultadoRealizado)}
          </p>
          <p className={`text-sm mt-1 ${resultadoRealizado >= resultadoOrcado ? 'text-green-600' : 'text-red-600'}`}>
            {resultadoRealizado >= resultadoOrcado ? '✓ Acima do orçado' : '✗ Abaixo do orçado'}
          </p>
        </div>
      </div>

      {/* Tabela Detalhada por Categoria */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">Descrição</th>
              <th className="text-right p-3 font-semibold text-gray-700">Orçado</th>
              <th className="text-right p-3 font-semibold text-gray-700">Realizado</th>
              <th className="text-right p-3 font-semibold text-gray-700">Diferença</th>
              <th className="text-right p-3 font-semibold text-gray-700">Variação %</th>
              <th className="text-center p-3 font-semibold text-gray-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(CATEGORIAS_DRE).map(([catId, catInfo]) => {
              const catData = comparativo[catId];
              const isExpanded = expandedCategories[catId];
              const variacao = catData.orcado > 0 ? ((catData.realizado - catData.orcado) / catData.orcado) * 100 : 0;

              return (
                <React.Fragment key={catId}>
                  {/* Linha da Categoria */}
                  <tr 
                    className={`${getCorClasse(catInfo.cor)} cursor-pointer hover:opacity-90 border-b`}
                    onClick={() => toggleCategoria(catId)}
                  >
                    <td className="p-3 font-semibold">
                      <div className="flex items-center gap-2">
                        {catData.itens.length > 0 && (
                          isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
                        )}
                        {catInfo.nome}
                        {catData.itens.length > 0 && (
                          <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                            {catData.itens.length} itens
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(catData.orcado)}</td>
                    <td className="p-3 text-right font-semibold">{formatCurrency(catData.realizado)}</td>
                    <td className={`p-3 text-right font-semibold ${catData.realizado - catData.orcado >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                      {formatCurrency(catData.realizado - catData.orcado)}
                    </td>
                    <td className={`p-3 text-right font-semibold ${getStatusColor(variacao, catInfo.tipo)}`}>
                      {formatPercent(variacao)}
                    </td>
                    <td className="p-3 text-center">
                      {getStatusIcon(variacao, catInfo.tipo)}
                    </td>
                  </tr>

                  {/* Itens da Categoria */}
                  {isExpanded && catData.itens.map(item => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-3 pl-10 text-gray-600">
                        {item.subcategoria ? `${item.subcategoria} → ` : ''}{item.nome}
                      </td>
                      <td className="p-3 text-right text-gray-600">{formatCurrency(item.orcado)}</td>
                      <td className="p-3 text-right">{formatCurrency(item.realizado)}</td>
                      <td className={`p-3 text-right ${item.diferenca >= 0 ? 'text-gray-600' : 'text-red-500'}`}>
                        {formatCurrency(item.diferenca)}
                      </td>
                      <td className={`p-3 text-right ${getStatusColor(item.variacao, catInfo.tipo)}`}>
                        {formatPercent(item.variacao)}
                      </td>
                      <td className="p-3 text-center">
                        {getStatusIcon(item.variacao, catInfo.tipo)}
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}

            {/* Linha de Resultado */}
            <tr className="bg-gray-200 font-bold">
              <td className="p-3">RESULTADO</td>
              <td className={`p-3 text-right ${resultadoOrcado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {formatCurrency(resultadoOrcado)}
              </td>
              <td className={`p-3 text-right ${resultadoRealizado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(resultadoRealizado)}
              </td>
              <td className={`p-3 text-right ${resultadoRealizado - resultadoOrcado >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(resultadoRealizado - resultadoOrcado)}
              </td>
              <td className={`p-3 text-right ${resultadoRealizado >= resultadoOrcado ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(resultadoOrcado !== 0 ? ((resultadoRealizado - resultadoOrcado) / Math.abs(resultadoOrcado)) * 100 : 0)}
              </td>
              <td className="p-3 text-center">
                {resultadoRealizado >= resultadoOrcado 
                  ? <TrendingUp className="text-green-500 mx-auto" size={20} />
                  : <TrendingDown className="text-red-500 mx-auto" size={20} />
                }
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Legenda:</h3>
        <div className="flex flex-wrap gap-6 text-sm">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-green-500" size={18} />
            <span>Desempenho favorável (receita acima ou despesa abaixo do orçado)</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="text-red-500" size={18} />
            <span>Desempenho desfavorável (receita abaixo ou despesa acima do orçado)</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="text-gray-400" size={18} />
            <span>Variação dentro da margem (±5%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
