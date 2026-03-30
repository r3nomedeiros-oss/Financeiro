import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { planejamentoAPI, planoContasAPI } from '../services/api';
import { Save, Copy, ChevronDown, ChevronRight, Download, FileSpreadsheet, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

// Categorias fixas do DRE
const CATEGORIAS_CONFIG = {
  receita_bruta: { label: "(+) Receita Bruta", cor: "cyan", tipo: "positivo" },
  deducoes_vendas: { label: "(-) Deduções Sobre Vendas", cor: "red", tipo: "negativo" },
  custos_variaveis: { label: "(-) Custos Variáveis", cor: "red", tipo: "negativo" },
  custos_fixos: { label: "(-) Custos Fixos", cor: "red", tipo: "negativo" },
  resultado_nao_operacional: { label: "Resultado Não Operacional", cor: "gray", tipo: "misto" },
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
  const [editingCell, setEditingCell] = useState(null); // { itemId, mes }
  const [editValue, setEditValue] = useState('');
  
  // Estado para "Aplicar a todos os meses"
  const [showApplyAllModal, setShowApplyAllModal] = useState(false);
  const [applyAllData, setApplyAllData] = useState({ itemId: '', itemNome: '', valor: '' });
  
  // Alterações pendentes (buffer para salvar em lote)
  const [pendingChanges, setPendingChanges] = useState({});

  useEffect(() => {
    carregarDados();
  }, [ano]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [hierRes, planRes] = await Promise.all([
        planoContasAPI.getHierarquico(),
        planejamentoAPI.getAll({ ano }),
      ]);
      
      setHierarquia(hierRes.data);
      setPlanejamentos(planRes.data);
      
      // Inicializar estado de expansão
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

  // Criar mapa de valores planejados: { itemId: { mes: valor } }
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

  // Formatação - CORRIGIDO para aceitar valores em reais diretamente
  const formatCurrency = (value) => {
    if (!value && value !== 0) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Parser simples - aceita números inteiros diretamente (ex: 100000 = R$ 100.000)
  const parseCurrencyInput = (value) => {
    // Remove tudo que não é número
    const numeros = value.replace(/\D/g, '');
    return parseInt(numeros) || 0;
  };

  const formatCurrencyInput = (value) => {
    if (!value) return '';
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
    // Mostra o valor como número simples para facilitar edição
    setEditValue(currentValue > 0 ? currentValue.toString() : '');
  };

  const cancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const confirmEdit = () => {
    if (!editingCell) return;
    
    // Aceita número direto ou com vírgula/ponto
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
    // Aceita número direto ou com vírgula/ponto
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

  // Calcular total anual do valor digitado no modal
  const getValorAnualModal = () => {
    const valorLimpo = applyAllData.valor.replace(/[^\d,.-]/g, '').replace(',', '.');
    const valor = parseFloat(valorLimpo) || 0;
    return valor * 12;
  };

  // Salvar todas as alterações pendentes
  const salvarAlteracoes = async () => {
    if (Object.keys(pendingChanges).length === 0) return;
    
    setSaving(true);
    try {
      const promises = [];
      
      for (const [key, valor] of Object.entries(pendingChanges)) {
        const [itemId, mesStr] = key.split('-');
        const mes = parseInt(mesStr);
        
        const existente = valoresMap[itemId]?.planejamentos[mes];
        
        if (existente) {
          // Atualizar existente
          if (valor > 0) {
            promises.push(planejamentoAPI.update(existente.id, { valor_planejado: valor }));
          } else {
            // Deletar se valor é 0
            promises.push(planejamentoAPI.delete(existente.id));
          }
        } else if (valor > 0) {
          // Criar novo
          promises.push(planejamentoAPI.create({
            plano_contas_id: itemId,
            mes,
            ano,
            valor_planejado: valor
          }));
        }
      }
      
      await Promise.all(promises);
      setPendingChanges({});
      await carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      // Melhor tratamento de erro
      let errorMsg = 'Erro desconhecido';
      if (error.response?.data?.detail) {
        errorMsg = error.response.data.detail;
      } else if (error.message) {
        errorMsg = error.message;
      } else if (typeof error === 'string') {
        errorMsg = error;
      }
      alert('Erro ao salvar alterações: ' + errorMsg);
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
      // Soma da subcategoria
      const subValor = getValor(sub.id, 0); // subcategoria em si (se tiver)
      
      (sub.itens || []).forEach(item => {
        MESES.forEach(mes => {
          const valor = getValor(item.id, mes.num);
          totais.meses[mes.num] += valor;
          totais.total += valor;
        });
      });
      
      // Se não tem itens, usar subcategoria
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
        ...MESES.map(m => (totais.meses[m.num] || 0).toFixed(2).replace('.', ',')),
        totais.total.toFixed(2).replace('.', ',')
      ].join(';'));
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          rows.push([
            '  ' + sub.nome,
            ...MESES.map(m => getValor(sub.id, m.num).toFixed(2).replace('.', ',')),
            calcularTotalLinha(sub.id).toFixed(2).replace('.', ',')
          ].join(';'));
        } else {
          itens.forEach(item => {
            rows.push([
              '  ' + sub.nome + ' > ' + item.nome,
              ...MESES.map(m => getValor(item.id, m.num).toFixed(2).replace('.', ',')),
              calcularTotalLinha(item.id).toFixed(2).replace('.', ',')
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

  // Exportar PDF
  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    doc.setFontSize(14);
    doc.text(`Planejamento Orçamentário - ${ano}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    const headers = ['Descrição', ...MESES.map(m => m.label), 'Total'];
    const body = [];
    
    Object.entries(CATEGORIAS_CONFIG).forEach(([catId, config]) => {
      const totais = calcularTotalCategoria(catId);
      body.push([
        config.label,
        ...MESES.map(m => formatCurrency(totais.meses[m.num] || 0)),
        formatCurrency(totais.total)
      ]);
      
      const cat = hierarquia[catId];
      (cat?.subcategorias || []).forEach(sub => {
        const itens = sub.itens || [];
        if (itens.length === 0) {
          body.push([
            '  ' + sub.nome,
            ...MESES.map(m => formatCurrency(getValor(sub.id, m.num))),
            formatCurrency(calcularTotalLinha(sub.id))
          ]);
        } else {
          itens.forEach(item => {
            body.push([
              '    ' + item.nome,
              ...MESES.map(m => formatCurrency(getValor(item.id, m.num))),
              formatCurrency(calcularTotalLinha(item.id))
            ]);
          });
        }
      });
    });
    
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 22,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [229, 229, 229], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 50 } },
    });
    
    doc.save(`Planejamento_${ano}.pdf`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
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
            className="w-full px-1 py-0.5 text-right text-sm border border-blue-400 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="R$ 0,00"
          />
        </td>
      );
    }
    
    return (
      <td 
        key={mes.key} 
        className={`p-1 text-right text-sm border-r border-gray-200 cursor-pointer hover:bg-blue-50 transition ${isPending ? 'bg-yellow-50' : ''}`}
        onClick={() => startEdit(itemId, mes.num, valor)}
        title="Clique para editar"
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
        <td className={`p-2 ${paddingLeft} sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300 text-sm`}>
          <div className="flex items-center justify-between">
            <span className={nivel === 3 ? 'text-gray-600' : ''}>{nivel === 3 ? '• ' : ''}{item.nome}</span>
            <button
              onClick={() => openApplyAllModal(item.id, item.nome)}
              className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
              title="Aplicar valor para todos os meses"
            >
              <Copy size={14} />
            </button>
          </div>
        </td>
        {MESES.map(mes => renderCell(item.id, mes, getValor(item.id, mes.num)))}
        <td className="p-2 text-right font-semibold bg-gray-50 border-r border-gray-300 text-sm">
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
        {/* Linha da Categoria */}
        <tr 
          className={`${getCorClasse(config.cor, true)} border-b border-gray-200 cursor-pointer hover:opacity-90`}
          onClick={() => toggleCategoria(catId)}
        >
          <td className={`p-2 sticky left-0 ${getCorClasse(config.cor, true)} font-semibold border-r border-gray-300`}>
            <div className="flex items-center gap-2">
              {subcategorias.length > 0 && (
                <span className="transition-transform duration-200">
                  {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </span>
              )}
              {config.label}
            </div>
          </td>
          {MESES.map(mes => (
            <td key={mes.key} className={`p-2 text-right font-semibold ${getCorClasse(config.cor)} border-r border-gray-200 text-sm`}>
              {formatCurrency(totais.meses[mes.num] || 0)}
            </td>
          ))}
          <td className={`p-2 text-right font-bold bg-gray-100 border-r border-gray-300 text-sm`}>
            {formatCurrency(totais.total)}
          </td>
        </tr>

        {/* Subcategorias */}
        {isExpanded && subcategorias.map(sub => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[sub.id];
          const itens = sub.itens || [];
          const hasItens = itens.length > 0;

          return (
            <React.Fragment key={sub.id}>
              {/* Linha da Subcategoria */}
              <tr 
                className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                onClick={() => hasItens && toggleSubcategoria(catId, sub.id)}
              >
                <td className="p-2 pl-6 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300 text-sm font-medium">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {hasItens && (
                        <span className="transition-transform duration-200">
                          {isSubExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </span>
                      )}
                      {sub.nome}
                    </div>
                    {!hasItens && (
                      <button
                        onClick={(e) => { e.stopPropagation(); openApplyAllModal(sub.id, sub.nome); }}
                        className="ml-2 p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                        title="Aplicar valor para todos os meses"
                      >
                        <Copy size={14} />
                      </button>
                    )}
                  </div>
                </td>
                {hasItens ? (
                  // Se tem itens, mostrar soma
                  <>
                    {MESES.map(mes => {
                      const somaItens = itens.reduce((acc, item) => acc + getValor(item.id, mes.num), 0);
                      return (
                        <td key={mes.key} className="p-2 text-right text-sm border-r border-gray-200 text-gray-500">
                          {somaItens > 0 ? formatCurrency(somaItens) : '-'}
                        </td>
                      );
                    })}
                    <td className="p-2 text-right font-semibold bg-gray-50 border-r border-gray-300 text-sm">
                      {formatCurrency(itens.reduce((acc, item) => acc + calcularTotalLinha(item.id), 0))}
                    </td>
                  </>
                ) : (
                  // Se não tem itens, permite editar subcategoria diretamente
                  <>
                    {MESES.map(mes => renderCell(sub.id, mes, getValor(sub.id, mes.num)))}
                    <td className="p-2 text-right font-semibold bg-gray-50 border-r border-gray-300 text-sm">
                      {formatCurrency(calcularTotalLinha(sub.id))}
                    </td>
                  </>
                )}
              </tr>

              {/* Itens (nível 3) */}
              {isSubExpanded && hasItens && itens.map(item => renderItemRow(item, 3))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4" data-testid="planejamento-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planejamento Orçamentário</h1>
          <p className="text-gray-600 text-sm">Defina metas mensais seguindo a estrutura do DRE</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Indicador de alterações pendentes */}
          {hasPendingChanges && (
            <span className="text-sm text-amber-600 bg-amber-50 px-3 py-1 rounded-full">
              {Object.keys(pendingChanges).length} alterações não salvas
            </span>
          )}
          
          {/* Botão Salvar */}
          <button
            onClick={salvarAlteracoes}
            disabled={!hasPendingChanges || saving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
              hasPendingChanges 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Save size={18} />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </button>

          {/* Exportações */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Download size={16} />
            PDF
          </button>

          {/* Seletor de Ano */}
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i - 1).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Instruções */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        <strong>Dica:</strong> Clique em qualquer célula para editar o valor. Use o botão 
        <Copy size={14} className="inline mx-1" /> ao lado de cada item para aplicar o mesmo valor em todos os meses.
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1200px]">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left p-2 sticky left-0 bg-gray-100 min-w-[250px] border-r border-gray-300">
                  Descrição
                </th>
                {MESES.map(mes => (
                  <th key={mes.key} className="text-right p-2 min-w-[80px] border-r border-gray-200">
                    {mes.label}
                  </th>
                ))}
                <th className="text-right p-2 min-w-[100px] bg-gray-200 border-r border-gray-300 font-bold">
                  Total {ano}
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(CATEGORIAS_CONFIG).map(([catId, config]) => 
                renderCategoriaHierarquica(catId, config)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-4 text-sm">
        <div className="flex flex-wrap gap-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
            <span>Valor alterado (não salvo)</span>
          </div>
          <div className="flex items-center gap-2">
            <Copy size={16} className="text-gray-400" />
            <span>Aplicar para todos os meses</span>
          </div>
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
