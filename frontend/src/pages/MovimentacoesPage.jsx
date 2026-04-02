import React, { useState, useEffect, useRef } from 'react';
import { movimentacoesAPI, planoContasAPI, contasAPI } from '../services/api';
import { Plus, Edit2, Trash2, X, Search } from 'lucide-react';

export default function MovimentacoesPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [hierarquia, setHierarquia] = useState({});
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
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

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [movRes, hierRes, contasRes] = await Promise.all([
        movimentacoesAPI.getAll(),
        planoContasAPI.getHierarquico(),
        contasAPI.getAll(),
      ]);
      
      setMovimentacoes(movRes.data);
      setHierarquia(hierRes.data);
      setContas(contasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      alert('Erro ao carregar dados');
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

  // Formatar valor como moeda brasileira (sem centavos)
  const formatarValorInput = (valor) => {
    // Remove tudo que não é número
    const numeros = valor.replace(/\D/g, '');
    
    // Converte para inteiro (sem centavos)
    const inteiro = parseInt(numeros) || 0;
    
    // Formata como moeda sem centavos
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(inteiro);
  };

  const handleValorChange = (e) => {
    const inputValue = e.target.value;
    const numeros = inputValue.replace(/\D/g, '');
    const valorNumerico = parseInt(numeros) || 0;
    
    setFormData({
      ...formData,
      valor: valorNumerico.toString(),
      valorFormatado: numeros ? formatarValorInput(inputValue) : ''
    });
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
      carregarDados();
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
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
      carregarDados();
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateString) => {
    return new Date(dateString + 'T00:00:00').toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const itensDisponiveis = getItensPlanoContas(formData.tipo);

  return (
    <div className="space-y-6" data-testid="movimentacoes-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Movimentação Financeira</h1>
          <p className="text-gray-600 text-sm">Registre todas as suas transações</p>
        </div>
        
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

      {/* Tabela */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
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
              {movimentacoes.length > 0 ? (
                movimentacoes.map((mov) => (
                  <tr key={mov.id} className="hover:bg-gray-50 transition">
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
                    <td className="px-6 py-4">
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
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
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
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-semibold"
                  placeholder="R$ 0"
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
