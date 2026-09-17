import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, Pencil, Check, X, CalendarDays, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

const STORAGE_KEY = 'projecao_contas_pagar_v1';

const CATEGORIAS = [
  'Fornecedores', 'Salários', 'Impostos', 'Aluguel', 'Energia', 'Água',
  'Internet/Telefone', 'Empréstimos', 'Manutenção', 'Outros',
];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const parseNumero = (str) => {
  if (str === null || str === undefined) return 0;
  let s = String(str).replace(/[^\d,\-]/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};
const fmtMoeda = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const fmtNumero = (n) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const hoje = () => new Date().toISOString().split('T')[0];
const toDate = (iso) => new Date(iso + 'T00:00:00');
const fmtData = (iso) => toDate(iso).toLocaleDateString('pt-BR');
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const formVazio = () => ({
  descricao: '', valor: '', vencimento: hoje(), categoria: 'Fornecedores', status: 'pendente',
});

export default function ContasAPagar() {
  const [contas, setContas] = useState([]);
  const [carregado, setCarregado] = useState(false);

  const [form, setForm] = useState(formVazio());
  const [editingId, setEditingId] = useState(null);

  // Filtro
  const [modo, setModo] = useState('mes'); // 'mes' | 'periodo'
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [de, setDe] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [ate, setAte] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setContas(JSON.parse(raw) || []);
    } catch (e) { console.error('Erro ao carregar contas a pagar:', e); }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(contas)); }
    catch (e) { console.error('Erro ao salvar contas a pagar:', e); }
  }, [contas, carregado]);

  // Intervalo efetivo do filtro
  const range = useMemo(() => {
    if (modo === 'mes') {
      const start = new Date(ano, mes - 1, 1);
      const end = new Date(ano, mes, 0);
      return { start, end };
    }
    let start = toDate(de);
    let end = toDate(ate);
    if (start > end) [start, end] = [end, start];
    return { start, end };
  }, [modo, ano, mes, de, ate]);

  const dentroDoRange = (iso) => {
    const d = toDate(iso);
    return d >= range.start && d <= range.end;
  };

  const filtradas = useMemo(
    () => contas.filter((c) => dentroDoRange(c.vencimento)).sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [contas, range]
  );

  // Resumo
  const resumo = useMemo(() => {
    const total = filtradas.reduce((a, c) => a + (Number(c.valor) || 0), 0);
    const pago = filtradas.filter((c) => c.status === 'pago').reduce((a, c) => a + (Number(c.valor) || 0), 0);
    return { total, pago, pendente: total - pago };
  }, [filtradas]);

  // Dados do gráfico (linha única: total por período)
  const chartData = useMemo(() => {
    const diffDias = Math.round((range.end - range.start) / 86400000);
    const diario = diffDias <= 62;
    const buckets = [];
    const mapa = {};

    if (diario) {
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const key = cursor.toISOString().split('T')[0];
        const label = `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        mapa[key] = { label, total: 0 };
        buckets.push(key);
        cursor.setDate(cursor.getDate() + 1);
      }
      filtradas.forEach((c) => { if (mapa[c.vencimento]) mapa[c.vencimento].total += Number(c.valor) || 0; });
    } else {
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      const fim = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
      while (cursor <= fim) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        const label = `${MES_CURTO[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`;
        mapa[key] = { label, total: 0 };
        buckets.push(key);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      filtradas.forEach((c) => {
        const key = c.vencimento.slice(0, 7);
        if (mapa[key]) mapa[key].total += Number(c.valor) || 0;
      });
    }
    return buckets.map((k) => ({ periodo: mapa[k].label, total: Number(mapa[k].total.toFixed(2)) }));
  }, [filtradas, range]);

  // CRUD
  const salvar = () => {
    const descricao = form.descricao.trim();
    const valor = parseNumero(form.valor);
    if (!descricao) { alert('Informe a descrição da conta.'); return; }
    if (!valor) { alert('Informe um valor maior que zero.'); return; }
    if (!form.vencimento) { alert('Informe a data de vencimento.'); return; }

    if (editingId) {
      setContas((prev) => prev.map((c) => (c.id === editingId ? { ...c, descricao, valor, vencimento: form.vencimento, categoria: form.categoria, status: form.status } : c)));
    } else {
      setContas((prev) => [...prev, { id: uid(), descricao, valor, vencimento: form.vencimento, categoria: form.categoria, status: form.status }]);
    }
    setForm(formVazio());
    setEditingId(null);
  };

  const editar = (c) => {
    setEditingId(c.id);
    setForm({ descricao: c.descricao, valor: String(c.valor).replace('.', ','), vencimento: c.vencimento, categoria: c.categoria, status: c.status });
  };
  const cancelarEdicao = () => { setForm(formVazio()); setEditingId(null); };
  const excluir = (id) => { if (confirm('Excluir esta conta a pagar?')) setContas((prev) => prev.filter((c) => c.id !== id)); };
  const toggleStatus = (id) => setContas((prev) => prev.map((c) => (c.id === id ? { ...c, status: c.status === 'pago' ? 'pendente' : 'pago' } : c)));

  const isVencida = (c) => c.status === 'pendente' && c.vencimento < hoje();

  return (
    <div className="space-y-5" data-testid="contas-pagar-view">
      {/* Filtro */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-gray-400" />
          <select value={modo} onChange={(e) => setModo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid="filtro-modo-select">
            <option value="mes">Por mês</option>
            <option value="periodo">Período (De/Até)</option>
          </select>
        </div>

        {modo === 'mes' ? (
          <div className="flex items-center gap-2">
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid="filtro-mes-select">
              {MES_CURTO.map((m, i) => <option key={m} value={i + 1}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value) || now.getFullYear())}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid="filtro-ano-input" />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600">De:</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="filtro-de-input" />
            <label className="text-sm text-gray-600">Até:</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="filtro-ate-input" />
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 md:gap-4" data-testid="contas-pagar-resumo">
        <div className="rounded-xl shadow border p-3 md:p-4 bg-slate-50 border-slate-200 text-slate-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Total a Pagar</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="resumo-total">{fmtMoeda(resumo.total)}</p>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-green-50 border-green-100 text-green-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Pago</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="resumo-pago">{fmtMoeda(resumo.pago)}</p>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-red-50 border-red-100 text-red-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Pendente</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="resumo-pendente">{fmtMoeda(resumo.pendente)}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Contas a pagar por período</h3>
        <div style={{ width: '100%', height: 260 }} data-testid="contas-pagar-chart">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fontSize: 11 }} width={70}
                tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v) => fmtMoeda(v)} />
              <Line type="monotone" dataKey="total" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} name="Total a pagar" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formulário de cadastro */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">
          {editingId ? 'Editar conta' : 'Adicionar conta a pagar'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Fornecedor XYZ - NF 123" data-testid="conta-descricao-input"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Valor (R$)</label>
            <input type="text" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0,00" data-testid="conta-valor-input"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Vencimento</label>
            <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              data-testid="conta-vencimento-input"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Categoria</label>
            <input type="text" list="categorias-list" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}
              data-testid="conta-categoria-input"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            <datalist id="categorias-list">
              {CATEGORIAS.map((c) => <option key={c} value={c} />)}
            </datalist>
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button onClick={salvar} data-testid="conta-salvar-btn"
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">
              {editingId ? <><Check size={16} /> Salvar</> : <><Plus size={16} /> Adicionar</>}
            </button>
            {editingId && (
              <button onClick={cancelarEdicao} className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50" title="Cancelar">
                <X size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lista de contas do período */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]" data-testid="contas-pagar-table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">Vencimento</th>
                <th className="text-left p-3 font-semibold text-gray-700">Descrição</th>
                <th className="text-left p-3 font-semibold text-gray-700">Categoria</th>
                <th className="text-right p-3 font-semibold text-gray-700">Valor</th>
                <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                <th className="text-center p-3 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhuma conta a pagar neste período.</td></tr>
              ) : filtradas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50" data-testid={`conta-row-${c.id}`}>
                  <td className={`p-3 whitespace-nowrap ${isVencida(c) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {fmtData(c.vencimento)}{isVencida(c) && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">vencida</span>}
                  </td>
                  <td className="p-3 text-gray-800">{c.descricao}</td>
                  <td className="p-3 text-gray-600">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c.categoria}</span>
                  </td>
                  <td className="p-3 text-right font-semibold text-gray-800 whitespace-nowrap">{fmtNumero(c.valor)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleStatus(c.id)} data-testid={`conta-status-${c.id}`}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${c.status === 'pago' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                      title="Clique para alternar">
                      {c.status === 'pago' ? 'Pago' : 'Pendente'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => editar(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar" data-testid={`conta-editar-${c.id}`}>
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => excluir(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir" data-testid={`conta-excluir-${c.id}`}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            {filtradas.length > 0 && (
              <tfoot className="bg-gray-100 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={3} className="p-3 font-bold text-right">Total do período ({filtradas.length}):</td>
                  <td className="p-3 text-right font-bold whitespace-nowrap">{fmtNumero(resumo.total)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>Estas contas são apenas para simulação/controle nesta aba e não afetam os relatórios do sistema. Salvas apenas neste navegador.</span>
      </div>
    </div>
  );
}
