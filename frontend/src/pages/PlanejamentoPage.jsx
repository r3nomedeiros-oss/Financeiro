import React, { useState, useEffect, useMemo, useCallback, lazy, Suspense } from 'react';
import { planejamentoAPI, planoContasAPI, invalidateCache } from '../services/api';
import { Save, Copy, ChevronDown, ChevronRight, Download, FileSpreadsheet, Check, X, ChevronsDown, ChevronsUp } from 'lucide-react';

// Lazy load de bibliotecas pesadas para PDF/Excel
const loadPdfLibs = () => Promise.all([
  import('jspdf'),
  import('jspdf-autotable')
]);

// Labels dos meses
const MESES = [
  { key: 'janeiro', label: 'Jan', num: 1 },
  { key: 'fevereiro', label: 'Fev', num: 2 },
  { key: 'marco', label: 'Mar', num: 3 },
  { key: 'abril', label: 'Abr', num: 4 },
  { key: 'maio', label: 'Mai', num: 5 },
  { key: 'junho', label: 'Jun', num: 6 },
  { key: 'julho', label: 'Jul', num: 7 },
  { key: 'agosto', label: 'Ago', num: 8 },
  { key: 'setembro', label: 'Set', num: 9 },
  { key: 'outubro', label: 'Out', num: 10 },
  { key: 'novembro', label: 'Nov', num: 11 },
  { key: 'dezembro', label: 'Dez', num: 12 },
];

// Skeleton Loader para carregamento mais suave (fora do componente)
const SkeletonRow = () => (
  <tr className="animate-pulse">
    <td className="p-2 sticky left-0 bg-white"><div className="h-4 bg-gray-200 rounded w-32"></div></td>
    {MESES.map(m => <td key={m.key} className="p-1"><div className="h-4 bg-gray-100 rounded w-14 ml-auto"></div></td>)}
    <td className="p-2 bg-gray-50"><div className="h-4 bg-gray-200 rounded w-16 ml-auto"></div></td>
  </tr>
);

