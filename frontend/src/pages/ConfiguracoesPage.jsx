import React, { useState, useEffect } from 'react';
import { planoContasAPI, contasAPI, dreAPI } from '../services/api';

const GRUPOS_DRE = [
  { codigo: "1", nome: "Receita Bruta", tipo: "receita" },
  { codigo: "2", nome: "Impostos Sobre Vendas", tipo: "despesa" },
  { codigo: "3", nome: "Outras Deduções", tipo: "despesa" },
  { codigo: "4", nome: "Custos com Fornecedores", tipo: "despesa" },
  { codigo: "21", nome: "Custos com Vendas", tipo: "despesa" },
  { codigo: "22", nome: "Custos com Produção", tipo: "despesa" },
  { codigo: "5", nome: "Gastos com Pessoal", tipo: "despesa" },
  { codigo: "6", nome: "Gastos com Ocupação", tipo: "despesa" },
  { codigo: "7", nome: "Gastos com Serviços de Terceiros", tipo: "despesa" },
  { codigo: "16", nome: "Gastos Operacionais", tipo: "despesa" },
  { codigo: "17", nome: "Gastos Financeiros", tipo: "despesa" },
  { codigo: "18", nome: "Gastos com Veículos", tipo: "despesa" },
  { codigo: "19", nome: "Despesas com Materiais e Equipamentos", tipo: "despesa" },
  { codigo: "20", nome: "Gastos Administrativos", tipo: "despesa" },
  { codigo: "9", nome: "Receitas não Operacionais", tipo: "receita" },
  { codigo: "10", nome: "Gastos não Operacionais", tipo: "despesa" },
  { codigo: "12", nome: "Investimentos", tipo: "despesa" },
];

export default function ConfiguracoesPage() {
  const [activeTab, setActiveTab] = useState('plano-contas');
  const [planoContas, setPlanoContas] = useState([]);
  const [contasBancarias, setContasBancarias] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showContaModal, setShowContaModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingConta, setEditingConta] = useState(null);
  const [criandoPlano, setCriandoPlano] = useState(false);
  
  const [formData, setFormData] = useState({
    nome: '',
    tipo: 'despesa',
    categoria: ''
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
      const [planoRes, contasRes] = await Promise.all([
        planoContasAPI.getAll(),
        contasAPI.getAll()
      ]);
      setPlanoContas(planoRes.data);
      setContasBancarias(contasRes.data);
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

  // Plano de Contas CRUD
  const handleSavePlano = async () => {
    try {
      if (editingItem) {
        await planoContasAPI.update(editingItem.id, formData);
      } else {
        await planoContasAPI.create(formData);
      }
      setShowModal(false);
      setEditingItem(null);
      setFormData({ nome: '', tipo: 'despesa', categoria: '' });
      carregarDados();
    } catch (error) {
      console.error('Erro ao salvar:', error);
      alert('Erro ao salvar plano de contas');
    }
  };

  const handleEditPlano = (item) => {
    setEditingItem(item);
    setFormData({
      nome: item.nome,
      tipo: item.tipo,
      categoria: item.categoria || ''
    });
    setShowModal(true);
  };

  const handleDeletePlano = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este plano de contas?')) return;
    try {
      await planoContasAPI.delete(id);
      carregarDados();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir. Este plano pode estar vinculado a movimentações.');
    }
  };

  // Contas Bancárias CRUD
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
    }).format(value);
  };

  const getGrupoDRENome = (codigo) => {
    const grupo = GRUPOS_DRE.find(g => g.codigo === codigo);
    return grupo ? `${codigo} - ${grupo.nome}` : codigo || 'Não definido';
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
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-600 text-sm">Gerencie plano de contas e contas bancárias</p>
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

      {/* Plano de Contas Tab */}
      {activeTab === 'plano-contas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Configure os planos de contas que serão usados nas movimentações e no DRE.
              O campo "Categoria DRE" define em qual linha do DRE a conta aparecerá.
            </p>
            <div className="flex gap-2">
              <button
                onClick={criarPlanoPadrao}
                disabled={criandoPlano}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                data-testid="criar-plano-padrao-btn"
              >
                {criandoPlano ? 'Criando...' : 'Criar Plano Padrão DRE'}
              </button>
              <button
                onClick={() => {
                  setEditingItem(null);
                  setFormData({ nome: '', tipo: 'despesa', categoria: '' });
                  setShowModal(true);
                }}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
                data-testid="adicionar-plano-btn"
              >
                + Adicionar Conta
              </button>
            </div>
          </div>

          {/* Tabela Plano de Contas */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full" data-testid="plano-contas-table">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 font-medium text-gray-700">Nome</th>
                  <th className="text-left p-3 font-medium text-gray-700">Tipo</th>
                  <th className="text-left p-3 font-medium text-gray-700">Categoria DRE</th>
                  <th className="text-right p-3 font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody>
                {planoContas.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-gray-500">
                      Nenhum plano de contas cadastrado. Clique em "Criar Plano Padrão DRE" para começar.
                    </td>
                  </tr>
                ) : (
                  planoContas.map((item) => (
                    <tr key={item.id} className="border-t border-gray-100 hover:bg-gray-50">
                      <td className="p-3">{item.nome}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.tipo === 'receita' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {item.tipo === 'receita' ? 'Receita' : 'Despesa'}
                        </span>
                      </td>
                      <td className="p-3 text-sm text-gray-600">
                        {getGrupoDRENome(item.categoria)}
                      </td>
                      <td className="p-3 text-right">
                        <button
                          onClick={() => handleEditPlano(item)}
                          className="text-cyan-600 hover:text-cyan-800 mr-3 text-sm"
                          data-testid={`edit-plano-${item.id}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePlano(item.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          data-testid={`delete-plano-${item.id}`}
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
      )}

      {/* Contas Bancárias Tab */}
      {activeTab === 'contas-bancarias' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Gerencie suas contas bancárias para controle de saldo.
            </p>
            <button
              onClick={() => {
                setEditingConta(null);
                setContaFormData({ nome: '', saldo_inicial: 0 });
                setShowContaModal(true);
              }}
              className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 text-sm"
              data-testid="adicionar-conta-btn"
            >
              + Adicionar Conta
            </button>
          </div>

          {/* Tabela Contas Bancárias */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full" data-testid="contas-bancarias-table">
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
                          data-testid={`edit-conta-${conta.id}`}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteConta(conta.id)}
                          className="text-red-600 hover:text-red-800 text-sm"
                          data-testid={`delete-conta-${conta.id}`}
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
      )}

      {/* Modal Plano de Contas */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md" data-testid="plano-contas-modal">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {editingItem ? 'Editar Plano de Contas' : 'Novo Plano de Contas'}
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  placeholder="Ex: Vendas de Produtos"
                  data-testid="plano-nome-input"
                />
              </div>

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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria DRE</label>
                <select
                  value={formData.categoria}
                  onChange={(e) => setFormData({ ...formData, categoria: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
                  data-testid="plano-categoria-select"
                >
                  <option value="">Selecione a linha do DRE</option>
                  {GRUPOS_DRE.filter(g => g.tipo === formData.tipo).map((grupo) => (
                    <option key={grupo.codigo} value={grupo.codigo}>
                      {grupo.codigo} - {grupo.nome}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Define em qual linha do DRE este plano de contas aparecerá
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingItem(null);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
                data-testid="cancelar-plano-btn"
              >
                Cancelar
              </button>
              <button
                onClick={handleSavePlano}
                className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
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
                onClick={() => {
                  setShowContaModal(false);
                  setEditingConta(null);
                }}
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
