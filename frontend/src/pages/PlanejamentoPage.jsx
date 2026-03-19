import React, { useState, useEffect } from 'react';
import { planejamentoAPI, planoContasAPI } from '../services/api';
import { Plus, Edit2, Trash2, X, ChevronDown, ChevronRight } from 'lucide-react';

// Categorias fixas do DRE
const CATEGORIAS_DRE = {
  receita_bruta: { nome: "(+) Receita Bruta", cor: "cyan" },
  deducoes_vendas: { nome: "(-) Deduções Sobre Vendas", cor: "red" },
  custos_variaveis: { nome: "(-) Custos Variáveis", cor: "red" },
  custos_fixos: { nome: "(-) Custos Fixos", cor: "red" },
  resultado_nao_operacional: { nome: "Resultado Não Operacional", cor: "gray" },
};

export default function PlanejamentoPage() {
  const [planejamentos, setPlanejamentos] = useState([]);
  const [hierarquia, setHierarquia] = useState({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({});
  
  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    plano_contas_id: '',
    valor_planejado: '',
    valorFormatado: ''
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [planRes, hierRes] = await Promise.all([
        planejamentoAPI.getAll(),
        planoContasAPI.getHierarquico(),
      ]);
      
      setPlanejamentos(planRes.data);
      setHierarquia(hierRes.data);
      
      // Expandir todas categorias
      const expanded = {};
      Object.keys(hierRes.data || {}).forEach(catId => {
        expanded[catId] = true;
      });
      setExpandedCategories(expanded);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Extrair itens (nível 3) do plano de contas
  const getItensPlanoContas = () => {
    const itens = [];
    
    Object.entries(hierarquia).forEach(([catId, categoria]) => {
      (categoria.subcategorias || []).forEach(subcat => {
        (subcat.itens || []).forEach(item => {
          itens.push({
            id: item.id,
            nome: item.nome,
            subcategoria: subcat.nome,
            categoria: categoria.nome,
            categoriaId: catId
          });
        });
        
        // Se subcategoria não tem itens, usar ela mesma
        if (!subcat.itens || subcat.itens.length === 0) {
          itens.push({
            id: subcat.id,
            nome: subcat.nome,
            subcategoria: '',
            categoria: categoria.nome,
            categoriaId: catId
          });
        }
      });
    });

    return itens;
  };

  const formatarValorInput = (valor) => {
    const numeros = valor.replace(/\D/g, '');
    const decimal = (parseInt(numeros) / 100).toFixed(2);
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(decimal);
  };

  const handleValorChange = (e) => {
    const inputValue = e.target.value;
    const numeros = inputValue.replace(/\D/g, '');
    const valorNumerico = parseInt(numeros) / 100 || 0;
    
    setFormData({
      ...formData,
      valor_planejado: valorNumerico.toString(),
      valorFormatado: numeros ? formatarValorInput(inputValue) : ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        mes: formData.mes,
        ano: formData.ano,
        plano_contas_id: formData.plano_contas_id,
        valor_planejado: parseFloat(formData.valor_planejado),
      };

      if (editingId) {
        await planejamentoAPI.update(editingId, data);
      } else {
        await planejamentoAPI.create(data);
      }
      
      setShowModal(false);
      resetForm();
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert(error.response?.data?.detail || 'Erro ao salvar planejamento');
    }
  };

  const handleEdit = (plan) => {
    setEditingId(plan.id);
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(plan.valor_planejado);
    
    setFormData({
      mes: plan.mes,
      ano: plan.ano,
      plano_contas_id: plan.plano_contas_id,
      valor_planejado: plan.valor_planejado.toString(),
      valorFormatado: valorFormatado
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Deseja realmente excluir este planejamento?')) return;
    
    try {
      await planejamentoAPI.delete(id);
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      mes: new Date().getMonth() + 1,
      ano: new Date().getFullYear(),
      plano_contas_id: '',
      valor_planejado: '',
      valorFormatado: ''
    });
    setEditingId(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const toggleCategoria = (catId) => {
    setExpandedCategories(prev => ({
      ...prev,
      [catId]: !prev[catId]
    }));
  };

  const getCorClasse = (cor) => {
    const cores = {
      cyan: 'bg-cyan-50 border-cyan-200 text-cyan-700',
      red: 'bg-red-50 border-red-200 text-red-700',
      gray: 'bg-gray-50 border-gray-200 text-gray-700',
    };
    return cores[cor] || 'bg-gray-50 border-gray-200';
  };

  // Agrupar planejamentos por categoria DRE
  const planejamentosPorCategoria = () => {
    const agrupado = {};
    const itens = getItensPlanoContas();
    
    planejamentos.forEach(plan => {
      const item = itens.find(i => i.id === plan.plano_contas_id);
      if (item) {
        if (!agrupado[item.categoriaId]) {
          agrupado[item.categoriaId] = [];
        }
        agrupado[item.categoriaId].push({
          ...plan,
          itemNome: item.nome,
          subcategoria: item.subcategoria
        });
      }
    });
    
    return agrupado;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const itensDisponiveis = getItensPlanoContas();
  const planejamentosAgrupados = planejamentosPorCategoria();

  return (
    <div className="space-y-6" data-testid="planejamento-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Planejamento Orçamentário</h1>
          <p className="text-gray-600 text-sm">Defina metas seguindo a estrutura do DRE</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
          data-testid="novo-planejamento-btn"
        >
          <Plus size={20} />
          Novo Planejamento
        </button>
      </div>

      {/* Visualização por Categoria DRE */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {Object.entries(CATEGORIAS_DRE).map(([catId, catInfo]) => {
          const isExpanded = expandedCategories[catId];
          const planejamentosCat = planejamentosAgrupados[catId] || [];

          return (
            <div key={catId} className="border-b border-gray-200 last:border-b-0">
              {/* Header da Categoria */}
              <div 
                className={`flex items-center justify-between p-4 ${getCorClasse(catInfo.cor)} cursor-pointer hover:opacity-90`}
                onClick={() => toggleCategoria(catId)}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  <span className="font-semibold">{catInfo.nome}</span>
                  <span className="text-xs bg-white/50 px-2 py-0.5 rounded">
                    {planejamentosCat.length} itens planejados
                  </span>
                </div>
                <span className="font-bold">
                  {formatCurrency(planejamentosCat.reduce((a, p) => a + p.valor_planejado, 0))}
                </span>
              </div>

              {/* Itens da Categoria */}
              {isExpanded && (
                <div className="bg-white">
                  {planejamentosCat.length === 0 ? (
                    <div className="p-4 pl-10 text-sm text-gray-500 italic">
                      Nenhum planejamento cadastrado para esta categoria
                    </div>
                  ) : (
                    <table className="w-full">
                      <thead className="bg-gray-50 text-xs text-gray-500">
                        <tr>
                          <th className="text-left p-3 pl-10">Item</th>
                          <th className="text-left p-3">Período</th>
                          <th className="text-right p-3">Valor Planejado</th>
                          <th className="text-center p-3">Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {planejamentosCat.map(plan => (
                          <tr key={plan.id} className="border-t border-gray-100 hover:bg-gray-50">
                            <td className="p-3 pl-10">
                              <span className="font-medium">{plan.itemNome}</span>
                              {plan.subcategoria && (
                                <span className="text-xs text-gray-500 block">{plan.subcategoria}</span>
                              )}
                            </td>
                            <td className="p-3 text-sm">
                              {new Date(plan.ano, plan.mes - 1).toLocaleDateString('pt-BR', {
                                month: 'long',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="p-3 text-right font-semibold text-blue-600">
                              {formatCurrency(plan.valor_planejado)}
                            </td>
                            <td className="p-3">
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleEdit(plan); }}
                                  className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDelete(plan.id); }}
                                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Editar Planejamento' : 'Novo Planejamento'}
              </h2>
              <button onClick={() => { setShowModal(false); resetForm(); }} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mês *</label>
                  <select
                    value={formData.mes}
                    onChange={(e) => setFormData({ ...formData, mes: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={m}>
                        {new Date(2000, m - 1).toLocaleDateString('pt-BR', { month: 'long' })}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ano *</label>
                  <select
                    value={formData.ano}
                    onChange={(e) => setFormData({ ...formData, ano: parseInt(e.target.value) })}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map((a) => (
                      <option key={a} value={a}>
                        {a}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Item/Conta *</label>
                <select
                  value={formData.plano_contas_id}
                  onChange={(e) => setFormData({ ...formData, plano_contas_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  data-testid="item-select"
                >
                  <option value="">Selecione...</option>
                  {Object.entries(CATEGORIAS_DRE).map(([catId, catInfo]) => (
                    <optgroup key={catId} label={catInfo.nome}>
                      {itensDisponiveis
                        .filter(item => item.categoriaId === catId)
                        .map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.subcategoria ? `${item.subcategoria} → ${item.nome}` : item.nome}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Planejado *</label>
                <input
                  type="text"
                  value={formData.valorFormatado}
                  onChange={handleValorChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-lg font-semibold"
                  placeholder="R$ 0,00"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowModal(false); resetForm(); }}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
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
