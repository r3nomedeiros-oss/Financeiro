import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { planejamentoAPI, movimentacoesAPI, planoContasAPI } from '../services/api';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Categorias fixas do DRE com cores para PDF
const CATEGORIAS_CONFIG = {
  receita_bruta: { label: "(+) Receita Bruta", tipo: "receita", cor: "cyan", rgbHeader: [224, 247, 250], rgbText: [6, 148, 162] },
  deducoes_vendas: { label: "(-) Deduções Sobre Vendas", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_variaveis: { label: "(-) Custos Variáveis", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_fixos: { label: "(-) Custos Fixos", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  resultado_nao_operacional: { label: "Resultado Não Operacional", tipo: "misto", cor: "gray", rgbHeader: [243, 244, 246], rgbText: [55, 65, 81] },
};

export default function ComparativoPage() {
  const [planejamentos, setPlanejamentos] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [hierarquia, setHierarquia] = useState({});
  const [loading, setLoading] = useState(true);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [expandedState, setExpandedState] = useState({});

  useEffect(() => {
    carregarDados();
  }, [mes, ano]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [planRes, movRes, hierRes] = await Promise.all([
        planejamentoAPI.getAll({ ano }),
        movimentacoesAPI.getAll({ mes, ano }),
        planoContasAPI.getHierarquico()
      ]);
      
      setPlanejamentos(planRes.data);
      setMovimentacoes(movRes.data);
      setHierarquia(hierRes.data);
      
      // Inicializar expansão - todas expandidas
      const initialExpanded = {};
      Object.keys(hierRes.data || {}).forEach(catId => {
        initialExpanded[catId] = { expanded: true, subcategorias: {} };
        (hierRes.data[catId]?.subcategorias || []).forEach(sub => {
          initialExpanded[catId].subcategorias[sub.id] = true;
        });
      });
      setExpandedState(initialExpanded);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Expandir/Recolher Tudo
  const expandirTudo = () => {
    const newState = {};
    Object.keys(hierarquia).forEach(catId => {
      newState[catId] = { expanded: true, subcategorias: {} };
      (hierarquia[catId]?.subcategorias || []).forEach(sub => {
        newState[catId].subcategorias[sub.id] = true;
      });
    });
    setExpandedState(newState);
  };

  const recolherTudo = () => {
    const newState = {};
    Object.keys(hierarquia).forEach(catId => {
      newState[catId] = { expanded: false, subcategorias: {} };
    });
    setExpandedState(newState);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatPercent = (value) => {
    if (!value || !isFinite(value)) return '-';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  const toggleCategoria = (catId) => {
    setExpandedState(prev => ({
      ...prev,
      [catId]: { ...prev[catId], expanded: !prev[catId]?.expanded }
    }));
  };

  const toggleSubcategoria = (catId, subcatId) => {
    setExpandedState(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        subcategorias: {
          ...prev[catId]?.subcategorias,
          [subcatId]: !prev[catId]?.subcategorias?.[subcatId]
        }
      }
    }));
  };

  // Calcular valores orçado e realizado por item
  const getValores = useCallback((itemId) => {
    const orcado = planejamentos
      .filter(p => p.plano_contas_id === itemId && p.mes === mes)
      .reduce((acc, p) => acc + p.valor_planejado, 0);
    
    const realizado = movimentacoes
      .filter(m => m.plano_contas_id === itemId)
      .reduce((acc, m) => acc + m.valor, 0);
    
    const diferenca = realizado - orcado;
    // Variação: se orçado = 0 e realizado = 0, variação = 0
    // se orçado = 0 e realizado > 0, variação = 100%
    // se orçado > 0, variação = (realizado - orcado) / orcado * 100
    let variacao = 0;
    if (orcado > 0) {
      variacao = (diferenca / orcado) * 100;
    } else if (realizado > 0) {
      variacao = 100;
    } else if (realizado < 0) {
      variacao = -100;
    }
    
    return { orcado, realizado, diferenca, variacao };
  }, [planejamentos, movimentacoes, mes]);

  // Calcular totais da categoria
  // Para categoria mista (resultado_nao_operacional): receitas somam, despesas subtraem (valor líquido, igual DRE)
  const calcularTotaisCategoria = useCallback((catId) => {
    const cat = hierarquia[catId];
    if (!cat) return { orcado: 0, realizado: 0, diferenca: 0, variacao: 0 };
    
    const isMisto = catId === 'resultado_nao_operacional';
    let orcado = 0;
    let realizado = 0;
    
    (cat.subcategorias || []).forEach(sub => {
      const signal = isMisto && sub.tipo === 'despesa' ? -1 : 1;
      (sub.itens || []).forEach(item => {
        const valores = getValores(item.id);
        orcado += valores.orcado * signal;
        realizado += valores.realizado * signal;
      });
      
      if (!sub.itens || sub.itens.length === 0) {
        const valores = getValores(sub.id);
        orcado += valores.orcado * signal;
        realizado += valores.realizado * signal;
      }
    });
    
    const diferenca = realizado - orcado;
    // Variação corrigida
    let variacao = 0;
    if (orcado > 0) {
      variacao = (diferenca / orcado) * 100;
    } else if (realizado > 0) {
      variacao = 100;
    } else if (realizado < 0) {
      variacao = -100;
    }
    
    return { orcado, realizado, diferenca, variacao };
  }, [hierarquia, getValores]);

  // Totais gerais
  const totaisReceitas = useMemo(() => calcularTotaisCategoria('receita_bruta'), [calcularTotaisCategoria]);
  const totaisDeducoes = useMemo(() => calcularTotaisCategoria('deducoes_vendas'), [calcularTotaisCategoria]);
  const totaisVariaveis = useMemo(() => calcularTotaisCategoria('custos_variaveis'), [calcularTotaisCategoria]);
  const totaisFixos = useMemo(() => calcularTotaisCategoria('custos_fixos'), [calcularTotaisCategoria]);

  // Margem de Contribuição = Receita Bruta - Deduções - Custos Variáveis
  const margemContribuicaoOrcado = totaisReceitas.orcado - totaisDeducoes.orcado - totaisVariaveis.orcado;
  const margemContribuicaoRealizado = totaisReceitas.realizado - totaisDeducoes.realizado - totaisVariaveis.realizado;

  // % Margem de Contribuição
  const margemContribuicaoPctOrcado = totaisReceitas.orcado > 0 ? (margemContribuicaoOrcado / totaisReceitas.orcado) * 100 : 0;
  const margemContribuicaoPctRealizado = totaisReceitas.realizado > 0 ? (margemContribuicaoRealizado / totaisReceitas.realizado) * 100 : 0;

  // Despesas operacionais (NÃO inclui resultado_nao_operacional — ele entra depois como valor líquido)
  const totaisDespesas = useMemo(() => {
    const orcado = totaisDeducoes.orcado + totaisVariaveis.orcado + totaisFixos.orcado;
    const realizado = totaisDeducoes.realizado + totaisVariaveis.realizado + totaisFixos.realizado;
    return { orcado, realizado, diferenca: realizado - orcado, variacao: orcado > 0 ? ((realizado - orcado) / orcado) * 100 : 0 };
  }, [totaisDeducoes, totaisVariaveis, totaisFixos]);

  // Resultado Operacional = Receita Bruta - Deduções - Custos Variáveis - Custos Fixos
  const resultadoOperacionalOrcado = totaisReceitas.orcado - totaisDespesas.orcado;
  const resultadoOperacionalRealizado = totaisReceitas.realizado - totaisDespesas.realizado;

  // Resultado Não Operacional (já vem líquido: receitas - despesas)
  const totaisNaoOperacional = useMemo(() => calcularTotaisCategoria('resultado_nao_operacional'), [calcularTotaisCategoria]);

  // Lucro Líquido = Resultado Operacional + Resultado Não Operacional (net)
  const resultadoOrcado = resultadoOperacionalOrcado + totaisNaoOperacional.orcado;
  const resultadoRealizado = resultadoOperacionalRealizado + totaisNaoOperacional.realizado;

  const getCorClasse = (cor, isHeader = false) => {
    const cores = {
      cyan: isHeader ? 'bg-cyan-50 text-cyan-700' : 'text-cyan-700',
      red: isHeader ? 'bg-red-50 text-red-600' : 'text-red-600',
      gray: isHeader ? 'bg-gray-100 text-gray-800' : 'text-gray-800',
    };
    return cores[cor] || '';
  };

  const getStatusIcon = (variacao, tipo) => {
    const isDespesa = tipo === 'despesa';
    
    if (Math.abs(variacao) < 5) {
      return <Minus className="text-gray-400" size={14} />;
    }
    
    if (isDespesa) {
      return variacao < 0 
        ? <TrendingDown className="text-green-500" size={14} />
        : <TrendingUp className="text-red-500" size={14} />;
    } else {
      return variacao > 0 
        ? <TrendingUp className="text-green-500" size={14} />
        : <TrendingDown className="text-red-500" size={14} />;
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

  // Exportar Excel
  const exportToExcel = () => {
    const rows = [];
    rows.push(['Descrição', 'Orçado', 'Realizado', 'Diferença', 'Variação %'].join(';'));
    
    const renderCatExcel = (catId) => {
      const config = CATEGORIAS_CONFIG[catId];
      const totais = calcularTotaisCategoria(catId);
      rows.push([
        config.label,
        totais.orcado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
        totais.realizado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
        totais.diferenca.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
        totais.variacao.toFixed(1).replace('.', ',') + '%'
      ].join(';'));
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          const valores = getValores(sub.id);
          rows.push([
            '  ' + sub.nome,
            valores.orcado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
            valores.realizado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
            valores.diferenca.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
            valores.variacao.toFixed(1).replace('.', ',') + '%'
          ].join(';'));
        } else {
          itens.forEach(item => {
            const valores = getValores(item.id);
            rows.push([
              '  ' + sub.nome + ' > ' + item.nome,
              valores.orcado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
              valores.realizado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
              valores.diferenca.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
              valores.variacao.toFixed(1).replace('.', ',') + '%'
            ].join(';'));
          });
        }
      });
    };
    
    ['receita_bruta', 'deducoes_vendas', 'custos_variaveis'].forEach(renderCatExcel);
    
    // (=) Margem de Contribuição
    rows.push([
      '(=) Margem de Contribuição',
      margemContribuicaoOrcado.toFixed(0),
      margemContribuicaoRealizado.toFixed(0),
      (margemContribuicaoRealizado - margemContribuicaoOrcado).toFixed(0),
      (margemContribuicaoOrcado !== 0 ? ((margemContribuicaoRealizado - margemContribuicaoOrcado) / Math.abs(margemContribuicaoOrcado)) * 100 : 0).toFixed(1).replace('.', ',') + '%'
    ].join(';'));
    
    // (=) % Margem de Contribuição
    rows.push([
      '(=) % Margem de Contribuição',
      margemContribuicaoPctOrcado.toFixed(1).replace('.', ',') + '%',
      margemContribuicaoPctRealizado.toFixed(1).replace('.', ',') + '%',
      (margemContribuicaoPctRealizado - margemContribuicaoPctOrcado).toFixed(1).replace('.', ',') + ' p.p.',
      '-'
    ].join(';'));
    
    renderCatExcel('custos_fixos');
    
    // (=) Resultado Operacional
    rows.push([
      '(=) Resultado Operacional',
      resultadoOperacionalOrcado.toFixed(0),
      resultadoOperacionalRealizado.toFixed(0),
      (resultadoOperacionalRealizado - resultadoOperacionalOrcado).toFixed(0),
      (resultadoOperacionalOrcado !== 0 ? ((resultadoOperacionalRealizado - resultadoOperacionalOrcado) / Math.abs(resultadoOperacionalOrcado)) * 100 : 0).toFixed(1).replace('.', ',') + '%'
    ].join(';'));
    
    renderCatExcel('resultado_nao_operacional');
    
    rows.push([
      '(=) Lucro Líquido',
      resultadoOrcado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
      resultadoRealizado.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
      (resultadoRealizado - resultadoOrcado).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
      (resultadoOrcado !== 0 ? ((resultadoRealizado - resultadoOrcado) / Math.abs(resultadoOrcado)) * 100 : 0).toFixed(1).replace('.', ',') + '%'
    ].join(';'));
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Comparativo_${mes}_${ano}.csv`;
    link.click();
  };

  // Exportar PDF COM CORES
  const exportToPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const mesNome = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    
    doc.setFontSize(14);
    doc.text(`Comparativo Orçado x Realizado - ${mesNome}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    const headers = ['Descrição', 'Orçado', 'Realizado', 'Diferença', 'Var %'];
    const body = [];
    
    const renderCatPDF = (catId) => {
      const config = CATEGORIAS_CONFIG[catId];
      const totais = calcularTotaisCategoria(catId);
      
      body.push([
        { content: config.label, styles: { fontStyle: 'bold', fillColor: config.rgbHeader, textColor: config.rgbText } },
        { content: formatCurrency(totais.orcado), styles: { halign: 'right', fillColor: config.rgbHeader } },
        { content: formatCurrency(totais.realizado), styles: { halign: 'right', fillColor: config.rgbHeader } },
        { content: formatCurrency(totais.diferenca), styles: { halign: 'right', fillColor: config.rgbHeader, textColor: totais.diferenca >= 0 ? [22, 163, 74] : [220, 38, 38] } },
        { content: formatPercent(totais.variacao), styles: { halign: 'right', fillColor: config.rgbHeader, textColor: totais.variacao >= 0 ? [22, 163, 74] : [220, 38, 38] } }
      ]);
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          const valores = getValores(sub.id);
          if (valores.orcado > 0 || valores.realizado > 0) {
            body.push([
              { content: '  ' + sub.nome },
              { content: formatCurrency(valores.orcado), styles: { halign: 'right' } },
              { content: formatCurrency(valores.realizado), styles: { halign: 'right' } },
              { content: formatCurrency(valores.diferenca), styles: { halign: 'right', textColor: valores.diferenca >= 0 ? [22, 163, 74] : [220, 38, 38] } },
              { content: formatPercent(valores.variacao), styles: { halign: 'right', textColor: valores.variacao >= 0 ? [22, 163, 74] : [220, 38, 38] } }
            ]);
          }
        } else {
          itens.forEach(item => {
            const valores = getValores(item.id);
            if (valores.orcado > 0 || valores.realizado > 0) {
              body.push([
                { content: '    ' + item.nome },
                { content: formatCurrency(valores.orcado), styles: { halign: 'right' } },
                { content: formatCurrency(valores.realizado), styles: { halign: 'right' } },
                { content: formatCurrency(valores.diferenca), styles: { halign: 'right', textColor: valores.diferenca >= 0 ? [22, 163, 74] : [220, 38, 38] } },
                { content: formatPercent(valores.variacao), styles: { halign: 'right', textColor: valores.variacao >= 0 ? [22, 163, 74] : [220, 38, 38] } }
              ]);
            }
          });
        }
      });
    };
    
    ['receita_bruta', 'deducoes_vendas', 'custos_variaveis'].forEach(renderCatPDF);
    
    // (=) Margem de Contribuição
    const varMargemC = margemContribuicaoOrcado !== 0 ? ((margemContribuicaoRealizado - margemContribuicaoOrcado) / Math.abs(margemContribuicaoOrcado)) * 100 : 0;
    body.push([
      { content: '(=) Margem de Contribuição', styles: { fontStyle: 'bold', fillColor: [207, 250, 254], textColor: [21, 94, 117] } },
      { content: formatCurrency(margemContribuicaoOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: [21, 94, 117] } },
      { content: formatCurrency(margemContribuicaoRealizado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: margemContribuicaoRealizado >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatCurrency(margemContribuicaoRealizado - margemContribuicaoOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: (margemContribuicaoRealizado - margemContribuicaoOrcado) >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatPercent(varMargemC), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: varMargemC >= 0 ? [22, 163, 74] : [220, 38, 38] } }
    ]);
    
    // (=) % Margem de Contribuição
    body.push([
      { content: '(=) % Margem de Contribuição', styles: { fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 64, 175] } },
      { content: margemContribuicaoPctOrcado.toFixed(1) + '%', styles: { halign: 'right', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 64, 175] } },
      { content: margemContribuicaoPctRealizado.toFixed(1) + '%', styles: { halign: 'right', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: [30, 64, 175] } },
      { content: (margemContribuicaoPctRealizado - margemContribuicaoPctOrcado).toFixed(1) + ' p.p.', styles: { halign: 'right', fontStyle: 'bold', fillColor: [219, 234, 254], textColor: (margemContribuicaoPctRealizado - margemContribuicaoPctOrcado) >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: '-', styles: { halign: 'right', fillColor: [219, 234, 254] } }
    ]);
    
    renderCatPDF('custos_fixos');
    
    // (=) Resultado Operacional
    const varResOp = resultadoOperacionalOrcado !== 0 ? ((resultadoOperacionalRealizado - resultadoOperacionalOrcado) / Math.abs(resultadoOperacionalOrcado)) * 100 : 0;
    body.push([
      { content: '(=) Resultado Operacional', styles: { fontStyle: 'bold', fillColor: [207, 250, 254], textColor: [21, 94, 117] } },
      { content: formatCurrency(resultadoOperacionalOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: [21, 94, 117] } },
      { content: formatCurrency(resultadoOperacionalRealizado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: resultadoOperacionalRealizado >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatCurrency(resultadoOperacionalRealizado - resultadoOperacionalOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: (resultadoOperacionalRealizado - resultadoOperacionalOrcado) >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatPercent(varResOp), styles: { halign: 'right', fontStyle: 'bold', fillColor: [207, 250, 254], textColor: varResOp >= 0 ? [22, 163, 74] : [220, 38, 38] } }
    ]);
    
    renderCatPDF('resultado_nao_operacional');
    
    // Linha de Lucro Líquido
    const varResultado = resultadoOrcado !== 0 ? ((resultadoRealizado - resultadoOrcado) / Math.abs(resultadoOrcado)) * 100 : 0;
    body.push([
      { content: '(=) Lucro Líquido', styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
      { content: formatCurrency(resultadoOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
      { content: formatCurrency(resultadoRealizado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 252, 231], textColor: resultadoRealizado >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatCurrency(resultadoRealizado - resultadoOrcado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 252, 231], textColor: (resultadoRealizado - resultadoOrcado) >= 0 ? [22, 163, 74] : [220, 38, 38] } },
      { content: formatPercent(varResultado), styles: { halign: 'right', fontStyle: 'bold', fillColor: [220, 252, 231], textColor: varResultado >= 0 ? [22, 163, 74] : [220, 38, 38] } }
    ]);
    
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 70 } },
    });
    
    doc.save(`Comparativo_${mes}_${ano}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Renderizar linha de item
  const renderItemRow = (item, tipo, nivel = 2) => {
    const valores = getValores(item.id);
    if (valores.orcado === 0 && valores.realizado === 0) return null;
    
    const paddingLeft = nivel === 2 ? 'pl-8' : 'pl-14';
    
    return (
      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
        <td className={`p-2 ${paddingLeft} text-sm`}>
          {nivel === 3 ? '• ' : ''}{item.nome}
        </td>
        <td className="p-2 text-right text-sm text-gray-600">{formatCurrency(valores.orcado)}</td>
        <td className="p-2 text-right text-sm font-medium">{formatCurrency(valores.realizado)}</td>
        <td className={`p-2 text-right text-sm ${valores.diferenca >= 0 ? '' : 'text-red-600'}`}>
          {formatCurrency(valores.diferenca)}
        </td>
        <td className={`p-2 text-right text-sm ${getStatusColor(valores.variacao, tipo)}`}>
          {formatPercent(valores.variacao)}
        </td>
        <td className="p-2 text-center">
          {getStatusIcon(valores.variacao, tipo)}
        </td>
      </tr>
    );
  };

  // Renderizar categoria hierárquica
  const renderCategoriaHierarquica = (catId, config) => {
    const cat = hierarquia[catId];
    const isExpanded = expandedState[catId]?.expanded;
    const subcategorias = cat?.subcategorias || [];
    const totais = calcularTotaisCategoria(catId);

    return (
      <React.Fragment key={catId}>
        <tr 
          className={`${getCorClasse(config.cor, true)} border-b border-gray-200 cursor-pointer hover:opacity-90`}
          onClick={() => toggleCategoria(catId)}
        >
          <td className={`p-2 font-semibold`}>
            <div className="flex items-center gap-2">
              {subcategorias.length > 0 && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
              {config.label}
            </div>
          </td>
          <td className="p-2 text-right font-semibold">{formatCurrency(totais.orcado)}</td>
          <td className="p-2 text-right font-semibold">{formatCurrency(totais.realizado)}</td>
          <td className={`p-2 text-right font-semibold ${totais.diferenca >= 0 ? '' : 'text-red-600'}`}>
            {formatCurrency(totais.diferenca)}
          </td>
          <td className={`p-2 text-right font-semibold ${getStatusColor(totais.variacao, config.tipo)}`}>
            {formatPercent(totais.variacao)}
          </td>
          <td className="p-2 text-center">
            {getStatusIcon(totais.variacao, config.tipo)}
          </td>
        </tr>

        {isExpanded && subcategorias.map(sub => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[sub.id];
          const itens = sub.itens || [];
          const hasItens = itens.length > 0;

          // Calcular totais da subcategoria
          let subOrcado = 0, subRealizado = 0;
          if (hasItens) {
            itens.forEach(item => {
              const v = getValores(item.id);
              subOrcado += v.orcado;
              subRealizado += v.realizado;
            });
          } else {
            const v = getValores(sub.id);
            subOrcado = v.orcado;
            subRealizado = v.realizado;
          }
          
          if (subOrcado === 0 && subRealizado === 0) return null;
          
          const subDiferenca = subRealizado - subOrcado;
          const subVariacao = subOrcado > 0 ? (subDiferenca / subOrcado) * 100 : (subRealizado > 0 ? 100 : 0);

          return (
            <React.Fragment key={sub.id}>
              <tr 
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => hasItens && toggleSubcategoria(catId, sub.id)}
              >
                <td className="p-2 pl-6 text-sm font-medium">
                  <div className="flex items-center gap-2">
                    {hasItens && (
                      isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                    )}
                    {sub.nome}
                  </div>
                </td>
                <td className="p-2 text-right text-sm text-gray-600">{formatCurrency(subOrcado)}</td>
                <td className="p-2 text-right text-sm font-medium">{formatCurrency(subRealizado)}</td>
                <td className={`p-2 text-right text-sm ${subDiferenca >= 0 ? '' : 'text-red-600'}`}>
                  {formatCurrency(subDiferenca)}
                </td>
                <td className={`p-2 text-right text-sm ${getStatusColor(subVariacao, config.tipo)}`}>
                  {formatPercent(subVariacao)}
                </td>
                <td className="p-2 text-center">
                  {getStatusIcon(subVariacao, config.tipo)}
                </td>
              </tr>

              {isSubExpanded && hasItens && itens.map(item => renderItemRow(item, config.tipo, 3))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4" data-testid="comparativo-page">
      {/* Header Fixo */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-4 -mx-4 md:-mx-6 px-4 md:px-6 -mt-4 md:-mt-6 pt-4 md:pt-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-800">Orçado x Realizado</h1>
            <p className="text-gray-600 text-sm">Acompanhe o desempenho em relação ao planejamento</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={expandirTudo} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" title="Expandir Tudo">
              <ChevronsDown size={16} />
            </button>
            <button onClick={recolherTudo} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" title="Recolher Tudo">
              <ChevronsUp size={16} />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <button onClick={exportToExcel} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              <FileSpreadsheet size={16} />
            </button>
            <button onClick={exportToPDF} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">
              <Download size={16} />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <select
              value={mes}
              onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'short' })}
                </option>
              ))}
            </select>
            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela Detalhada - Estrutura DRE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="text-left p-2 font-semibold text-gray-700 min-w-[200px]">Descrição</th>
              <th className="text-right p-2 font-semibold text-gray-700 w-24">Orçado</th>
              <th className="text-right p-2 font-semibold text-gray-700 w-24">Realizado</th>
              <th className="text-right p-2 font-semibold text-gray-700 w-24">Diferença</th>
              <th className="text-right p-2 font-semibold text-gray-700 w-20">Var %</th>
              <th className="text-center p-2 font-semibold text-gray-700 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {/* Receita Bruta, Deduções, Custos Variáveis */}
            {['receita_bruta', 'deducoes_vendas', 'custos_variaveis'].map(catId =>
              renderCategoriaHierarquica(catId, CATEGORIAS_CONFIG[catId])
            )}

            {/* (=) Margem de Contribuição */}
            <tr className="bg-cyan-50 font-semibold border-y border-cyan-200">
              <td className="p-2 text-cyan-800">(=) Margem de Contribuição</td>
              <td className={`p-2 text-right ${margemContribuicaoOrcado >= 0 ? 'text-cyan-800' : 'text-red-700'}`}>
                {formatCurrency(margemContribuicaoOrcado)}
              </td>
              <td className={`p-2 text-right ${margemContribuicaoRealizado >= 0 ? 'text-cyan-800' : 'text-red-700'}`}>
                {formatCurrency(margemContribuicaoRealizado)}
              </td>
              <td className={`p-2 text-right ${(margemContribuicaoRealizado - margemContribuicaoOrcado) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(margemContribuicaoRealizado - margemContribuicaoOrcado)}
              </td>
              <td className={`p-2 text-right ${margemContribuicaoRealizado >= margemContribuicaoOrcado ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(margemContribuicaoOrcado !== 0 ? ((margemContribuicaoRealizado - margemContribuicaoOrcado) / Math.abs(margemContribuicaoOrcado)) * 100 : 0)}
              </td>
              <td className="p-2 text-center">
                {margemContribuicaoRealizado >= margemContribuicaoOrcado
                  ? <TrendingUp className="text-green-500 mx-auto" size={16} />
                  : <TrendingDown className="text-red-500 mx-auto" size={16} />
                }
              </td>
            </tr>

            {/* (=) % Margem de Contribuição */}
            <tr className="bg-blue-50 font-semibold border-b border-blue-200">
              <td className="p-2 text-blue-800">(=) % Margem de Contribuição</td>
              <td className={`p-2 text-right ${margemContribuicaoPctOrcado >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
                {margemContribuicaoPctOrcado.toFixed(1)}%
              </td>
              <td className={`p-2 text-right ${margemContribuicaoPctRealizado >= 0 ? 'text-blue-800' : 'text-red-700'}`}>
                {margemContribuicaoPctRealizado.toFixed(1)}%
              </td>
              <td className={`p-2 text-right ${(margemContribuicaoPctRealizado - margemContribuicaoPctOrcado) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {(margemContribuicaoPctRealizado - margemContribuicaoPctOrcado).toFixed(1)} p.p.
              </td>
              <td className="p-2 text-right text-gray-400">-</td>
              <td className="p-2 text-center">
                {margemContribuicaoPctRealizado >= margemContribuicaoPctOrcado
                  ? <TrendingUp className="text-green-500 mx-auto" size={16} />
                  : <TrendingDown className="text-red-500 mx-auto" size={16} />
                }
              </td>
            </tr>

            {/* Custos Fixos */}
            {renderCategoriaHierarquica('custos_fixos', CATEGORIAS_CONFIG.custos_fixos)}

            {/* (=) Resultado Operacional (linha calculada) */}
            <tr className="bg-cyan-50 font-semibold border-y-2 border-cyan-200">
              <td className="p-2 text-cyan-800">(=) Resultado Operacional</td>
              <td className={`p-2 text-right ${resultadoOperacionalOrcado >= 0 ? 'text-cyan-800' : 'text-red-700'}`}>
                {formatCurrency(resultadoOperacionalOrcado)}
              </td>
              <td className={`p-2 text-right ${resultadoOperacionalRealizado >= 0 ? 'text-cyan-800' : 'text-red-700'}`}>
                {formatCurrency(resultadoOperacionalRealizado)}
              </td>
              <td className={`p-2 text-right ${(resultadoOperacionalRealizado - resultadoOperacionalOrcado) >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                {formatCurrency(resultadoOperacionalRealizado - resultadoOperacionalOrcado)}
              </td>
              <td className={`p-2 text-right ${resultadoOperacionalRealizado >= resultadoOperacionalOrcado ? 'text-green-700' : 'text-red-700'}`}>
                {formatPercent(resultadoOperacionalOrcado !== 0 ? ((resultadoOperacionalRealizado - resultadoOperacionalOrcado) / Math.abs(resultadoOperacionalOrcado)) * 100 : 0)}
              </td>
              <td className="p-2 text-center">
                {resultadoOperacionalRealizado >= resultadoOperacionalOrcado
                  ? <TrendingUp className="text-green-500 mx-auto" size={16} />
                  : <TrendingDown className="text-red-500 mx-auto" size={16} />
                }
              </td>
            </tr>

            {/* Resultado Não Operacional (valor líquido: receitas - despesas) */}
            {renderCategoriaHierarquica('resultado_nao_operacional', CATEGORIAS_CONFIG.resultado_nao_operacional)}

            {/* Linha de Lucro Líquido */}
            <tr className="bg-green-100 font-bold border-t-2 border-green-300">
              <td className="p-2 text-green-900">(=) Lucro Líquido</td>
              <td className={`p-2 text-right ${resultadoOrcado >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                {formatCurrency(resultadoOrcado)}
              </td>
              <td className={`p-2 text-right ${resultadoRealizado >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                {formatCurrency(resultadoRealizado)}
              </td>
              <td className={`p-2 text-right ${resultadoRealizado - resultadoOrcado >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                {formatCurrency(resultadoRealizado - resultadoOrcado)}
              </td>
              <td className={`p-2 text-right ${resultadoRealizado >= resultadoOrcado ? 'text-green-800' : 'text-red-700'}`}>
                {formatPercent(resultadoOrcado !== 0 ? ((resultadoRealizado - resultadoOrcado) / Math.abs(resultadoOrcado)) * 100 : 0)}
              </td>
              <td className="p-2 text-center">
                {resultadoRealizado >= resultadoOrcado 
                  ? <TrendingUp className="text-green-500 mx-auto" size={16} />
                  : <TrendingDown className="text-red-500 mx-auto" size={16} />
                }
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-3 text-xs">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-1">
            <TrendingUp className="text-green-500" size={14} />
            <span>Favorável</span>
          </div>
          <div className="flex items-center gap-1">
            <TrendingDown className="text-red-500" size={14} />
            <span>Desfavorável</span>
          </div>
          <div className="flex items-center gap-1">
            <Minus className="text-gray-400" size={14} />
            <span>Neutro (±5%)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
