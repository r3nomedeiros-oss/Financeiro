import React, { useState, useEffect, useRef } from 'react';
import { movimentacoesAPI, planoContasAPI, contasAPI, invalidateCache } from '../services/api';
import { Plus, Edit2, Trash2, X, Search, Filter, GripVertical, Download, FileSpreadsheet } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function MovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [hierarquia, setHierarquia] = useState({});
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  // Filtros
  const [filtroDataInicio, setFiltroDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [filtroDataFim, setFiltroDataFim] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [filtroTipo, setFiltroTipo] = useState('todos');
  const [filtroBusca, setFiltroBusca] = useState('');
  
  // Estado para busca do Item/Conta
  const [buscaItem, setBuscaItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemInputRef = useRef(null);
  const dropdownRef = useRef(null);
  
  const [formData, setFormData] = useState({
    data: new Date().toISOString().split('T')[0],
    tipo: 'entrada',
    plano_contas_id: '',
    complemento: '',
    conta_bancaria_id: '',
    valor: '',
    valorFormatado: ''
  });

  // Drag & Drop (reordenação manual)
  const [dragState, setDragState] = useState({ dragId: null, overId: null });
  const dragRef = useRef(null);

  useEffect(() => {
    carregarDados();
  }, [filtroDataInicio, filtroDataFim]);

  const carregarDados = async (showLoading = true) => {
    try {
      if (showLoading && movimentacoes.length === 0) setLoading(true);
      const [movRes, hierRes, contasRes] = await Promise.all([
        movimentacoesAPI.getAll({ data_inicio: filtroDataInicio, data_fim: filtroDataFim }),
        planoContasAPI.getHierarquico(),
        contasAPI.getAll(),
      ]);
      
      setMovimentacoes(movRes.data);
      setHierarquia(hierRes.data);
      setContas(contasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extrair apenas itens (nível 3) do plano de contas
  const getItensPlanoContas = (tipo) => {
    const tipoFiltro = tipo === 'entrada' ? 'receita' : 'despesa';
    const itens = [];
    
    Object.entries(hierarquia).forEach(([catId, categoria]) => {
      (categoria.subcategorias || []).forEach(subcat => {
        // Se a subcategoria tem o tipo correto ou categoria é mista
        if (subcat.tipo === tipoFiltro || categoria.tipo === 'misto') {
          (subcat.itens || []).forEach(item => {
            if (item.tipo === tipoFiltro) {
              itens.push({
                id: item.id,
                nome: item.nome,
                subcategoria: subcat.nome,
                categoria: categoria.nome
              });
            }
          });
          
          // Se não tem itens, usar a própria subcategoria
          if (!subcat.itens || subcat.itens.length === 0) {
            if (subcat.tipo === tipoFiltro) {
              itens.push({
                id: subcat.id,
                nome: subcat.nome,
                subcategoria: '',
                categoria: categoria.nome
              });
            }
          }
        }
      });
    });

    return itens;
  };

  // Definir itensDisponiveis primeiro
  const itensDisponiveis = getItensPlanoContas(formData.tipo);

  // Filtrar itens pela busca
  const itensFiltrados = itensDisponiveis.filter(item => {
    const texto = buscaItem.toLowerCase();
    const nomeCompleto = item.subcategoria 
      ? `${item.subcategoria} ${item.nome}`.toLowerCase()
      : item.nome.toLowerCase();
    return nomeCompleto.includes(texto);
  });

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          itemInputRef.current && !itemInputRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Selecionar item
  const selecionarItem = (item) => {
    setFormData({ ...formData, plano_contas_id: item.id });
    setBuscaItem(item.subcategoria ? `${item.subcategoria} → ${item.nome}` : item.nome);
    setShowItemDropdown(false);
  };

  // Digitação natural: usuário digita números, vírgula (ou ponto) separa centavos.
  // Ex.: "100000" -> R$ 100.000,00 (ao sair do campo)
  //      "100000,5" -> R$ 100.000,50 (ao sair do campo)
  //      "1234,56" -> R$ 1.234,56
  const handleValorChange = (e) => {
    let input = e.target.value;
    // Aceita apenas dígitos, vírgula e ponto (ponto é convertido em vírgula)
    input = input.replace(/[^\d,.]/g, '').replace(/\./g, ',');

    // Mantém apenas a primeira vírgula (se houver mais)
    const primeiraVirgula = input.indexOf(',');
    if (primeiraVirgula !== -1) {
      input = input.slice(0, primeiraVirgula + 1) + input.slice(primeiraVirgula + 1).replace(/,/g, '');
    }

    const partes = input.split(',');
    let inteira = (partes[0] || '').replace(/^0+(?=\d)/, ''); // remove zeros à esquerda
    const decimalInformado = partes.length > 1;
    let decimal = decimalInformado ? partes[1].slice(0, 2) : '';

    // Formata parte inteira com separador de milhares
    const inteiraFormatada = inteira ? parseInt(inteira, 10).toLocaleString('pt-BR') : '';

    let valorFormatado = '';
    if (inteira || decimalInformado) {
      valorFormatado = `R$ ${inteiraFormatada || '0'}`;
      if (decimalInformado) valorFormatado += `,${decimal}`;
    }

    const valorNumerico = parseFloat(`${inteira || '0'}.${decimal || '0'}`) || 0;

    setFormData({
      ...formData,
      valor: valorNumerico.toString(),
      valorFormatado
    });
  };

  // Ao sair do campo, completa os centavos (",5" -> ",50" | sem vírgula -> ",00")
  const handleValorBlur = () => {
    if (!formData.valorFormatado) return;
    const valor = parseFloat(formData.valor) || 0;
    const formatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(valor);
    setFormData((prev) => ({ ...prev, valorFormatado: formatado }));
  };

  // ============================================
  // DRAG & DROP - Reordenar movimentações
  // ============================================
  const handleDragStart = (movId) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', movId);
    dragRef.current = { dragId: movId };
    setDragState({ dragId: movId, overId: null });
  };

  const handleDragOver = (movId) => (e) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.dragId === movId) return;
    e.dataTransfer.dropEffect = 'move';
    setDragState((prev) => ({ ...prev, overId: movId }));
  };

  const handleDragEnd = () => {
    setDragState({ dragId: null, overId: null });
    dragRef.current = null;
  };

  const handleDrop = (targetId) => async (e) => {
    e.preventDefault();
    const ds = dragRef.current;
    if (!ds || !targetId || ds.dragId === targetId) {
      handleDragEnd();
      return;
    }

    const list = [...movimentacoesFiltradas];
    const dragIndex = list.findIndex((m) => m.id === ds.dragId);
    const targetIndex = list.findIndex((m) => m.id === targetId);
    if (dragIndex === -1 || targetIndex === -1) {
      handleDragEnd();
      return;
    }

    const [moved] = list.splice(dragIndex, 1);
    list.splice(targetIndex, 0, moved);

    const newPos = list.findIndex((m) => m.id === moved.id);
    const prev = list[newPos - 1]; // vizinho acima (ordem MAIOR)
    const next = list[newPos + 1]; // vizinho abaixo (ordem MENOR)

    const SPACING = 1000000;
    const prevOrdem = prev?.ordem != null ? Number(prev.ordem) : null;
    const nextOrdem = next?.ordem != null ? Number(next.ordem) : null;

    let novoOrdem;
    if (prevOrdem != null && nextOrdem != null) {
      novoOrdem = Math.floor((prevOrdem + nextOrdem) / 2);
      if (novoOrdem === prevOrdem || novoOrdem === nextOrdem) novoOrdem = prevOrdem - 1;
    } else if (prevOrdem != null) {
      novoOrdem = prevOrdem - SPACING;
    } else if (nextOrdem != null) {
      novoOrdem = nextOrdem + SPACING;
    } else {
      novoOrdem = Date.now() * 1000;
    }

    // Atualizar estado local imediatamente
    setMovimentacoes((prevMovs) =>
      prevMovs
        .map((m) => (m.id === moved.id ? { ...m, ordem: novoOrdem } : m))
        .sort((a, b) => (Number(b.ordem) || 0) - (Number(a.ordem) || 0))
    );

    handleDragEnd();

    // Persistir no backend
    try {
      await movimentacoesAPI.reorder([{ id: moved.id, ordem: novoOrdem }]);
      invalidateCache('/api/movimentacoes');
    } catch (err) {
      console.error('Erro ao reordenar:', err);
      alert('Erro ao salvar nova ordem. Recarregando...');
      carregarDados(false);
    }
  };

  // ============================================
  // EXPORTAÇÃO (Excel / PDF)
  // ============================================
  const exportToExcel = () => {
    const rows = [];
    rows.push(['Data', 'Tipo', 'Item/Conta', 'Complemento', 'Banco', 'Valor (R$)'].join(';'));

    movimentacoesFiltradas.forEach((mov) => {
      rows.push([
        formatDate(mov.data),
        mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        (mov.plano_contas?.nome || '-').replace(/;/g, ','),
        (mov.complemento || '-').replace(/;/g, ',').replace(/\r?\n/g, ' '),
        (mov.contas_bancarias?.nome || '-').replace(/;/g, ','),
        Number(mov.valor).toFixed(2).replace('.', ',')
      ].join(';'));
    });

    // Totais
    const totalEntradas = movimentacoesFiltradas
      .filter((m) => m.tipo === 'entrada')
      .reduce((s, m) => s + Number(m.valor), 0);
    const totalSaidas = movimentacoesFiltradas
      .filter((m) => m.tipo === 'saida')
      .reduce((s, m) => s + Number(m.valor), 0);

    rows.push('');
    rows.push(['', '', '', '', 'Total Entradas', totalEntradas.toFixed(2).replace('.', ',')].join(';'));
    rows.push(['', '', '', '', 'Total Saídas', totalSaidas.toFixed(2).replace('.', ',')].join(';'));
    rows.push(['', '', '', '', 'Saldo', (totalEntradas - totalSaidas).toFixed(2).replace('.', ',')].join(';'));

    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Movimentacoes_${filtroDataInicio}_${filtroDataFim}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF('landscape', 'mm', 'a4');

    const inicioFmt = new Date(filtroDataInicio + 'T00:00:00').toLocaleDateString('pt-BR');
    const fimFmt = new Date(filtroDataFim + 'T00:00:00').toLocaleDateString('pt-BR');

    doc.setFontSize(14);
    doc.text('Movimentação Financeira', doc.internal.pageSize.width / 2, 12, { align: 'center' });
    doc.setFontSize(10);
    doc.text(`Período: ${inicioFmt} a ${fimFmt}`, doc.internal.pageSize.width / 2, 18, { align: 'center' });

    const headers = [['Data', 'Tipo', 'Item/Conta', 'Complemento', 'Banco', 'Valor']];
    const body = movimentacoesFiltradas.map((mov) => [
      formatDate(mov.data),
      mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      mov.plano_contas?.nome || '-',
      mov.complemento || '-',
      mov.contas_bancarias?.nome || '-',
      formatCurrency(mov.valor)
    ]);

    const totalEntradas = movimentacoesFiltradas
      .filter((m) => m.tipo === 'entrada')
      .reduce((s, m) => s + Number(m.valor), 0);
    const totalSaidas = movimentacoesFiltradas
      .filter((m) => m.tipo === 'saida')
      .reduce((s, m) => s + Number(m.valor), 0);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 24,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        5: { halign: 'right' }
      },
      didParseCell: function (data) {
        if (data.section === 'body' && data.column.index === 1) {
          if (data.cell.raw === 'Entrada') data.cell.styles.textColor = [22, 163, 74];
          else if (data.cell.raw === 'Saída') data.cell.styles.textColor = [220, 38, 38];
        }
      }
    });

    // Resumo ao final
    const finalY = doc.lastAutoTable?.finalY || 24;
    autoTable(doc, {
      startY: finalY + 4,
      body: [
        ['Total Entradas', formatCurrency(totalEntradas)],
        ['Total Saídas', formatCurrency(totalSaidas)],
        ['Saldo do Período', formatCurrency(totalEntradas - totalSaidas)]
      ],
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 3, fontStyle: 'bold' },
      columnStyles: {
        0: { fillColor: [243, 244, 246], cellWidth: 60 },
        1: { halign: 'right' }
      },
      margin: { left: doc.internal.pageSize.width - 120 }
    });

    doc.save(`Movimentacoes_${filtroDataInicio}_${filtroDataFim}.pdf`);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const data = {
        data: formData.data,
        tipo: formData.tipo,
        plano_contas_id: formData.plano_contas_id,
        complemento: formData.complemento,
        conta_bancaria_id: formData.conta_bancaria_id,
        valor: parseFloat(formData.valor),
      };

      if (editingId) {
        await movimentacoesAPI.update(editingId, data);
      } else {
        await movimentacoesAPI.create(data);
      }
      
      setShowModal(false);
      resetForm();
      invalidateCache('/api/movimentacoes');
      invalidateCache('/api/contas-bancarias');
      invalidateCache('/api/dashboard');
      invalidateCache('/api/dre');
      invalidateCache('/api/fluxo-caixa');
      carregarDados(false);
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar movimentação');
    }
  };

  const handleEdit = (mov) => {
    setEditingId(mov.id);
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(mov.valor);
    
    // Buscar nome do item para preencher o campo de busca
    const item = itensDisponiveis.find(i => i.id === mov.plano_contas_id);
    if (item) {
      setBuscaItem(item.subcategoria ? `${item.subcategoria} → ${item.nome}` : item.nome);
    }
    
    setFormData({
      data: mov.data,
      tipo: mov.tipo,
      plano_contas_id: mov.plano_contas_id,
      complemento: mov.complemento || '',
      conta_bancaria_id: mov.conta_bancaria_id,
      valor: mov.valor.toString(),
      valorFormatado: valorFormatado
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir esta movimentação?')) return;
    
    try {
      await movimentacoesAPI.delete(id);
      // Remover da tela imediatamente
      setMovimentacoes(prev => prev.filter(m => m.id !== id));
      // Invalidar cache e recarregar saldos atualizados
      invalidateCache('/api/movimentacoes');
      invalidateCache('/api/contas-bancarias');
      invalidateCache('/api/dashboard');
      invalidateCache('/api/dre');
      invalidateCache('/api/fluxo-caixa');
      contasAPI.getAll().then(res => setContas(res.data));
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir movimentação');
    }
  };

  const resetForm = () => {
    setFormData({
      data: new Date().toISOString().split('T')[0],
      tipo: 'entrada',
      plano_contas_id: '',
      complemento: '',
      conta_bancaria_id: '',
      valor: '',
      valorFormatado: ''
    });
    setBuscaItem('');
    setEditingId(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  // Filtragem local (tipo + busca por texto)
  const movimentacoesFiltradas = movimentacoes.filter(mov => {
    if (filtroTipo !== 'todos' && mov.tipo !== filtroTipo) return false;
    if (filtroBusca) {
      const texto = filtroBusca.toLowerCase();
      const nome = (mov.plano_contas?.nome || '').toLowerCase();
      const complemento = (mov.complemento || '').toLowerCase();
      const banco = (mov.contas_bancarias?.nome || '').toLowerCase();
      if (!nome.includes(texto) && !complemento.includes(texto) && !banco.includes(texto)) return false;
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="movimentacoes-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Movimentação Financeira</h1>
          <p className="text-gray-600 text-sm">Registre todas as suas transações</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            disabled={movimentacoesFiltradas.length === 0}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="export-excel-btn"
            title="Exportar para Excel (CSV)"
          >
            <FileSpreadsheet size={18} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            disabled={movimentacoesFiltradas.length === 0}
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg hover:bg-red-700 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            data-testid="export-pdf-btn"
            title="Exportar para PDF"
          >
            <Download size={18} />
            PDF
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
            data-testid="nova-movimentacao-btn"
          >
            <Plus size={20} />
            Nova Movimentação
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-wrap items-center gap-3" data-testid="filtros-movimentacoes">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-gray-400" />
          <label className="text-sm text-gray-600">De:</label>
          <input
            type="date"
            value={filtroDataInicio}
            onChange={(e) => setFiltroDataInicio(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filtro-data-inicio"
          />
          <label className="text-sm text-gray-600">Até:</label>
          <input
            type="date"
            value={filtroDataFim}
            onChange={(e) => setFiltroDataFim(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filtro-data-fim"
          />
        </div>

        <div className="h-6 w-px bg-gray-200"></div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="filtro-tipo"
        >
          <option value="todos">Todos os tipos</option>
          <option value="entrada">Entradas</option>
          <option value="saida">Saídas</option>
        </select>

        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <input
            type="text"
            value={filtroBusca}
            onChange={(e) => setFiltroBusca(e.target.value)}
            placeholder="Buscar por item, complemento ou banco..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            data-testid="filtro-busca"
          />
        </div>

        <span className="text-xs text-gray-500">
          {movimentacoesFiltradas.length} de {movimentacoes.length} registros
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="w-8 px-2 py-4"></th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Data</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Tipo</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Item/Conta</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Complemento</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Banco</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Valor</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {movimentacoesFiltradas.length > 0 ? (
                movimentacoesFiltradas.map((mov) => {
                  const isDragging = dragState.dragId === mov.id;
                  const isDragOver = dragState.overId === mov.id;
                  return (
                    <tr
                      key={mov.id}
                      draggable
                      onDragStart={handleDragStart(mov.id)}
                      onDragOver={handleDragOver(mov.id)}
                      onDrop={handleDrop(mov.id)}
                      onDragEnd={handleDragEnd}
                      className={`group hover:bg-gray-50 transition ${isDragging ? 'opacity-30' : ''} ${isDragOver ? 'border-t-2 border-t-blue-500' : ''}`}
                      data-testid={`mov-row-${mov.id}`}
                    >
                      <td className="w-8 px-2 py-4 text-center" style={{ cursor: 'grab' }} title="Arraste para reordenar">
                        <GripVertical size={16} className="text-gray-300 group-hover:text-gray-500 inline-block" />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">{formatDate(mov.data)}</td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${
                            mov.tipo === 'entrada'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {mov.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {mov.plano_contas?.nome || '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{mov.complemento || '-'}</td>
                      <td className="px-6 py-4 text-sm text-gray-800">
                        {mov.contas_bancarias?.nome || '-'}
                      </td>
                      <td className={`px-6 py-4 text-sm font-semibold text-right ${
                        mov.tipo === 'entrada' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(mov.valor)}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(mov)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                            data-testid={`edit-mov-${mov.id}`}
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(mov.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Excluir"
                            data-testid={`delete-mov-${mov.id}`}
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    Nenhuma movimentação registrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
                {editingId ? 'Editar Movimentação' : 'Nova Movimentação'}
              </h2>
              <button
                onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={formData.data}
                    onChange={(e) => setFormData({ ...formData, data: e.target.value })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => {
                      setFormData({ ...formData, tipo: e.target.value, plano_contas_id: '' });
                      setBuscaItem('');
                    }}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="entrada">Entrada</option>
                    <option value="saida">Saída</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item/Conta *
                </label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      ref={itemInputRef}
                      type="text"
                      value={buscaItem}
                      onChange={(e) => {
                        setBuscaItem(e.target.value);
                        setFormData({ ...formData, plano_contas_id: '' });
                        setShowItemDropdown(true);
                      }}
                      onFocus={() => setShowItemDropdown(true)}
                      placeholder="Digite para buscar..."
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      data-testid="item-conta-input"
                    />
                  </div>
                  
                  {showItemDropdown && (
                    <div 
                      ref={dropdownRef}
                      className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
                    >
                      {itensFiltrados.length > 0 ? (
                        itensFiltrados.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => selecionarItem(item)}
                            className={`px-4 py-2 cursor-pointer hover:bg-blue-50 ${
                              formData.plano_contas_id === item.id ? 'bg-blue-100' : ''
                            }`}
                          >
                            <span className="text-sm">
                              {item.subcategoria ? (
                                <>
                                  <span className="text-gray-500">{item.subcategoria} → </span>
                                  <span className="font-medium">{item.nome}</span>
                                </>
                              ) : (
                                <span className="font-medium">{item.nome}</span>
                              )}
                            </span>
                          </div>
                        ))
                      ) : (
                        <div className="px-4 py-2 text-gray-500 text-sm">
                          Nenhum item encontrado
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {itensDisponiveis.length === 0 && (
                  <p className="text-xs text-amber-600 mt-1">
                    Nenhum item cadastrado. Vá em Configurações para criar o plano de contas.
                  </p>
                )}
                {/* Campo hidden para validação */}
                <input type="hidden" value={formData.plano_contas_id} required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conta Bancária *
                </label>
                <select
                  value={formData.conta_bancaria_id}
                  onChange={(e) => setFormData({ ...formData, conta_bancaria_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecione...</option>
                  {contas.map((conta) => (
                    <option key={conta.id} value={conta.id}>
                      {conta.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Valor *
                </label>
                <input
                  type="text"
                  value={formData.valorFormatado}
                  onChange={handleValorChange}
                  onBlur={handleValorBlur}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  placeholder="R$ 0,00"
                  data-testid="valor-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complemento
                </label>
                <textarea
                  value={formData.complemento}
                  onChange={(e) => setFormData({ ...formData, complemento: e.target.value })}
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Informações adicionais..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    resetForm();
                  }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
                  data-testid="salvar-movimentacao-btn"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
