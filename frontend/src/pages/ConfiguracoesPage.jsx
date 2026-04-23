import React, { useState, useEffect, useRef } from 'react';
import { planoContasAPI, contasAPI, dreAPI, invalidateCache } from '../services/api';
import { GripVertical } from 'lucide-react';

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

const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

// Categorias fixas do DRE
const CATEGORIAS_DRE = {
  receita_bruta: { nome: "(+) Receita Bruta", tipo: "receita", cor: "cyan" },
  deducoes_vendas: { nome: "(-) Deduções Sobre Vendas", tipo: "despesa", cor: "red" },
  custos_variaveis: { nome: "(-) Custos Variáveis", tipo: "despesa", cor: "red" },
  custos_fixos: { nome: "(-) Custos Fixos", tipo: "despesa", cor: "red" },
  resultado_nao_operacional: { nome: "(=) Resultado Não Operacional", tipo: "misto", cor: "amber" },
};

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('plano-contas');
  const [hierarquia, setHierarquia] = useState({});
  const [contasBancarias, setContasBancarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showContaModal, setShowContaModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingConta, setEditingConta] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  const [expandedSubcats, setExpandedSubcats] = useState({});
  
  // Drag & Drop
  const [dragState, setDragState] = useState({ dragId: null, dragCatId: null, overId: null });
  const dragRef = useRef(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'despesa',
    categoria: '',
    nivel: 2,
    parent_id: null
  });

  const [contaFormData, setContaFormData] = useState({
    nome: '',
    saldo_inicial: 0
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [hierarquiaRes, contasRes] = await Promise.all([
        planoContasAPI.getHierarquico(),
        contasAPI.getAll()
      ]);
      setHierarquia(hierarquiaRes.data);
      setContasBancarias(contasRes.data);
      
      // Expandir todas as categorias por padrão
      const expanded = {};
      Object.keys(hierarquiaRes.data || {}).forEach(catId => {
        expanded[catId] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarPlanoPadrao = async () => {
    try {
      setCriandoPlano(true);
      await dreAPI.criarPlanoPadrao();
      alert('Plano de contas padrão criado com sucesso!');
      carregarDados();
    } catch (error) {
      console.error('Erro ao criar plano de contas:', error);
      alert('Erro ao criar plano de contas padrão');
    } finally {
      setCriandoPlano(false);
    }
  };

  const toggleCategoria = (catId) => {
    setExpandedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  const toggleSubcat = (subcatId) => {
    setExpandedSubcats(prev => ({ ...prev, [subcatId]: !prev[subcatId] }));
  };

  // CRUD Plano de Contas
  const handleAddSubcategoria = (categoriaId) => {
    const categoriaTipo = CATEGORIAS_DRE[categoriaId]?.tipo;
    setEditingItem(null);
    setFormData({
      nome: '',
      tipo: categoriaTipo === 'misto' ? 'despesa' : categoriaTipo,
      categoria: categoriaId,
      nivel: 2,
      parent_id: null
    });
    setShowModal(true);
  };

  const handleAddItem = (subcategoria) => {
    setEditingItem(null);
    setFormData({
      nome: '',
      tipo: subcategoria.tipo,
      categoria: subcategoria.categoria,
      nivel: 3,
      parent_id: subcategoria.id
    });
    setShowModal(true);
  };

  const handleEditItem = (item, nivel) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      categoria: item.categoria,
      nivel: nivel,
      parent_id: item.parent_id
    });
    setShowModal(true);
  };

  const handleSavePlano = async () => {
    try {
      if (editingItem) {
        await planoContasAPI.update(editingItem.id, { nome: formData.nome, tipo: formData.tipo });
      } else {
        await planoContasAPI.create(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      invalidateCache('/api/plano-contas');
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar plano de contas');
    }
  };

  const handleDeletePlano = async (id, nome) => {
    if (!confirm(`Tem certeza que deseja excluir "${nome}" e todos os itens vinculados?`)) return;
    try {
      await planoContasAPI.delete(id);
      invalidateCache('/api/plano-contas');
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert(error.response?.data?.detail || 'Erro ao excluir.');
    }
  };

  // ========== DRAG & DROP ==========
  const handleDragStart = (catId, subcatId) => (e) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', subcatId);
    dragRef.current = { dragId: subcatId, dragCatId: catId };
    setDragState({ dragId: subcatId, dragCatId: catId, overId: null });
  };

  const handleDragOver = (catId, subcatId) => (e) => {
    e.preventDefault();
    if (!dragRef.current || dragRef.current.dragCatId !== catId || dragRef.current.dragId === subcatId) return;
    e.dataTransfer.dropEffect = 'move';
    setDragState(prev => ({ ...prev, overId: subcatId }));
  };

  const handleDrop = (catId) => async (e) => {
    e.preventDefault();
    const ds = dragRef.current;
    const overId = dragState.overId;
    if (!ds || ds.dragCatId !== catId || !overId || ds.dragId === overId) {
      setDragState({ dragId: null, dragCatId: null, overId: null });
      dragRef.current = null;
      return;
    }

    const subcats = [...(hierarquia[catId]?.subcategorias || [])];
    const dragIndex = subcats.findIndex(s => s.id === ds.dragId);
    const overIndex = subcats.findIndex(s => s.id === overId);
    if (dragIndex === -1 || overIndex === -1) return;

    const [moved] = subcats.splice(dragIndex, 1);
    subcats.splice(overIndex, 0, moved);

    setHierarquia(prev => ({
      ...prev,
      [catId]: { ...prev[catId], subcategorias: subcats }
    }));
    setDragState({ dragId: null, dragCatId: null, overId: null });
    dragRef.current = null;

    // Persistir ordem
    const reorderData = subcats.map((s, i) => ({ id: s.id, ordem: i }));
    try {
      await planoContasAPI.reorder(reorderData);
      invalidateCache('/api/plano-contas');
    } catch (err) {
      console.error('Erro ao reordenar:', err);
    }
  };

  const handleDragEnd = () => {
    setDragState({ dragId: null, dragCatId: null, overId: null });
    dragRef.current = null;
  };

  // CRUD Contas Bancárias
  const handleSaveConta = async () => {
    try {
      if (editingConta) {
        await contasAPI.update(editingConta.id, contaFormData);
      } else {
        await contasAPI.create(contaFormData);
      }
      setShowContaModal(false);
      setEditingConta(null);
      setContaFormData({ nome: '', saldo_inicial: 0 });
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar conta bancária');
    }
  };

  const handleEditConta = (conta) => {
    setEditingConta(conta);
    setContaFormData({
      nome: conta.nome,
      saldo_inicial: conta.saldo_inicial
    });
    setShowContaModal(true);
  };

  const handleDeleteConta = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta conta bancária?')) return;
    try {
      await contasAPI.delete(id);
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Esta conta pode ter movimentações vinculadas.');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getCorClasse = (cor) => {
    const cores = {
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      amber: 'bg-amber-50 border-amber-200 text-amber-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return cores[cor] || 'bg-gray-50 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="configuracoes-page">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-600 text-sm">Gerencie plano de contas hierárquico e contas bancárias</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('plano-contas')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plano-contas'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-plano-contas"
          >
            Plano de Contas
          </button>
          <button
            onClick={() => setActiveTab('contas-bancarias')}
            className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'contas-bancarias'
                ? 'border-cyan-600 text-cyan-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-contas-bancarias"
          >
            Contas Bancárias
          </button>
        </nav>
      </div>

      {/* Plano de Contas Tab - Tree View */}
      {activeTab === 'plano-contas' && (
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-600">
              Estrutura hierárquica: <strong>Categoria (fixa)</strong> → <strong>Subcategoria</strong> → <strong>Item/Conta</strong>
            </p>
            <p className="text-xs text-gray-500">
              Categorias são fixas. Você pode adicionar, editar e excluir subcategorias e itens.
            </p>
          </div>

          {/* Tree View do Plano de Contas */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            {Object.entries(CATEGORIAS_DRE).map(([catId, catInfo]) => {
              const catData = hierarquia[catId];
              const isExpanded = expandedCategories[catId];
              const subcategorias = catData?.subcategorias || [];

              return (
                <div key={catId} className="border-b border-gray-200 last:border-b-0">
                  {/* Categoria (Nível 1 - Fixa) */}
                  <div 
                    className={`flex items-center justify-between p-3 ${getCorClasse(catInfo.cor)} cursor-pointer hover:opacity-90`}
                    onClick={() => toggleCategoria(catId)}
                    data-testid={`categoria-${catId}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="transition-transform duration-200">
                        {isExpanded ? <ChevronDown /> : <ChevronRight />}
                      </span>
                      <span className="font-semibold">{catInfo.nome}</span>
                      <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                        {subcategorias.length} subcategorias
                      </span>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAddSubcategoria(catId); }}
                      className="flex items-center gap-1 px-2 py-1 text-xs bg-white/70 hover:bg-white rounded transition-colors"
                      data-testid={`add-subcat-${catId}`}
                    >
                      <PlusIcon /> Subcategoria
                    </button>
                  </div>

                  {/* Subcategorias (Nível 2) - Com Drag & Drop */}
                  {isExpanded && (
                    <div className="bg-white">
                      {subcategorias.length === 0 ? (
                        <div className="p-4 pl-10 text-sm text-gray-500 italic">
                          Nenhuma subcategoria cadastrada
                        </div>
                      ) : (
                        subcategorias.map((subcat) => {
                          const isSubExpanded = expandedSubcats[subcat.id];
                          const itens = subcat.itens || [];
                          const isDragging = dragState.dragId === subcat.id;
                          const isDragOver = dragState.overId === subcat.id && dragState.dragCatId === catId;

                          return (
                            <div 
                              key={subcat.id} 
                              className={`border-t border-gray-100 transition-all duration-150 ${isDragging ? 'opacity-30' : ''} ${isDragOver ? 'border-t-2 border-t-blue-500' : ''}`}
                              draggable
                              onDragStart={handleDragStart(catId, subcat.id)}
                              onDragOver={handleDragOver(catId, subcat.id)}
                              onDrop={handleDrop(catId)}
                              onDragEnd={handleDragEnd}
                            >
                              {/* Subcategoria */}
                              <div 
                                className="flex items-center justify-between p-3 pl-4 hover:bg-gray-50 group"
                                style={{ cursor: 'grab' }}
                                data-testid={`subcategoria-${subcat.id}`}
                              >
                                <div className="flex items-center gap-2" onClick={() => toggleSubcat(subcat.id)} style={{ cursor: 'pointer' }}>
                                  <GripVertical size={14} className="text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                                  <span className="transition-transform duration-200">
                                    {itens.length > 0 && (isSubExpanded ? <ChevronDown /> : <ChevronRight />)}
                                    {itens.length === 0 && <span className="w-4"></span>}
                                  </span>
                                  <span className="font-medium text-gray-700">{subcat.nome}</span>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    subcat.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                  }`}>
                                    {subcat.tipo}
                                  </span>
                                  {itens.length > 0 && (
                                    <span className="text-xs text-gray-400">
                                      ({itens.length} itens)
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    onClick={() => handleAddItem(subcat)}
                                    className="text-xs text-cyan-600 hover:text-cyan-800 flex items-center gap-1"
                                    data-testid={`add-item-${subcat.id}`}
                                  >
                                    <PlusIcon /> Item
                                  </button>
                                  <button
                                    onClick={() => handleEditItem(subcat, 2)}
                                    className="text-xs text-gray-600 hover:text-gray-800"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    onClick={() => handleDeletePlano(subcat.id, subcat.nome)}
                                    className="text-xs text-red-600 hover:text-red-800"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>

                              {/* Itens (Nível 3) */}
                              {isSubExpanded && itens.length > 0 && (
                                <div className="bg-gray-50">
                                  {itens.map((item) => (
                                    <div 
                                      key={item.id}
                                      className="flex items-center justify-between p-2 pl-16 border-t border-gray-100 hover:bg-gray-100"
                                      data-testid={`item-${item.id}`}
                                    >
                                      <div className="flex items-center gap-2">
                                        <span className="text-gray-400">•</span>
                                        <span className="text-sm text-gray-600">{item.nome}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => handleEditItem(item, 3)}
                                          className="text-xs text-gray-500 hover:text-gray-700"
                                        >
                                          Editar
                                        </button>
                                        <button
                                          onClick={() => handleDeletePlano(item.id, item.nome)}
                                          className="text-xs text-red-500 hover:text-red-700"
                                        >
                                          Excluir
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Contas Bancárias Tab */}
      {activeTab === 'contas-bancarias' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <p className="text-sm text-gray-600">
              Gerencie suas contas bancárias para controle de saldo.
            </p>
            <button
              onClick={() => {
                setEditingConta(null);
                setContaFormData({ nome: '', saldo_inicial: 0 });
                setShowContaModal(true);
              }}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm whitespace-nowrap"
              data-testid="adicionar-conta-btn"
            >
              + Adicionar Conta
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px]" data-testid="contas-bancarias-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Nome</th>
                  <th className="text-right p-3 font-medium text-gray-700">Saldo Inicial</th>
                  <th className="text-right p-3 font-medium text-gray-700">Saldo Atual</th>
                  <th className="text-right p-3 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {contasBancarias.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      Nenhuma conta bancária cadastrada.
                    </td>
                  </tr>
                ) : (
                  contasBancarias.map((conta) => (
                    <tr key={conta.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3 font-medium">{conta.nome}</td>
                      <td className="p-3 text-right">{formatCurrency(conta.saldo_inicial)}</td>
                      <td className={`p-3 text-right font-semibold ${
                        conta.saldo_atual >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatCurrency(conta.saldo_atual)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleEditConta(conta)}
                          className="text-cyan-600 hover:text-cyan-800 mr-3 text-sm"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteConta(conta.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal Plano de Contas */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" data-testid="plano-contas-modal">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingItem ? 'Editar' : 'Adicionar'} {formData.nivel === 2 ? 'Subcategoria' : 'Item'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder={formData.nivel === 2 ? "Ex: Gastos com Pessoal" : "Ex: Folha Salarial"}
                  data-testid="plano-nome-input"
                />
              </div>

              {formData.nivel === 2 && CATEGORIAS_DRE[formData.categoria]?.tipo === 'misto' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                  <select
                    value={formData.tipo}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                    data-testid="plano-tipo-select"
                  >
                    <option value="receita">Receita (Entrada)</option>
                    <option value="despesa">Despesa (Saída)</option>
                  </select>
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p><strong>Categoria:</strong> {CATEGORIAS_DRE[formData.categoria]?.nome}</p>
                <p><strong>Nível:</strong> {formData.nivel === 2 ? 'Subcategoria' : 'Item/Conta'}</p>
                <p><strong>Tipo:</strong> {formData.tipo === 'receita' ? 'Receita' : 'Despesa'}</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowModal(false); setEditingItem(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                data-testid="cancelar-plano-btn"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlano}
                disabled={!formData.nome.trim()}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                data-testid="salvar-plano-btn"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Conta Bancária */}
      {showContaModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" data-testid="conta-bancaria-modal">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingConta ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Conta</label>
                <input
                  type="text"
                  value={contaFormData.nome}
                  onChange={(e) => setContaFormData({ ...contaFormData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex: Banco do Brasil"
                  data-testid="conta-nome-input"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={contaFormData.saldo_inicial}
                  onChange={(e) => setContaFormData({ ...contaFormData, saldo_inicial: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="0.00"
                  data-testid="conta-saldo-input"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowContaModal(false); setEditingConta(null); }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                data-testid="cancelar-conta-btn"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveConta}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                data-testid="salvar-conta-btn"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
