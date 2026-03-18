import React, { useState, useEffect } from 'react';
import { planejamentoAPI, planoContasAPI } from '../services/api';
import { Plus, Edit2, Trash2, X } from 'lucide-react';

export default function PlanejamentoPage() {
  const [planejamentos, setPlanejamentos] = useState([]);
  const [planoContas, setPlanoContas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  
  const [formData, setFormData] = useState({
    mes: new Date().getMonth() + 1,
    ano: new Date().getFullYear(),
    plano_contas_id: '',
    valor_planejado: '',
  });

  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [planRes, planoRes] = await Promise.all([
        planejamentoAPI.getAll(),
        planoContasAPI.getAll(),
      ]);
      
      setPlanejamentos(planRes.data);
      setPlanoContas(planoRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const data = {
        ...formData,
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
    setFormData({
      mes: plan.mes,
      ano: plan.ano,
      plano_contas_id: plan.plano_contas_id,
      valor_planejado: plan.valor_planejado.toString(),
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
    });
    setEditingId(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="planejamento-page">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Planejamento Orçamentário</h1>
          <p className="text-gray-600 mt-1">Defina metas para cada plano de contas</p>
        </div>
        
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition shadow-md"
        >
          <Plus size={20} />
          Novo Planejamento
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Período</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Plano de Contas</th>
                <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">Valor Planejado</th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {planejamentos.length > 0 ? (
                planejamentos.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {new Date(plan.ano, plan.mes - 1).toLocaleDateString('pt-BR', {
                        month: 'long',
                        year: 'numeric',
                      })}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {plan.plano_contas?.nome || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-right text-blue-600">
                      {formatCurrency(plan.valor_planejado)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => handleEdit(plan)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(plan.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    Nenhum planejamento cadastrado
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
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-2xl font-bold text-gray-800">
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
                <label className="block text-sm font-medium text-gray-700 mb-2">Plano de Contas *</label>
                <select
                  value={formData.plano_contas_id}
                  onChange={(e) => setFormData({ ...formData, plano_contas_id: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione...</option>
                  {planoContas.map((plano) => (
                    <option key={plano.id} value={plano.id}>
                      {plano.nome} ({plano.tipo})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor Planejado *</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.valor_planejado}
                  onChange={(e) => setFormData({ ...formData, valor_planejado: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
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
