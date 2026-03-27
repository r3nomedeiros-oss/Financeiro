import React, { useState, useEffect, useRef } from 'react';
import { dreAPI, planoContasAPI, movimentacoesAPI } from '../services/api';
import { Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Ícones
const ChevronRight = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
  </svg>
);

const ChevronDown = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MESES_LABELS = {
  janeiro: "Jan",
  fevereiro: "Fev",
  marco: "Mar",
  abril: "Abr",
  maio: "Mai",
  junho: "Jun",
  julho: "Jul",
  agosto: "Ago",
  setembro: "Set",
  outubro: "Out",
  novembro: "Nov",
  dezembro: "Dez"
};

// Estrutura de categorias fixas do DRE
const CATEGORIAS_CONFIG = {
  receita_bruta: { label: "(+) Receita Bruta", cor: "cyan", tipo: "positivo" },
  deducoes_vendas: { label: "(-) Deduções Sobre Vendas", cor: "red", tipo: "negativo" },
  receita_liquida: { label: "(=) Receita Líquida", cor: "cyan", tipo: "resultado", isTotal: true },
  custos_variaveis: { label: "(-) Custos Variáveis", cor: "red", tipo: "negativo" },
  margem_contribuicao: { label: "(=) Margem de Contribuição", cor: "cyan", tipo: "resultado", isTotal: true },
  margem_contribuicao_pct: { label: "(=) % Margem de Contribuição", cor: "blue", tipo: "percentual", isTotal: true },
  custos_fixos: { label: "(-) Custos Fixos", cor: "red", tipo: "negativo" },
  resultado_operacional: { label: "(=) Resultado Operacional", cor: "cyan", tipo: "resultado", isTotal: true },
  resultado_nao_operacional: { label: "Resultado Não Operacional", cor: "gray", tipo: "misto" },
  lucro_liquido: { label: "(=) Lucro Líquido", cor: "green", tipo: "resultado", isTotal: true },
  margem_liquida_pct: { label: "(=) % Margem Líquida", cor: "blue", tipo: "percentual", isTotal: true },
};

