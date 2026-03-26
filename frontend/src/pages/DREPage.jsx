import React, { useState, useEffect, useRef } from 'react';
import { dreAPI, planoContasAPI, movimentacoesAPI } from '../services/api';
import { Download, FileSpreadsheet } from 'lucide-react';

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

  // Exportar para Excel (CSV)
  const exportToExcel = () => {
    if (!dre || !totais) return;
    
    const rows = [];
    
    // Header
    const header = ['Descrição', ...meses.map(m => MESES_LABELS[m]), ano.toString(), 'AV%'];
    rows.push(header.join(';'));
    
    // Helper para formatar valores
    const formatVal = (v) => v ? v.toFixed(2).replace('.', ',') : '0,00';
    const formatPct = (v) => v ? v.toFixed(0) + '%' : '0%';
    
    // Receita Bruta
    rows.push([
      'Receita Bruta',
      ...meses.map(m => formatVal(totais.receita_bruta?.[m])),
      formatVal(totais.receita_bruta?.total),
      '100%'
    ].join(';'));
    
    // Deduções
    rows.push([
      'Deduções Sobre Vendas',
      ...meses.map(m => formatVal(totais.deducoes_vendas?.[m])),
      formatVal(totais.deducoes_vendas?.total),
      formatPct((totais.deducoes_vendas?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Receita Líquida
    rows.push([
      'Receita Líquida',
      ...meses.map(m => formatVal(totais.receita_liquida?.[m])),
      formatVal(totais.receita_liquida?.total),
      formatPct((totais.receita_liquida?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Custos Variáveis
    rows.push([
      'Custos Variáveis',
      ...meses.map(m => formatVal(totais.custos_variaveis?.[m])),
      formatVal(totais.custos_variaveis?.total),
      formatPct((totais.custos_variaveis?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Margem de Contribuição
    rows.push([
      'Margem de Contribuição',
      ...meses.map(m => formatVal(totais.margem_contribuicao?.[m])),
      formatVal(totais.margem_contribuicao?.total),
      formatPct((totais.margem_contribuicao?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // % Margem de Contribuição
    rows.push([
      '% Margem de Contribuição',
      ...meses.map(m => formatPct(totais.margem_contribuicao_pct?.[m])),
      formatPct(totais.margem_contribuicao_pct?.total),
      '-'
    ].join(';'));
    
    // Custos Fixos
    rows.push([
      'Custos Fixos',
      ...meses.map(m => formatVal(totais.custos_fixos?.[m])),
      formatVal(totais.custos_fixos?.total),
      formatPct((totais.custos_fixos?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Resultado Operacional
    rows.push([
      'Resultado Operacional',
      ...meses.map(m => formatVal(totais.resultado_operacional?.[m])),
      formatVal(totais.resultado_operacional?.total),
      formatPct((totais.resultado_operacional?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Resultado Não Operacional
    rows.push([
      'Resultado Não Operacional',
      ...meses.map(m => formatVal(totais.resultado_nao_operacional?.[m])),
      formatVal(totais.resultado_nao_operacional?.total),
      formatPct((totais.resultado_nao_operacional?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // Lucro Líquido
    rows.push([
      'Lucro Líquido',
      ...meses.map(m => formatVal(totais.lucro_liquido?.[m])),
      formatVal(totais.lucro_liquido?.total),
      formatPct((totais.lucro_liquido?.total / receitaBrutaTotal) * 100)
    ].join(';'));
    
    // % Margem Líquida
    rows.push([
      '% Margem Líquida',
      ...meses.map(m => formatPct(totais.margem_liquida_pct?.[m])),
      formatPct(totais.margem_liquida_pct?.total),
      '-'
    ].join(';'));
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `DRE_${ano}.csv`;
    link.click();
  };

  // Exportar para PDF
  const exportToPDF = () => {
    if (!dre || !totais) return;
    
    // Helper para formatar valores
    const formatVal = (v) => {
      if (v === null || v === undefined || v === 0) return '-';
      return new Intl.NumberFormat('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(v);
    };
    const formatPct = (v) => v ? `${v.toFixed(0)}%` : '0%';
    
    // Construir tabela HTML manualmente com dados corretos
    const buildRow = (label, valores, isPercent = false, bgColor = '', textColor = '') => {
      const cells = meses.map(m => `<td style="text-align:right;padding:4px;border:1px solid #ddd;${textColor}">${isPercent ? formatPct(valores?.[m]) : formatVal(valores?.[m])}</td>`).join('');
      const totalVal = isPercent ? formatPct(valores?.total) : formatVal(valores?.total);
      const avVal = isPercent ? '-' : (receitaBrutaTotal > 0 ? `${((valores?.total || 0) / receitaBrutaTotal * 100).toFixed(0)}%` : '0%');
      
      return `<tr style="${bgColor}">
        <td style="text-align:left;padding:4px;border:1px solid #ddd;font-weight:600;${textColor}">${label}</td>
        ${cells}
        <td style="text-align:right;padding:4px;border:1px solid #ddd;font-weight:bold;background:#f5f5f5;${textColor}">${totalVal}</td>
        <td style="text-align:right;padding:4px;border:1px solid #ddd;background:#f5f5f5;${textColor}">${avVal}</td>
      </tr>`;
    };
    
    const headerCells = meses.map(m => `<th style="text-align:right;padding:4px;border:1px solid #ddd;background:#e5e5e5;">${MESES_LABELS[m]}</th>`).join('');
    
    const tableHTML = `
      <table style="width:100%;border-collapse:collapse;font-size:10px;font-family:Arial,sans-serif;">
        <thead>
          <tr>
            <th style="text-align:left;padding:4px;border:1px solid #ddd;background:#e5e5e5;min-width:180px;">Descrição</th>
            ${headerCells}
            <th style="text-align:right;padding:4px;border:1px solid #ddd;background:#d5d5d5;font-weight:bold;">${ano}</th>
            <th style="text-align:right;padding:4px;border:1px solid #ddd;background:#d5d5d5;">AV%</th>
          </tr>
        </thead>
        <tbody>
          ${buildRow('(+) Receita Bruta', totais.receita_bruta, false, 'background:#e0f7fa;', 'color:#0e7490;')}
          ${buildRow('(-) Deduções Sobre Vendas', totais.deducoes_vendas, false, 'background:#ffebee;', 'color:#dc2626;')}
          ${buildRow('(=) Receita Líquida', totais.receita_liquida, false, 'background:#e0f7fa;', 'color:#0e7490;')}
          ${buildRow('(-) Custos Variáveis', totais.custos_variaveis, false, 'background:#ffebee;', 'color:#dc2626;')}
          ${buildRow('(=) Margem de Contribuição', totais.margem_contribuicao, false, 'background:#e0f7fa;', 'color:#0e7490;')}
          ${buildRow('(=) % Margem de Contribuição', totais.margem_contribuicao_pct, true, 'background:#e3f2fd;', 'color:#2563eb;')}
          ${buildRow('(-) Custos Fixos', totais.custos_fixos, false, 'background:#ffebee;', 'color:#dc2626;')}
          ${buildRow('(=) Resultado Operacional', totais.resultado_operacional, false, 'background:#e0f7fa;', 'color:#0e7490;')}
          ${buildRow('Resultado Não Operacional', totais.resultado_nao_operacional, false, 'background:#f5f5f5;', 'color:#374151;')}
          ${buildRow('(=) Lucro Líquido', totais.lucro_liquido, false, 'background:#e8f5e9;', 'color:#15803d;')}
          ${buildRow('(=) % Margem Líquida', totais.margem_liquida_pct, true, 'background:#e3f2fd;', 'color:#2563eb;')}
        </tbody>
      </table>
    `;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>DRE - ${ano}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { text-align: center; margin-bottom: 20px; font-size: 18px; }
          @media print {
            body { margin: 0; }
            @page { size: landscape; margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <h1>Demonstrativo de Resultado do Exercício - ${ano}</h1>
        ${tableHTML}
        <script>
          setTimeout(() => { window.print(); window.close(); }, 500);
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
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
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table ref={tableRef} className="w-full text-sm border-collapse" data-testid="dre-table">
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
