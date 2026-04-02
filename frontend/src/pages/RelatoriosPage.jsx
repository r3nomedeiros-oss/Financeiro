import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { movimentacoesAPI, planoContasAPI } from '../services/api';
import { Download, Filter, Eye, EyeOff, ChevronDown, ChevronRight, ChevronsDown, ChevronsUp, FileSpreadsheet } from 'lucide-react';

// Lazy load de bibliotecas pesadas para PDF/Excel
const loadPdfLibs = () => Promise.all([
  import('jspdf'),
  import('jspdf-autotable')
]);

// Categorias fixas do DRE
const CATEGORIAS_CONFIG = {
  receita_bruta: { label: "(+) Receita Bruta", tipo: "receita", cor: "cyan", rgbHeader: [224, 247, 250], rgbText: [6, 148, 162] },
  deducoes_vendas: { label: "(-) Deduções Sobre Vendas", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_variaveis: { label: "(-) Custos Variáveis", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_fixos: { label: "(-) Custos Fixos", tipo: "despesa", cor: "red", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  resultado_nao_operacional: { label: "Resultado Não Operacional", tipo: "misto", cor: "gray", rgbHeader: [243, 244, 246], rgbText: [55, 65, 81] },
};

export default function RelatoriosPage() {
  const [loading, setLoading] = useState(false);
  const [hierarquia, setHierarquia] = useState({});
  const [expandedState, setExpandedState] = useState({});
  
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
      
      // Inicializar expansão
      const initialExpanded = {};
      Object.keys(res.data || {}).forEach(catId => {
        initialExpanded[catId] = { expanded: true, subcategorias: {} };
        (res.data[catId]?.subcategorias || []).forEach(sub => {
          initialExpanded[catId].subcategorias[sub.id] = true;
        });
      });
      setExpandedState(initialExpanded);
    } catch (error) {
      console.error('Erro ao carregar hierarquia:', error);
    }
  };

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
    if (value === null || value === undefined) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || isNaN(value) || !isFinite(value)) return '-';
    const prefix = value > 0 ? '+' : '';
    return `${prefix}${value.toFixed(1)}%`;
  };

  // Calcular valores por item
  const getValores = useCallback((itemId) => {
    const valor1 = dadosPeriodo1
      .filter(m => m.plano_contas_id === itemId)
      .reduce((acc, m) => acc + m.valor, 0);
    
    const valor2 = dadosPeriodo2
      .filter(m => m.plano_contas_id === itemId)
      .reduce((acc, m) => acc + m.valor, 0);
    
    return { valor1, valor2 };
  }, [dadosPeriodo1, dadosPeriodo2]);

  // Calcular totais da categoria
  const calcularTotaisCategoria = useCallback((catId) => {
    const cat = hierarquia[catId];
    if (!cat) return { valor1: 0, valor2: 0 };
    
    let valor1 = 0;
    let valor2 = 0;
    
    (cat.subcategorias || []).forEach(sub => {
      (sub.itens || []).forEach(item => {
        const valores = getValores(item.id);
        valor1 += valores.valor1;
        valor2 += valores.valor2;
      });
      
      if (!sub.itens || sub.itens.length === 0) {
        const valores = getValores(sub.id);
        valor1 += valores.valor1;
        valor2 += valores.valor2;
      }
    });
    
    return { valor1, valor2 };
  }, [hierarquia, getValores]);

  // Totais gerais
  const totaisReceitas = useMemo(() => calcularTotaisCategoria('receita_bruta'), [calcularTotaisCategoria]);
  
  const totaisDespesas = useMemo(() => {
    const deducoes = calcularTotaisCategoria('deducoes_vendas');
    const variaveis = calcularTotaisCategoria('custos_variaveis');
    const fixos = calcularTotaisCategoria('custos_fixos');
    const naoOp = calcularTotaisCategoria('resultado_nao_operacional');
    
    return {
      valor1: deducoes.valor1 + variaveis.valor1 + fixos.valor1 + naoOp.valor1,
      valor2: deducoes.valor2 + variaveis.valor2 + fixos.valor2 + naoOp.valor2
    };
  }, [calcularTotaisCategoria]);

  const resultado1 = totaisReceitas.valor1 - totaisDespesas.valor1;
  const resultado2 = totaisReceitas.valor2 - totaisDespesas.valor2;

  // Análise Vertical (AV) - % sobre receita total
  const calcularAV = (valor, totalReceita) => {
    if (!totalReceita || totalReceita === 0) return 0;
    return (valor / totalReceita) * 100;
  };

  // Análise Horizontal (AH) - variação entre períodos
  // Fórmula: AH = [(Valor Período 2 / Valor Período 1) - 1] × 100
  // Período 1 é a base, Período 2 é o atual
  const calcularAH = (valorPeriodo2, valorPeriodo1) => {
    if (!valorPeriodo1 || valorPeriodo1 === 0) {
      return valorPeriodo2 > 0 ? 100 : (valorPeriodo2 < 0 ? -100 : 0);
    }
    return ((valorPeriodo2 / valorPeriodo1) - 1) * 100;
  };

  const formatarPeriodo = (inicio, fim) => {
    const di = new Date(inicio + 'T00:00:00');
    const df = new Date(fim + 'T00:00:00');
    return `${di.toLocaleDateString('pt-BR')} - ${df.toLocaleDateString('pt-BR')}`;
  };

  const getCorClasse = (cor, isHeader = false) => {
    const cores = {
      cyan: isHeader ? 'bg-cyan-50 text-cyan-700' : 'text-cyan-700',
      red: isHeader ? 'bg-red-50 text-red-600' : 'text-red-600',
      gray: isHeader ? 'bg-gray-100 text-gray-800' : 'text-gray-800',
    };
    return cores[cor] || '';
  };

  // Exportar Excel COM CORES
  const exportToExcel = () => {
    const rows = [];
    const headers = ['Descrição', 'Período 1'];
    if (mostrarAV) headers.push('AV%');
    headers.push('Período 2');
    if (mostrarAV) headers.push('AV%');
    if (mostrarAH) headers.push('AH%');
    
    rows.push(headers.join(';'));
    
    Object.entries(CATEGORIAS_CONFIG).forEach(([catId, config]) => {
      const totais = calcularTotaisCategoria(catId);
      const row = [config.label, totais.valor1.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')];
      if (mostrarAV) row.push(calcularAV(totais.valor1, totaisReceitas.valor1).toFixed(1).replace('.', ',') + '%');
      row.push(totais.valor2.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'));
      if (mostrarAV) row.push(calcularAV(totais.valor2, totaisReceitas.valor2).toFixed(1).replace('.', ',') + '%');
      if (mostrarAH) row.push(calcularAH(totais.valor2, totais.valor1).toFixed(1).replace('.', ',') + '%');
      rows.push(row.join(';'));
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          const valores = getValores(sub.id);
          if (valores.valor1 > 0 || valores.valor2 > 0) {
            const row = ['  ' + sub.nome, valores.valor1.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')];
            if (mostrarAV) row.push(calcularAV(valores.valor1, totaisReceitas.valor1).toFixed(1).replace('.', ',') + '%');
            row.push(valores.valor2.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'));
            if (mostrarAV) row.push(calcularAV(valores.valor2, totaisReceitas.valor2).toFixed(1).replace('.', ',') + '%');
            if (mostrarAH) row.push(calcularAH(valores.valor2, valores.valor1).toFixed(1).replace('.', ',') + '%');
            rows.push(row.join(';'));
          }
        } else {
          itens.forEach(item => {
            const valores = getValores(item.id);
            if (valores.valor1 > 0 || valores.valor2 > 0) {
              const row = ['    ' + item.nome, valores.valor1.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')];
              if (mostrarAV) row.push(calcularAV(valores.valor1, totaisReceitas.valor1).toFixed(1).replace('.', ',') + '%');
              row.push(valores.valor2.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'));
              if (mostrarAV) row.push(calcularAV(valores.valor2, totaisReceitas.valor2).toFixed(1).replace('.', ',') + '%');
              if (mostrarAH) row.push(calcularAH(valores.valor2, valores.valor1).toFixed(1).replace('.', ',') + '%');
              rows.push(row.join(';'));
            }
          });
        }
      });
    });
    
    const rowResult = ['RESULTADO', resultado1.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')];
    if (mostrarAV) rowResult.push(calcularAV(resultado1, totaisReceitas.valor1).toFixed(1).replace('.', ',') + '%');
    rowResult.push(resultado2.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'));
    if (mostrarAV) rowResult.push(calcularAV(resultado2, totaisReceitas.valor2).toFixed(1).replace('.', ',') + '%');
    if (mostrarAH) rowResult.push(calcularAH(resultado2, resultado1).toFixed(1).replace('.', ',') + '%');
    rows.push(rowResult.join(';'));
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Comparativo_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Exportar PDF COM CORES - Lazy loaded
  const exportToPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await loadPdfLibs();
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.text('Relatório Comparativo', doc.internal.pageSize.width / 2, 12, { align: 'center' });
    doc.setFontSize(9);
    doc.text(`Período 1: ${formatarPeriodo(periodo1Inicio, periodo1Fim)} | Período 2: ${formatarPeriodo(periodo2Inicio, periodo2Fim)}`, doc.internal.pageSize.width / 2, 18, { align: 'center' });
    
    const headers = ['Descrição', 'Período 1'];
    if (mostrarAV) headers.push('AV%');
    headers.push('Período 2');
    if (mostrarAV) headers.push('AV%');
    if (mostrarAH) headers.push('AH%');
    
    const body = [];
    
    Object.entries(CATEGORIAS_CONFIG).forEach(([catId, config]) => {
      const totais = calcularTotaisCategoria(catId);
      const ah = calcularAH(totais.valor2, totais.valor1);
      
      const row = [
        { content: config.label, styles: { fontStyle: 'bold', fillColor: config.rgbHeader, textColor: config.rgbText } },
        { content: formatCurrency(totais.valor1), styles: { halign: 'right', fontStyle: 'bold', fillColor: config.rgbHeader } }
      ];
      if (mostrarAV) row.push({ content: formatPercent(calcularAV(totais.valor1, totaisReceitas.valor1)), styles: { halign: 'right', fillColor: [220, 252, 231] } });
      row.push({ content: formatCurrency(totais.valor2), styles: { halign: 'right', fontStyle: 'bold', fillColor: config.rgbHeader } });
      if (mostrarAV) row.push({ content: formatPercent(calcularAV(totais.valor2, totaisReceitas.valor2)), styles: { halign: 'right', fillColor: [220, 252, 231] } });
      if (mostrarAH) row.push({ content: formatPercent(ah), styles: { halign: 'right', fillColor: [243, 232, 255], textColor: ah >= 0 ? [22, 163, 74] : [220, 38, 38] } });
      body.push(row);
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          const valores = getValores(sub.id);
          if (valores.valor1 > 0 || valores.valor2 > 0) {
            const ahItem = calcularAH(valores.valor2, valores.valor1);
            const rowItem = [
              { content: '  ' + sub.nome },
              { content: formatCurrency(valores.valor1), styles: { halign: 'right' } }
            ];
            if (mostrarAV) rowItem.push({ content: formatPercent(calcularAV(valores.valor1, totaisReceitas.valor1)), styles: { halign: 'right', fillColor: [220, 252, 231], fontSize: 7 } });
            rowItem.push({ content: formatCurrency(valores.valor2), styles: { halign: 'right' } });
            if (mostrarAV) rowItem.push({ content: formatPercent(calcularAV(valores.valor2, totaisReceitas.valor2)), styles: { halign: 'right', fillColor: [220, 252, 231], fontSize: 7 } });
            if (mostrarAH) rowItem.push({ content: formatPercent(ahItem), styles: { halign: 'right', textColor: ahItem >= 0 ? [22, 163, 74] : [220, 38, 38], fontSize: 7 } });
            body.push(rowItem);
          }
        } else {
          itens.forEach(item => {
            const valores = getValores(item.id);
            if (valores.valor1 > 0 || valores.valor2 > 0) {
              const ahItem = calcularAH(valores.valor2, valores.valor1);
              const rowItem = [
                { content: '    ' + item.nome },
                { content: formatCurrency(valores.valor1), styles: { halign: 'right' } }
              ];
              if (mostrarAV) rowItem.push({ content: formatPercent(calcularAV(valores.valor1, totaisReceitas.valor1)), styles: { halign: 'right', fillColor: [220, 252, 231], fontSize: 7 } });
              rowItem.push({ content: formatCurrency(valores.valor2), styles: { halign: 'right' } });
              if (mostrarAV) rowItem.push({ content: formatPercent(calcularAV(valores.valor2, totaisReceitas.valor2)), styles: { halign: 'right', fillColor: [220, 252, 231], fontSize: 7 } });
              if (mostrarAH) rowItem.push({ content: formatPercent(ahItem), styles: { halign: 'right', textColor: ahItem >= 0 ? [22, 163, 74] : [220, 38, 38], fontSize: 7 } });
              body.push(rowItem);
            }
          });
        }
      });
    });
    
    // Resultado
    const ahResultado = calcularAH(resultado2, resultado1);
    const rowResult = [
      { content: 'RESULTADO', styles: { fontStyle: 'bold', fillColor: [200, 200, 200] } },
      { content: formatCurrency(resultado1), styles: { halign: 'right', fontStyle: 'bold', fillColor: [200, 200, 200], textColor: resultado1 >= 0 ? [22, 163, 74] : [220, 38, 38] } }
    ];
    if (mostrarAV) rowResult.push({ content: formatPercent(calcularAV(resultado1, totaisReceitas.valor1)), styles: { halign: 'right', fillColor: [200, 200, 200] } });
    rowResult.push({ content: formatCurrency(resultado2), styles: { halign: 'right', fontStyle: 'bold', fillColor: [200, 200, 200], textColor: resultado2 >= 0 ? [22, 163, 74] : [220, 38, 38] } });
    if (mostrarAV) rowResult.push({ content: formatPercent(calcularAV(resultado2, totaisReceitas.valor2)), styles: { halign: 'right', fillColor: [200, 200, 200] } });
    if (mostrarAH) rowResult.push({ content: formatPercent(ahResultado), styles: { halign: 'right', fillColor: [200, 200, 200], textColor: ahResultado >= 0 ? [22, 163, 74] : [220, 38, 38] } });
    body.push(rowResult);
    
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 22,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 60 } },
    });
    
    doc.save(`Relatorio_Comparativo_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const temDados = dadosPeriodo1.length > 0 || dadosPeriodo2.length > 0;

  // Renderizar linha de item
  const renderItemRow = (item, nivel = 2) => {
    const valores = getValores(item.id);
    if (valores.valor1 === 0 && valores.valor2 === 0) return null;
    
    const paddingLeft = nivel === 2 ? 'pl-8' : 'pl-14';
    const ah = calcularAH(valores.valor2, valores.valor1);
    
    return (
      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
        <td className={`p-2 ${paddingLeft} text-sm`}>
          {nivel === 3 ? '• ' : ''}{item.nome}
        </td>
        <td className="p-2 text-right text-sm">{formatCurrency(valores.valor1)}</td>
        {mostrarAV && <td className="p-2 text-right text-xs text-green-600 bg-green-50">{formatPercent(calcularAV(valores.valor1, totaisReceitas.valor1))}</td>}
        <td className="p-2 text-right text-sm">{formatCurrency(valores.valor2)}</td>
        {mostrarAV && <td className="p-2 text-right text-xs text-green-600 bg-green-50">{formatPercent(calcularAV(valores.valor2, totaisReceitas.valor2))}</td>}
        {mostrarAH && <td className={`p-2 text-right text-xs bg-purple-50 ${ah >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(ah)}</td>}
      </tr>
    );
  };

  // Renderizar categoria hierárquica
  const renderCategoriaHierarquica = (catId, config) => {
    const cat = hierarquia[catId];
    const isExpanded = expandedState[catId]?.expanded;
    const subcategorias = cat?.subcategorias || [];
    const totais = calcularTotaisCategoria(catId);
    const ah = calcularAH(totais.valor2, totais.valor1);

    return (
      <React.Fragment key={catId}>
        <tr 
          className={`${getCorClasse(config.cor, true)} border-b border-gray-200 cursor-pointer hover:opacity-90`}
          onClick={() => toggleCategoria(catId)}
        >
          <td className="p-2 font-semibold">
            <div className="flex items-center gap-2">
              {subcategorias.length > 0 && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
              {config.label}
            </div>
          </td>
          <td className="p-2 text-right font-semibold">{formatCurrency(totais.valor1)}</td>
          {mostrarAV && <td className="p-2 text-right text-sm text-green-600 bg-green-50">{formatPercent(calcularAV(totais.valor1, totaisReceitas.valor1))}</td>}
          <td className="p-2 text-right font-semibold">{formatCurrency(totais.valor2)}</td>
          {mostrarAV && <td className="p-2 text-right text-sm text-green-600 bg-green-50">{formatPercent(calcularAV(totais.valor2, totaisReceitas.valor2))}</td>}
          {mostrarAH && <td className={`p-2 text-right font-semibold bg-purple-50 ${ah >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(ah)}</td>}
        </tr>

        {isExpanded && subcategorias.map(sub => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[sub.id];
          const itens = sub.itens || [];
          const hasItens = itens.length > 0;

          // Calcular totais da subcategoria
          let subValor1 = 0, subValor2 = 0;
          if (hasItens) {
            itens.forEach(item => {
              const v = getValores(item.id);
              subValor1 += v.valor1;
              subValor2 += v.valor2;
            });
          } else {
            const v = getValores(sub.id);
            subValor1 = v.valor1;
            subValor2 = v.valor2;
          }
          
          if (subValor1 === 0 && subValor2 === 0) return null;
          
          const subAh = calcularAH(subValor2, subValor1);

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
                <td className="p-2 text-right text-sm">{formatCurrency(subValor1)}</td>
                {mostrarAV && <td className="p-2 text-right text-xs text-green-600 bg-green-50">{formatPercent(calcularAV(subValor1, totaisReceitas.valor1))}</td>}
                <td className="p-2 text-right text-sm">{formatCurrency(subValor2)}</td>
                {mostrarAV && <td className="p-2 text-right text-xs text-green-600 bg-green-50">{formatPercent(calcularAV(subValor2, totaisReceitas.valor2))}</td>}
                {mostrarAH && <td className={`p-2 text-right text-xs bg-purple-50 ${subAh >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatPercent(subAh)}</td>}
              </tr>

              {isSubExpanded && hasItens && itens.map(item => renderItemRow(item, 3))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4" data-testid="relatorios-page">
      {/* Header Fixo */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-4 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Relatórios Comparativos</h1>
            <p className="text-gray-600 text-sm">Compare períodos com análise vertical e horizontal</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={expandirTudo} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" title="Expandir Tudo">
              <ChevronsDown size={16} />
            </button>
            <button onClick={recolherTudo} className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200" title="Recolher Tudo">
              <ChevronsUp size={16} />
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

            <button onClick={exportToExcel} disabled={!temDados} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              <FileSpreadsheet size={16} />
            </button>
            <button onClick={exportToPDF} disabled={!temDados} className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">
              <Download size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="grid grid-cols-2 gap-4">
          {/* Período 1 */}
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-800 text-sm">Período 1 (Atual)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={periodo1Inicio} onChange={(e) => setPeriodo1Inicio(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="date" value={periodo1Fim} onChange={(e) => setPeriodo1Fim(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
          </div>

          {/* Período 2 */}
          <div className="space-y-2 p-3 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-700 text-sm">Período 2 (Comparação)</h4>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={periodo2Inicio} onChange={(e) => setPeriodo2Inicio(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
              <input type="date" value={periodo2Fim} onChange={(e) => setPeriodo2Fim(e.target.value)} className="w-full px-2 py-1 border rounded text-sm" />
            </div>
          </div>
        </div>

        <div className="flex justify-between items-center mt-3 pt-3 border-t">
          <div className="flex gap-2">
            <button onClick={() => setMostrarAV(!mostrarAV)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${mostrarAV ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {mostrarAV ? <Eye size={14} /> : <EyeOff size={14} />} AV%
            </button>
            <button onClick={() => setMostrarAH(!mostrarAH)} className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${mostrarAH ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'}`}>
              {mostrarAH ? <Eye size={14} /> : <EyeOff size={14} />} AH%
            </button>
          </div>

          <button onClick={compararPeriodos} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm">
            {loading ? 'Carregando...' : 'Comparar'}
          </button>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex items-center justify-center h-48 bg-white rounded-lg shadow">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : temDados ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-blue-600 text-white sticky top-0">
              <tr>
                <th className="text-left p-2 font-semibold min-w-[200px]">Descrição</th>
                <th className="text-right p-2 font-semibold w-28">Período 1</th>
                {mostrarAV && <th className="text-right p-2 font-semibold w-16 bg-green-600">AV%</th>}
                <th className="text-right p-2 font-semibold w-28">Período 2</th>
                {mostrarAV && <th className="text-right p-2 font-semibold w-16 bg-green-600">AV%</th>}
                {mostrarAH && <th className="text-right p-2 font-semibold w-16 bg-purple-600">AH%</th>}
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORIAS_CONFIG).map(([catId, config]) => 
                renderCategoriaHierarquica(catId, config)
              )}

              {/* Resultado */}
              <tr className="bg-gray-200 font-bold">
                <td className="p-2">RESULTADO</td>
                <td className={`p-2 text-right ${resultado1 >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(resultado1)}</td>
                {mostrarAV && <td className="p-2 text-right bg-green-100">{formatPercent(calcularAV(resultado1, totaisReceitas.valor1))}</td>}
                <td className={`p-2 text-right ${resultado2 >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(resultado2)}</td>
                {mostrarAV && <td className="p-2 text-right bg-green-100">{formatPercent(calcularAV(resultado2, totaisReceitas.valor2))}</td>}
                {mostrarAH && <td className={`p-2 text-right bg-purple-100 ${calcularAH(resultado2, resultado1) >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatPercent(calcularAH(resultado2, resultado1))}</td>}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <p className="text-lg">Clique em "Comparar" para visualizar o relatório</p>
        </div>
      )}
    </div>
  );
}