export default function DREPage() {
  const [dre, setDre] = useState(null);
  const [hierarquia, setHierarquia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const tableRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const topScrollRef = useRef(null);
  
  // Estado de expansão
  const [expandedState, setExpandedState] = useState({});

  useEffect(() => {
    carregarAnosDisponiveis();
  }, []);

  useEffect(() => {
    if (ano) {
      carregarDados();
    }
  }, [ano]);

  const carregarAnosDisponiveis = async () => {
    try {
      const res = await movimentacoesAPI.getAll();
      const anos = new Set();
      res.data.forEach(mov => {
        const anoMov = new Date(mov.data).getFullYear();
        anos.add(anoMov);
      });
      
      const anosArray = Array.from(anos).sort((a, b) => b - a);
      setAnosDisponiveis(anosArray.length > 0 ? anosArray : [new Date().getFullYear()]);
      
      if (anosArray.length > 0 && !anosArray.includes(ano)) {
        setAno(anosArray[0]);
      }
    } catch (error) {
      console.error('Erro ao carregar anos:', error);
      setAnosDisponiveis([new Date().getFullYear()]);
    }
  };

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [dreRes, hierarquiaRes] = await Promise.all([
        dreAPI.getAnual(ano),
        planoContasAPI.getHierarquico()
      ]);
      setDre(dreRes.data);
      setHierarquia(hierarquiaRes.data);
      
      // Inicializar estado de expansão
      const initialExpanded = {};
      Object.keys(hierarquiaRes.data || {}).forEach(catId => {
        initialExpanded[catId] = { expanded: true, subcategorias: {} };
      });
      setExpandedState(initialExpanded);
    } catch (error) {
      console.error('Erro ao carregar DRE:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCategoria = (catId) => {
    setExpandedState(prev => ({
      ...prev,
      [catId]: {
        ...prev[catId],
        expanded: !prev[catId]?.expanded
      }
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

  const expandAll = () => {
    const newState = {};
    Object.keys(hierarquia || {}).forEach(catId => {
      newState[catId] = { 
        expanded: true, 
        subcategorias: {} 
      };
      (hierarquia[catId]?.subcategorias || []).forEach(sub => {
        newState[catId].subcategorias[sub.id] = true;
      });
    });
    setExpandedState(newState);
  };

  const collapseAll = () => {
    const newState = {};
    Object.keys(hierarquia || {}).forEach(catId => {
      newState[catId] = { expanded: false, subcategorias: {} };
    });
    setExpandedState(newState);
  };

  // Sincronizar scroll horizontal entre topo e tabela
  const handleTopScroll = (e) => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  const handleTableScroll = (e) => {
    if (topScrollRef.current) {
      topScrollRef.current.scrollLeft = e.target.scrollLeft;
    }
  };

  // Gerar dados para exportação baseado no estado de expansão atual
  const gerarDadosExportacao = () => {
    const rows = [];
    const formatVal = (v) => v ? v.toFixed(2).replace('.', ',') : '0,00';
    const formatPct = (v) => v ? v.toFixed(0) + '%' : '0%';
    
    const addCategoriaRows = (catId, catConfig) => {
      const catData = hierarquia?.[catId];
      const isExpanded = expandedState[catId]?.expanded;
      const subcategorias = catData?.subcategorias || [];
      
      // Linha da categoria principal
      rows.push({
        nivel: 0,
        descricao: catConfig.label,
        valores: totais[catId],
        isPercent: false,
        cor: catConfig.cor
      });
      
      // Se expandido, adicionar subcategorias
      if (isExpanded) {
        subcategorias.forEach(subcat => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[subcat.id];
          const itens = subcat.itens || [];
          
          // Calcular total da subcategoria
          const subcatValores = {};
          meses.forEach(mes => {
            const subValor = dre?.valores_por_plano?.[subcat.id]?.[mes] || 0;
            const itensValor = itens.reduce((a, item) => a + (dre?.valores_por_plano?.[item.id]?.[mes] || 0), 0);
            subcatValores[mes] = subValor + itensValor;
          });
          subcatValores.total = meses.reduce((a, m) => a + (subcatValores[m] || 0), 0);
          
          rows.push({
            nivel: 1,
            descricao: subcat.nome,
            valores: subcatValores,
            isPercent: false,
            cor: ''
          });
          
          // Se subcategoria expandida, adicionar itens
          if (isSubExpanded) {
            itens.forEach(item => {
              const itemValores = {};
              meses.forEach(mes => {
                itemValores[mes] = dre?.valores_por_plano?.[item.id]?.[mes] || 0;
              });
              itemValores.total = meses.reduce((a, m) => a + (itemValores[m] || 0), 0);
              
              rows.push({
                nivel: 2,
                descricao: item.nome,
                valores: itemValores,
                isPercent: false,
                cor: ''
              });
            });
          }
        });
      }
    };
    
    const addTotalRow = (key, config) => {
      rows.push({
        nivel: 0,
        descricao: config.label,
        valores: totais[key],
        isPercent: config.tipo === 'percentual',
        cor: config.cor,
        isTotal: true
      });
    };
    
    // Construir estrutura
    addCategoriaRows('receita_bruta', CATEGORIAS_CONFIG.receita_bruta);
    addCategoriaRows('deducoes_vendas', CATEGORIAS_CONFIG.deducoes_vendas);
    addTotalRow('receita_liquida', CATEGORIAS_CONFIG.receita_liquida);
    addCategoriaRows('custos_variaveis', CATEGORIAS_CONFIG.custos_variaveis);
    addTotalRow('margem_contribuicao', CATEGORIAS_CONFIG.margem_contribuicao);
    addTotalRow('margem_contribuicao_pct', CATEGORIAS_CONFIG.margem_contribuicao_pct);
    addCategoriaRows('custos_fixos', CATEGORIAS_CONFIG.custos_fixos);
    addTotalRow('resultado_operacional', CATEGORIAS_CONFIG.resultado_operacional);
    addCategoriaRows('resultado_nao_operacional', CATEGORIAS_CONFIG.resultado_nao_operacional);
    addTotalRow('lucro_liquido', CATEGORIAS_CONFIG.lucro_liquido);
    addTotalRow('margem_liquida_pct', CATEGORIAS_CONFIG.margem_liquida_pct);
    
    return rows;
  };

  // Exportar para Excel (CSV) - respeitando estado de expansão
  const exportToExcel = () => {
    if (!dre || !totais) return;
    
    const rows = [];
    const formatVal = (v) => v ? v.toFixed(2).replace('.', ',') : '0,00';
    const formatPct = (v) => v ? v.toFixed(0) + '%' : '0%';
    
    // Header
    const header = ['Descrição', ...meses.map(m => MESES_LABELS[m]), ano.toString(), 'AV%'];
    rows.push(header.join(';'));
    
    // Gerar dados com base no estado de expansão
    const dadosExportacao = gerarDadosExportacao();
    
    dadosExportacao.forEach(item => {
      const indent = '  '.repeat(item.nivel);
      const prefix = item.nivel === 2 ? '• ' : '';
      const descricao = indent + prefix + item.descricao;
      
      const av = item.isPercent ? '-' : (receitaBrutaTotal > 0 ? formatPct((item.valores?.total || 0) / receitaBrutaTotal * 100) : '0%');
      
      rows.push([
        descricao,
        ...meses.map(m => item.isPercent ? formatPct(item.valores?.[m]) : formatVal(item.valores?.[m])),
        item.isPercent ? formatPct(item.valores?.total) : formatVal(item.valores?.total),
        av
      ].join(';'));
    });
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${ano}.csv`;
    link.click();
  };

  // Exportar para PDF - download automático usando jsPDF
  const exportToPDF = () => {
    if (!dre || !totais) return;
    
    const formatVal = (v) => {
      if (v === null || v === undefined || v === 0) return '-';
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);
    };
    const formatPct = (v) => v ? `${v.toFixed(0)}%` : '0%';
    
    const dadosExportacao = gerarDadosExportacao();
    
    // Criar PDF em landscape
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Título
    doc.setFontSize(16);
    doc.text(`Demonstrativo de Resultado do Exercício - ${ano}`, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    // Preparar dados para a tabela
    const headers = ['Descrição', ...meses.map(m => MESES_LABELS[m]), ano.toString(), 'AV%'];
    
    const body = dadosExportacao.map(item => {
      const indent = '  '.repeat(item.nivel);
      const prefix = item.nivel === 2 ? '• ' : '';
      const descricao = indent + prefix + item.descricao;
      const av = item.isPercent ? '-' : (receitaBrutaTotal > 0 ? formatPct((item.valores?.total || 0) / receitaBrutaTotal * 100) : '0%');
      
      return [
        descricao,
        ...meses.map(m => item.isPercent ? formatPct(item.valores?.[m]) : formatVal(item.valores?.[m])),
        item.isPercent ? formatPct(item.valores?.total) : formatVal(item.valores?.total),
        av
      ];
    });
    
    // Gerar tabela com autoTable
    autoTable(doc, {
      head: [headers],
      body: body,
      startY: 22,
      styles: {
        fontSize: 7,
        cellPadding: 1.5,
      },
      headStyles: {
        fillColor: [229, 229, 229],
        textColor: [0, 0, 0],
        fontStyle: 'bold',
      },
      columnStyles: {
        0: { cellWidth: 50 },
      },
      didParseCell: function(data) {
        // Colorir linhas baseado no nível
        if (data.section === 'body') {
          const rowData = dadosExportacao[data.row.index];
          if (rowData && rowData.nivel === 0) {
            if (rowData.cor === 'cyan') {
              data.cell.styles.fillColor = [224, 247, 250];
              data.cell.styles.textColor = [14, 116, 144];
            } else if (rowData.cor === 'red') {
              data.cell.styles.fillColor = [255, 235, 238];
              data.cell.styles.textColor = [220, 38, 38];
            } else if (rowData.cor === 'green') {
              data.cell.styles.fillColor = [232, 245, 233];
              data.cell.styles.textColor = [21, 128, 61];
            } else if (rowData.cor === 'blue') {
              data.cell.styles.fillColor = [227, 242, 253];
              data.cell.styles.textColor = [37, 99, 235];
            }
            data.cell.styles.fontStyle = 'bold';
          }
        }
      }
    });
    
    // Download automático
    doc.save(`DRE_${ano}.pdf`);
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-';
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === 0) return '0%';
    return `${value.toFixed(0)}%`;
  };

  const calcularAV = (valor, receitaBrutaTotal) => {
    if (!receitaBrutaTotal || receitaBrutaTotal === 0) return '0%';
    return `${((valor / receitaBrutaTotal) * 100).toFixed(0)}%`;
  };

  const getCorClasse = (cor, isHeader = false) => {
    const cores = {
      cyan: isHeader ? 'bg-cyan-50 text-cyan-700' : 'text-cyan-700',
      red: isHeader ? 'bg-red-50 text-red-600' : 'text-red-600',
      green: isHeader ? 'bg-green-50 text-green-700' : 'text-green-700',
      blue: isHeader ? 'bg-blue-50 text-blue-600' : 'text-blue-600',
      gray: isHeader ? 'bg-gray-100 text-gray-800' : 'text-gray-800',
    };
    return cores[cor] || '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const meses = dre?.meses || [];
  const totais = dre?.totais || {};
  const receitaBrutaTotal = totais?.receita_bruta?.total || 0;

  // Renderiza valores por linha
  const renderValoresLinha = (valores, isPercent = false, cor = '') => (
    <>
      {meses.map((mes) => (
        <td key={mes} className={`text-right p-2 border-r border-gray-200 ${cor}`}>
          {isPercent ? formatPercent(valores?.[mes]) : formatCurrency(valores?.[mes])}
        </td>
      ))}
      <td className={`text-right p-2 bg-gray-50 border-r border-gray-300 font-semibold ${cor}`}>
        {isPercent ? formatPercent(valores?.total) : formatCurrency(valores?.total)}
      </td>
      <td className={`text-right p-2 bg-gray-50 ${cor}`}>
        {isPercent ? formatPercent(valores?.total) : calcularAV(valores?.total, receitaBrutaTotal)}
      </td>
    </>
  );

  // Renderiza linha de total
  const renderLinhaTotal = (key, config) => {
    const valores = totais[key];
    const isPercent = config.tipo === 'percentual';
    
    return (
      <tr key={key} className={`${getCorClasse(config.cor, true)} border-b border-gray-200`}>
        <td className={`p-2 sticky left-0 ${getCorClasse(config.cor, true)} font-semibold border-r border-gray-300`}>
          {config.label}
        </td>
        {renderValoresLinha(valores, isPercent, `font-semibold ${getCorClasse(config.cor)}`)}
      </tr>
    );
  };

  // Renderiza categoria hierárquica
  const renderCategoriaHierarquica = (catId, catConfig) => {
    const catData = hierarquia?.[catId];
    const isExpanded = expandedState[catId]?.expanded;
    const subcategorias = catData?.subcategorias || [];
    
    // Calcular total da categoria somando subcategorias
    const calcularTotalCategoria = (mes) => {
      return subcategorias.reduce((acc, sub) => {
        const subValor = dre?.valores_por_plano?.[sub.id]?.[mes] || 0;
        const itensValor = (sub.itens || []).reduce((a, item) => {
          return a + (dre?.valores_por_plano?.[item.id]?.[mes] || 0);
        }, 0);
        return acc + subValor + itensValor;
      }, 0);
    };

    return (
      <React.Fragment key={catId}>
        {/* Linha da Categoria */}
        <tr className={`${getCorClasse(catConfig.cor, true)} border-b border-gray-200 cursor-pointer hover:opacity-90`}
            onClick={() => toggleCategoria(catId)}
            data-testid={`categoria-${catId}`}>
          <td className={`p-2 sticky left-0 ${getCorClasse(catConfig.cor, true)} font-semibold border-r border-gray-300`}>
            <div className="flex items-center gap-2">
              <span className="transition-transform duration-200">
                {subcategorias.length > 0 && (isExpanded ? <ChevronDown /> : <ChevronRight />)}
              </span>
              {catConfig.label}
            </div>
          </td>
          {renderValoresLinha(totais[catId], false, `font-semibold ${getCorClasse(catConfig.cor)}`)}
        </tr>

        {/* Subcategorias (Nível 2) */}
        {isExpanded && subcategorias.map((subcat) => {
          const isSubExpanded = expandedState[catId]?.subcategorias?.[subcat.id];
          const itens = subcat.itens || [];
          
          // Calcular total da subcategoria
          const subcatTotal = (mes) => {
            const subValor = dre?.valores_por_plano?.[subcat.id]?.[mes] || 0;
            const itensValor = itens.reduce((a, item) => {
              return a + (dre?.valores_por_plano?.[item.id]?.[mes] || 0);
            }, 0);
            return subValor + itensValor;
          };

          return (
            <React.Fragment key={subcat.id}>
              {/* Linha da Subcategoria */}
              <tr className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); toggleSubcategoria(catId, subcat.id); }}
                  data-testid={`subcategoria-${subcat.id}`}>
                <td className="p-2 pl-8 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                  <div className="flex items-center gap-2">
                    <span className="transition-transform duration-200">
                      {itens.length > 0 && (isSubExpanded ? <ChevronDown /> : <ChevronRight />)}
                    </span>
                    {subcat.nome}
                  </div>
                </td>
                {meses.map((mes) => (
                  <td key={mes} className="text-right p-2 border-r border-gray-200">
                    {formatCurrency(subcatTotal(mes))}
                  </td>
                ))}
                <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                  {formatCurrency(meses.reduce((a, m) => a + subcatTotal(m), 0))}
                </td>
                <td className="text-right p-2 bg-gray-50">
                  {calcularAV(meses.reduce((a, m) => a + subcatTotal(m), 0), receitaBrutaTotal)}
                </td>
              </tr>

              {/* Itens (Nível 3) */}
              {isSubExpanded && itens.map((item) => (
                <tr key={item.id} className="border-b border-gray-50 hover:bg-gray-50"
                    data-testid={`item-${item.id}`}>
                  <td className="p-2 pl-14 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300 text-gray-600 text-sm">
                    • {item.nome}
                  </td>
                  {meses.map((mes) => (
                    <td key={mes} className="text-right p-2 border-r border-gray-200 text-gray-600 text-sm">
                      {formatCurrency(dre?.valores_por_plano?.[item.id]?.[mes] || 0)}
                    </td>
                  ))}
                  <td className="text-right p-2 bg-gray-50 border-r border-gray-300 text-gray-600 text-sm">
                    {formatCurrency(meses.reduce((a, m) => a + (dre?.valores_por_plano?.[item.id]?.[m] || 0), 0))}
                  </td>
                  <td className="text-right p-2 bg-gray-50 text-gray-600 text-sm">
                    {calcularAV(meses.reduce((a, m) => a + (dre?.valores_por_plano?.[item.id]?.[m] || 0), 0), receitaBrutaTotal)}
                  </td>
                </tr>
              ))}
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  };

  return (
    <div className="space-y-4" data-testid="dre-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">DRE - Demonstrativo de Resultado</h1>
          <p className="text-gray-600 text-sm">Visão anual consolidada com estrutura hierárquica</p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={expandAll}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            data-testid="expand-all-btn"
          >
            Expandir Tudo
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
            data-testid="collapse-all-btn"
          >
            Recolher Tudo
          </button>
          
          {/* Botões de Exportação */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            data-testid="export-excel-btn"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            data-testid="export-pdf-btn"
          >
            <Download size={16} />
            PDF
          </button>
          
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            data-testid="ano-select"
          >
            {anosDisponiveis.map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela DRE com Tree View */}
      <div className="bg-white rounded-lg shadow">
        {/* Barra de scroll superior sincronizada */}
        <div 
          ref={topScrollRef}
          className="overflow-x-scroll bg-gray-50 border-b border-gray-300"
          style={{ 
            overflowY: 'hidden',
            scrollbarWidth: 'auto',
            scrollbarColor: '#9ca3af #e5e7eb'
          }}
          onScroll={handleTopScroll}
        >
          <div style={{ width: '1800px', height: '1px' }}></div>
        </div>
        
        <div 
          ref={scrollContainerRef}
          className="overflow-x-scroll"
          style={{
            scrollbarWidth: 'auto',
            scrollbarColor: '#9ca3af #e5e7eb'
          }}
          onScroll={handleTableScroll}
        >
          <table ref={tableRef} className="w-full text-sm border-collapse min-w-[1800px]" data-testid="dre-table">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left p-2 sticky left-0 bg-gray-100 min-w-[320px] border-r border-gray-300">
                Descrição
              </th>
              {meses.map((mes) => (
                <th key={mes} className="text-right p-2 min-w-[85px] border-r border-gray-200">
                  {MESES_LABELS[mes]}
                </th>
              ))}
              <th className="text-right p-2 min-w-[100px] bg-gray-200 border-r border-gray-300 font-bold">
                {ano}
              </th>
              <th className="text-right p-2 min-w-[60px] bg-gray-200 font-bold">
                AV%
              </th>
            </tr>
          </thead>
          <tbody>
            {/* Receita Bruta */}
            {renderCategoriaHierarquica('receita_bruta', CATEGORIAS_CONFIG.receita_bruta)}
            
            {/* Deduções */}
            {renderCategoriaHierarquica('deducoes_vendas', CATEGORIAS_CONFIG.deducoes_vendas)}
            
            {/* Receita Líquida (Total) */}
            {renderLinhaTotal('receita_liquida', CATEGORIAS_CONFIG.receita_liquida)}
            
            {/* Custos Variáveis */}
            {renderCategoriaHierarquica('custos_variaveis', CATEGORIAS_CONFIG.custos_variaveis)}
            
            {/* Margem de Contribuição */}
            {renderLinhaTotal('margem_contribuicao', CATEGORIAS_CONFIG.margem_contribuicao)}
            {renderLinhaTotal('margem_contribuicao_pct', CATEGORIAS_CONFIG.margem_contribuicao_pct)}
            
            {/* Custos Fixos */}
            {renderCategoriaHierarquica('custos_fixos', CATEGORIAS_CONFIG.custos_fixos)}
            
            {/* Resultado Operacional */}
            {renderLinhaTotal('resultado_operacional', CATEGORIAS_CONFIG.resultado_operacional)}
            
            {/* Resultado Não Operacional */}
            {renderCategoriaHierarquica('resultado_nao_operacional', CATEGORIAS_CONFIG.resultado_nao_operacional)}
            
            {/* Lucro Líquido */}
            {renderLinhaTotal('lucro_liquido', CATEGORIAS_CONFIG.lucro_liquido)}
            {renderLinhaTotal('margem_liquida_pct', CATEGORIAS_CONFIG.margem_liquida_pct)}
          </tbody>
        </table>
        </div>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Legenda e Navegação:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <ChevronRight />
            <span>Clique para expandir</span>
          </div>
          <div className="flex items-center gap-2">
            <ChevronDown />
            <span>Clique para recolher</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-cyan-100 border border-cyan-300 rounded"></span>
            <span>Receitas / Resultados</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
            <span>Custos / Deduções</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
            <span>Lucro Líquido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></span>
            <span>Percentuais</span>
          </div>
        </div>
      </div>
    </div>
  );
}