// Categorias fixas do DRE com cores para PDF
const CATEGORIAS_CONFIG = {
  receita_bruta: { label: "(+) Receita Bruta", cor: "cyan", tipo: "positivo", rgbHeader: [224, 247, 250], rgbText: [6, 148, 162] },
  deducoes_vendas: { label: "(-) Deduções Sobre Vendas", cor: "red", tipo: "negativo", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_variaveis: { label: "(-) Custos Variáveis", cor: "red", tipo: "negativo", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  custos_fixos: { label: "(-) Custos Fixos", cor: "red", tipo: "negativo", rgbHeader: [254, 226, 226], rgbText: [185, 28, 28] },
  resultado_nao_operacional: { label: "Resultado Não Operacional", cor: "gray", tipo: "misto", rgbHeader: [243, 244, 246], rgbText: [55, 65, 81] },
};

export default function PlanejamentoPage() {
  const [hierarquia, setHierarquia] = useState({});
  const [planejamentos, setPlanejamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  
  // Estado de expansão das categorias e subcategorias
  const [expandedState, setExpandedState] = useState({});
  
  // Estado para edição inline
  const [editingCell, setEditingCell] = useState(null);
  const [editValue, setEditValue] = useState('');
  
  // Estado para "Aplicar a todos os meses"
  const [showApplyAllModal, setShowApplyAllModal] = useState(false);
  const [applyAllData, setApplyAllData] = useState({ itemId: '', itemNome: '', valor: '' });
  
  // Alterações pendentes
  const [pendingChanges, setPendingChanges] = useState({});

  // Debug: log pending changes
  useEffect(() => {
    if (Object.keys(pendingChanges).length > 0) {
      console.log('Pending changes:', pendingChanges);
    }
  }, [pendingChanges]);

  useEffect(() => {
    carregarDados();
  }, [ano]);

  const carregarDados = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const [hierRes, planRes] = await Promise.all([
        planoContasAPI.getHierarquico(),
        planejamentoAPI.getAll({ ano }),
      ]);
      
      setHierarquia(hierRes.data);
      setPlanejamentos(planRes.data);
      
      // Inicializar estado de expansão - todas expandidas
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

  // Criar mapa de valores planejados
  const valoresMap = useMemo(() => {
    const map = {};
    planejamentos.forEach(p => {
      if (!map[p.plano_contas_id]) {
        map[p.plano_contas_id] = { planejamentos: {} };
      }
      map[p.plano_contas_id].planejamentos[p.mes] = { id: p.id, valor: p.valor_planejado };
    });
    return map;
  }, [planejamentos]);

  // Obter valor (considerando pendingChanges)
  const getValor = useCallback((itemId, mes) => {
    const pendingKey = `${itemId}-${mes}`;
    if (pendingChanges[pendingKey] !== undefined) {
      return pendingChanges[pendingKey];
    }
    return valoresMap[itemId]?.planejamentos[mes]?.valor || 0;
  }, [valoresMap, pendingChanges]);

  // Toggle expansão
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

  // Formatação
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Edição inline
  const startEdit = (itemId, mes, currentValue) => {
    setEditingCell({ itemId, mes });
    setEditValue(currentValue > 0 ? currentValue.toString() : '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const confirmEdit = () => {
    if (!editingCell) return;
    
    const valorLimpo = editValue.replace(/[^\d,.-]/g, '').replace(',', '.');
    const valor = parseFloat(valorLimpo) || 0;
    const pendingKey = `${editingCell.itemId}-${editingCell.mes}`;
    
    setPendingChanges(prev => ({
      ...prev,
      [pendingKey]: valor
    }));
    
    setEditingCell(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter') {
      confirmEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  // Aplicar valor a todos os meses
  const openApplyAllModal = (itemId, itemNome) => {
    setApplyAllData({ itemId, itemNome, valor: '' });
    setShowApplyAllModal(true);
  };

  const confirmApplyAll = () => {
    const valorLimpo = applyAllData.valor.replace(/[^\d,.-]/g, '').replace(',', '.');
    const valor = parseFloat(valorLimpo) || 0;
    const newChanges = { ...pendingChanges };
    
    MESES.forEach(mes => {
      const pendingKey = `${applyAllData.itemId}-${mes.num}`;
      newChanges[pendingKey] = valor;
    });
    
    setPendingChanges(newChanges);
    setShowApplyAllModal(false);
    setApplyAllData({ itemId: '', itemNome: '', valor: '' });
  };

  const getValorAnualModal = () => {
    const valorLimpo = applyAllData.valor.replace(/[^\d,.-]/g, '').replace(',', '.');
    const valor = parseFloat(valorLimpo) || 0;
    return valor * 12;
  };

  // Salvar alterações - BATCH (muito mais rápido)
  const salvarAlteracoes = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    setSaving(true);
    try {
      // Construir array de items para batch
      const batchItems = [];
      
      for (const [key, valor] of Object.entries(pendingChanges)) {
        const lastDashIndex = key.lastIndexOf('-');
        const itemId = key.substring(0, lastDashIndex);
        const mes = parseInt(key.substring(lastDashIndex + 1));
        
        batchItems.push({
          plano_contas_id: itemId,
          mes,
          ano,
          valor_planejado: valor
        });
      }
      
      // Uma única chamada API ao invés de dezenas
      await planejamentoAPI.batch(batchItems);
      
      // Limpar cache antes de recarregar para garantir dados frescos
      invalidateCache('/api/planejamento');
      
      // Recarregar dados ANTES de limpar pendingChanges para manter valores visíveis
      await carregarDados(false);
      setPendingChanges({});
      alert('Alterações salvas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar:', error);
      let errorMsg = 'Erro desconhecido';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      }
      alert('Erro ao salvar: ' + errorMsg);
    } finally {
      setSaving(false);
    }
  };

  // Calcular totais
  const calcularTotalLinha = useCallback((itemId) => {
    let total = 0;
    MESES.forEach(mes => {
      total += getValor(itemId, mes.num);
    });
    return total;
  }, [getValor]);

  const calcularTotalCategoria = useCallback((catId) => {
    const cat = hierarquia[catId];
    if (!cat) return { meses: {}, total: 0 };
    
    const totais = { meses: {}, total: 0 };
    MESES.forEach(mes => {
      totais.meses[mes.num] = 0;
    });
    
    (cat.subcategorias || []).forEach(sub => {
      (sub.itens || []).forEach(item => {
        MESES.forEach(mes => {
          const valor = getValor(item.id, mes.num);
          totais.meses[mes.num] += valor;
          totais.total += valor;
        });
      });
      
      if (!sub.itens || sub.itens.length === 0) {
        MESES.forEach(mes => {
          const valor = getValor(sub.id, mes.num);
          totais.meses[mes.num] += valor;
          totais.total += valor;
        });
      }
    });
    
    return totais;
  }, [hierarquia, getValor]);

  // Calcular resultado total (Receitas - Despesas)
  const calcularResultado = useMemo(() => {
    const receitas = calcularTotalCategoria('receita_bruta');
    const deducoes = calcularTotalCategoria('deducoes_vendas');
    const variaveis = calcularTotalCategoria('custos_variaveis');
    const fixos = calcularTotalCategoria('custos_fixos');
    const naoOp = calcularTotalCategoria('resultado_nao_operacional');
    
    const resultado = { meses: {}, total: 0 };
    MESES.forEach(mes => {
      const receitaMes = receitas.meses[mes.num] || 0;
      const despesasMes = (deducoes.meses[mes.num] || 0) + 
                          (variaveis.meses[mes.num] || 0) + 
                          (fixos.meses[mes.num] || 0) + 
                          (naoOp.meses[mes.num] || 0);
      resultado.meses[mes.num] = receitaMes - despesasMes;
    });
    resultado.total = receitas.total - deducoes.total - variaveis.total - fixos.total - naoOp.total;
    return resultado;
  }, [calcularTotalCategoria]);

  // Cores
  const getCorClasse = (cor, isHeader = false) => {
    const cores = {
      cyan: isHeader ? 'bg-cyan-50 text-cyan-700' : 'text-cyan-700',
      red: isHeader ? 'bg-red-50 text-red-600' : 'text-red-600',
      gray: isHeader ? 'bg-gray-100 text-gray-800' : 'text-gray-800',
    };
    return cores[cor] || '';
  };

  // Exportar Excel
  const exportToExcel = () => {
    const rows = [];
    rows.push(['Descrição', ...MESES.map(m => m.label), 'Total'].join(';'));
    
    Object.entries(CATEGORIAS_CONFIG).forEach(([catId, config]) => {
      const totais = calcularTotalCategoria(catId);
      rows.push([
        config.label,
        ...MESES.map(m => (totais.meses[m.num] || 0).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')),
        totais.total.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')
      ].join(';'));
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          rows.push([
            '  ' + sub.nome,
            ...MESES.map(m => getValor(sub.id, m.num).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')),
            calcularTotalLinha(sub.id).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')
          ].join(';'));
        } else {
          itens.forEach(item => {
            rows.push([
              '  ' + sub.nome + ' > ' + item.nome,
              ...MESES.map(m => getValor(item.id, m.num).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')),
              calcularTotalLinha(item.id).toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')
            ].join(';'));
          });
        }
      });
    });
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Planejamento_${ano}.csv`;
    link.click();
  };

  // Exportar PDF COM CORES - Lazy loaded
  const exportToPDF = async () => {
    const [{ default: jsPDF }, { default: autoTable }] = await loadPdfLibs();
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.text(`Planejamento Orçamentário - ${ano}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    const headers = ['Descrição', ...MESES.map(m => m.label), 'Total'];
    const body = [];
    
    Object.entries(CATEGORIAS_CONFIG).forEach(([catId, config]) => {
      const totais = calcularTotalCategoria(catId);
      
      // Linha da categoria com cor
      const catRow = [
        { content: config.label, styles: { fontStyle: 'bold', fillColor: config.rgbHeader, textColor: config.rgbText } },
        ...MESES.map(m => ({ content: formatCurrency(totais.meses[m.num] || 0), styles: { halign: 'right', fontStyle: 'bold', fillColor: config.rgbHeader } })),
        { content: formatCurrency(totais.total), styles: { halign: 'right', fontStyle: 'bold', fillColor: [200, 200, 200] } }
      ];
      body.push(catRow);
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          const valor = calcularTotalLinha(sub.id);
          if (valor > 0) {
            body.push([
              { content: '  ' + sub.nome },
              ...MESES.map(m => ({ content: formatCurrency(getValor(sub.id, m.num)), styles: { halign: 'right' } })),
              { content: formatCurrency(valor), styles: { halign: 'right', fillColor: [240, 240, 240] } }
            ]);
          }
        } else {
          itens.forEach(item => {
            const valor = calcularTotalLinha(item.id);
            if (valor > 0) {
              body.push([
                { content: '    ' + item.nome },
                ...MESES.map(m => ({ content: formatCurrency(getValor(item.id, m.num)), styles: { halign: 'right' } })),
                { content: formatCurrency(valor), styles: { halign: 'right', fillColor: [240, 240, 240] } }
              ]);
            }
          });
        }
      });
    });
    
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 22,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 } },
    });
    
    doc.save(`Planejamento_${ano}.pdf`);
  };

  if (loading && Object.keys(hierarquia).length === 0) {
    return (
      <div className="space-y-4" data-testid="planejamento-page">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Planejamento Orçamentário</h1>
            <p className="text-gray-600 text-sm">Carregando dados...</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="text-left p-2 sticky left-0 bg-gray-100 min-w-[220px]">Descrição</th>
                {MESES.map(m => <th key={m.key} className="text-right p-2 min-w-[75px]">{m.label}</th>)}
                <th className="text-right p-2 min-w-[90px] bg-gray-200">Total</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(i => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  const hasPendingChanges = Object.keys(pendingChanges).length > 0;

  // Renderizar célula editável
  const renderCell = (itemId, mes, valor) => {
    const isEditing = editingCell?.itemId === itemId && editingCell?.mes === mes.num;
    const pendingKey = `${itemId}-${mes.num}`;
    const isPending = pendingChanges[pendingKey] !== undefined;
    
    if (isEditing) {
      return (
        <td key={mes.key} className="p-1 border-r border-gray-200">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={confirmEdit}
            autoFocus
            className="w-full px-1 py-0.5 text-right text-sm border border-blue-400 rounded focus:outline-none"
            placeholder="0"
          />
        </td>
      );
    }
    
    return (
      <td 
        key={mes.key} 
        className={`p-1 text-right text-sm border-r border-gray-200 cursor-pointer hover:bg-blue-50 ${isPending ? 'bg-yellow-50' : ''}`}
        onClick={() => startEdit(itemId, mes.num, valor)}
      >
        {valor > 0 ? formatCurrency(valor) : '-'}
      </td>
    );
  };

  // Renderizar linha de item
  const renderItemRow = (item, nivel = 2) => {
    const paddingLeft = nivel === 2 ? 'pl-8' : 'pl-14';
    
    return (
      <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
        <td className={`p-2 ${paddingLeft} sticky left-0 bg-white z-10 border-r border-gray-300 text-sm`}>
          <div className="flex items-center justify-between">
            <span className={nivel === 3 ? 'text-gray-600' : ''}>{nivel === 3 ? '• ' : ''}{item.nome}</span>
            <button
              onClick={() => openApplyAllModal(item.id, item.nome)}
              className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
              title="Aplicar para todos os meses"
            >
              <Copy size={14} />
            </button>
          </div>
        </td>
        {MESES.map(mes => renderCell(item.id, mes, getValor(item.id, mes.num)))}
        <td className="p-2 text-right font-semibold bg-gray-50 text-sm">
          {formatCurrency(calcularTotalLinha(item.id))}
        </td>
      </tr>
    );
  };

  // Renderizar categoria hierárquica
  const renderCategoriaHierarquica = (catId, config) => {
    const cat = hierarquia[catId];
    const isExpanded = expandedState[catId]?.expanded;
    const subcategorias = cat?.subcategorias || [];
    const totais = calcularTotalCategoria(catId);

    return (
      <React.Fragment key={catId}>
        <tr 
          className={`${getCorClasse(config.cor, true)} border-b border-gray-200 cursor-pointer hover:opacity-90`}
          onClick={() => toggleCategoria(catId)}
        >
          <td className={`p-2 sticky left-0 z-10 ${getCorClasse(config.cor, true)} font-semibold border-r border-gray-300`}>
            <div className="flex items-center gap-2">
              {subcategorias.length > 0 && (
                isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />
              )}
              {config.label}
            </div>
          </td>
          {MESES.map(mes => (
            <td key={mes.key} className={`p-2 text-right font-semibold ${getCorClasse(config.cor)} border-r border-gray-200 text-sm`}>
              {formatCurrency(totais.meses[mes.num] || 0)}
            </td>
          ))}
          <td className="p-2 text-right font-bold bg-gray-100 text-sm">
            {formatCurrency(totais.total)}
          </td>
        </tr>

        {isExpanded && subcategorias.map(sub => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[sub.id];
          const itens = sub.itens || [];
          const hasItens = itens.length > 0;

          return (
            <React.Fragment key={sub.id}>
              <tr 
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => hasItens && toggleSubcategoria(catId, sub.id)}
              >
                <td className="p-2 pl-6 sticky left-0 bg-white z-10 border-r border-gray-300 text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasItens && (
                        isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />
                      )}
                      {sub.nome}
                    </div>
                    {!hasItens && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openApplyAllModal(sub.id, sub.nome); }}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </td>
                {hasItens ? (
                  <>
                    {MESES.map(mes => {
                      const somaItens = itens.reduce((acc, item) => acc + getValor(item.id, mes.num), 0);
                      return (
                        <td key={mes.key} className="p-2 text-right text-sm border-r border-gray-200 text-gray-500">
                          {somaItens > 0 ? formatCurrency(somaItens) : '-'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-semibold bg-gray-50 text-sm">
                      {formatCurrency(itens.reduce((acc, item) => acc + calcularTotalLinha(item.id), 0))}
                    </td>
                  </>
                ) : (
                  <>
                    {MESES.map(mes => renderCell(sub.id, mes, getValor(sub.id, mes.num)))}
                    <td className="p-2 text-right font-semibold bg-gray-50 text-sm">
                      {formatCurrency(calcularTotalLinha(sub.id))}
                    </td>
                  </>
                )}
              </tr>

              {isSubExpanded && hasItens && itens.map(item => renderItemRow(item, 3))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4" data-testid="planejamento-page">
      {/* Header Fixo */}
      <div className="sticky top-0 z-20 bg-gray-50 pb-4 -mx-6 px-6 -mt-6 pt-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Planejamento Orçamentário</h1>
            <p className="text-gray-600 text-sm">Clique na célula para editar. Digite valores em reais (ex: 100000)</p>
          </div>

          <div className="flex items-center gap-2">
            {hasPendingChanges && (
              <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
                {Object.keys(pendingChanges).length} alterações
              </span>
            )}
            
            <button
              onClick={salvarAlteracoes}
              disabled={!hasPendingChanges || saving}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium ${
                hasPendingChanges 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              <Save size={16} />
              {saving ? 'Salvando...' : 'Salvar'}
            </button>

            <div className="h-6 w-px bg-gray-300"></div>

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

            <select
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1).map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Tabela com scroll horizontal */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <thead className="sticky top-0 z-10">
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left p-2 sticky left-0 bg-gray-100 min-w-[220px] border-r border-gray-300">
                  Descrição
                </th>
                {MESES.map(mes => (
                  <th key={mes.key} className="text-right p-2 min-w-[75px] border-r border-gray-200">
                    {mes.label}
                  </th>
                ))}
                <th className="text-right p-2 min-w-[90px] bg-gray-200 font-bold">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORIAS_CONFIG).map(([catId, config]) => 
                renderCategoriaHierarquica(catId, config)
              )}
              {/* Linha de RESULTADO */}
              <tr className="bg-gray-200 border-t-2 border-gray-400 font-bold">
                <td className="p-3 sticky left-0 bg-gray-200 z-10 border-r border-gray-400 text-base">
                  RESULTADO
                </td>
                {MESES.map(mes => (
                  <td 
                    key={mes.key} 
                    className={`p-2 text-right text-sm border-r border-gray-300 whitespace-nowrap ${
                      calcularResultado.meses[mes.num] >= 0 ? 'text-green-700' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(calcularResultado.meses[mes.num])}
                  </td>
                ))}
                <td className={`p-3 text-right text-base bg-gray-300 whitespace-nowrap ${
                  calcularResultado.total >= 0 ? 'text-green-700' : 'text-red-600'
                }`}>
                  {formatCurrency(calcularResultado.total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Aplicar a Todos */}
      {showApplyAllModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-lg font-bold text-gray-800">Aplicar para Todos os Meses</h2>
              <button onClick={() => setShowApplyAllModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Digite o valor <strong>mensal</strong> que será aplicado em <strong>todos os 12 meses</strong> para:
              </p>
              <p className="font-medium text-blue-600">{applyAllData.itemNome}</p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Mensal (em reais)</label>
                <input
                  type="text"
                  value={applyAllData.valor}
                  onChange={(e) => setApplyAllData({ ...applyAllData, valor: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-lg font-semibold focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: 100000 ou 100.000"
                  autoFocus
                />
                <p className="text-xs text-gray-500 mt-1">
                  Digite o valor sem R$. Ex: 100000 para cem mil reais
                </p>
                <p className="text-sm text-blue-600 font-medium mt-2">
                  Total anual: {formatCurrency(getValorAnualModal())}
                </p>
              </div>
              
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowApplyAllModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmApplyAll}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Check size={18} />
                  Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
