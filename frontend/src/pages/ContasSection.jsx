import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Plus, Trash2, Pencil, Check, X, CalendarDays, Info, Repeat, Search } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { planoContasAPI } from '../services/api';

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

// Opções de recorrência do lançamento
const FREQ_OPTS = [
  { v: 'nenhuma', l: 'Não recorrente' },
  { v: 'semanal', l: 'Semanal' },
  { v: 'mensal', l: 'Mensal' },
  { v: 'anual', l: 'Anual' },
];

// Avança uma data ISO (YYYY-MM-DD) em i períodos conforme a frequência
const avancarData = (iso, freq, i) => {
  const d = toDate(iso);
  if (freq === 'semanal') d.setDate(d.getDate() + 7 * i);
  else if (freq === 'mensal') d.setMonth(d.getMonth() + i);
  else if (freq === 'anual') d.setFullYear(d.getFullYear() + i);
  return d.toISOString().split('T')[0];
};

/**
 * Componente genérico de "Contas a Pagar" / "Contas a Receber".
 * Config define rótulos, cores, chave do localStorage e prefixo de data-testid.
 * Status interno é sempre 'pago' (concluído) | 'pendente'; o rótulo é configurável.
 */
export default function ContasSection({ config }) {
  const {
    storageKey, prefix, viewTestid, chartTitle, lineColor, lineName,
    dateLabel, totalLabel, doneLabel, categorias, descricaoPlaceholder,
    isolamentoText, atrasadoLabel, tipoPlano,
  } = config;

  const formVazio = () => ({ descricao: '', valor: '', vencimento: hoje(), categoria: '', planoContasId: '', status: 'pendente', recorrencia: 'nenhuma', repeticoes: 12 });

  const [contas, setContas] = useState([]);
  const [carregado, setCarregado] = useState(false);
  const [form, setForm] = useState(formVazio());
  const [editingId, setEditingId] = useState(null);
  const [datasPreview, setDatasPreview] = useState([]);

  // Plano de contas (Item/Conta) - igual ao formulário de Movimentações
  const [hierarquia, setHierarquia] = useState({});
  const [buscaItem, setBuscaItem] = useState('');
  const [showItemDropdown, setShowItemDropdown] = useState(false);
  const itemInputRef = useRef(null);
  const itemDropdownRef = useRef(null);

  const [modo, setModo] = useState('mes');
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [de, setDe] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]);
  const [ate, setAte] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setContas(JSON.parse(raw) || []);
    } catch (e) { console.error('Erro ao carregar contas:', e); }
    setCarregado(true);
  }, [storageKey]);

  useEffect(() => {
    if (!carregado) return;
    try { localStorage.setItem(storageKey, JSON.stringify(contas)); }
    catch (e) { console.error('Erro ao salvar contas:', e); }
  }, [contas, carregado, storageKey]);

  // Preview das datas que serão geradas na recorrência (editáveis antes de salvar)
  useEffect(() => {
    if (editingId || form.recorrencia === 'nenhuma' || !form.vencimento) { setDatasPreview([]); return; }
    const total = Math.min(Math.max(parseInt(form.repeticoes) || 1, 1), 120);
    setDatasPreview(Array.from({ length: total }, (_, i) => avancarData(form.vencimento, form.recorrencia, i)));
  }, [form.recorrencia, form.vencimento, form.repeticoes, editingId]);

  // Carregar plano de contas hierárquico (para o campo Item/Conta)
  useEffect(() => {
    planoContasAPI.getHierarquico()
      .then((res) => setHierarquia(res.data || {}))
      .catch((e) => console.error('Erro ao carregar plano de contas:', e));
  }, []);

  // Fechar dropdown do Item/Conta ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (itemDropdownRef.current && !itemDropdownRef.current.contains(event.target) &&
          itemInputRef.current && !itemInputRef.current.contains(event.target)) {
        setShowItemDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Itens (nível 3, ou subcategoria sem itens) filtrados pelo tipo desta seção (despesa/receita)
  const itensDisponiveis = useMemo(() => {
    const itens = [];
    Object.entries(hierarquia).forEach(([, categoria]) => {
      (categoria.subcategorias || []).forEach((subcat) => {
        if (subcat.tipo === tipoPlano || categoria.tipo === 'misto') {
          (subcat.itens || []).forEach((item) => {
            if (item.tipo === tipoPlano) itens.push({ id: item.id, nome: item.nome, subcategoria: subcat.nome });
          });
          if ((!subcat.itens || subcat.itens.length === 0) && subcat.tipo === tipoPlano) {
            itens.push({ id: subcat.id, nome: subcat.nome, subcategoria: '' });
          }
        }
      });
    });
    return itens;
  }, [hierarquia, tipoPlano]);

  const itensFiltrados = useMemo(() => {
    const termo = buscaItem.toLowerCase().replace('→', ' ').replace(/\s+/g, ' ').trim();
    return itensDisponiveis.filter((item) => {
      if (!termo) return true;
      const txt = (item.subcategoria ? `${item.subcategoria} ${item.nome}` : item.nome).toLowerCase();
      return txt.includes(termo);
    });
  }, [buscaItem, itensDisponiveis]);

  const selecionarItem = (item) => {
    const label = item.subcategoria ? `${item.subcategoria} → ${item.nome}` : item.nome;
    setForm((f) => ({ ...f, planoContasId: item.id, categoria: label }));
    setBuscaItem(label);
    setShowItemDropdown(false);
  };

  const range = useMemo(() => {
    if (modo === 'mes') return { start: new Date(ano, mes - 1, 1), end: new Date(ano, mes, 0) };
    let start = toDate(de), end = toDate(ate);
    if (start > end) [start, end] = [end, start];
    return { start, end };
  }, [modo, ano, mes, de, ate]);

  const filtradas = useMemo(
    () => contas.filter((c) => { const d = toDate(c.vencimento); return d >= range.start && d <= range.end; })
      .sort((a, b) => a.vencimento.localeCompare(b.vencimento)),
    [contas, range]
  );

  const resumo = useMemo(() => {
    const total = filtradas.reduce((a, c) => a + (Number(c.valor) || 0), 0);
    const pago = filtradas.filter((c) => c.status === 'pago').reduce((a, c) => a + (Number(c.valor) || 0), 0);
    return { total, pago, pendente: total - pago };
  }, [filtradas]);

  const chartData = useMemo(() => {
    const diffDias = Math.round((range.end - range.start) / 86400000);
    const diario = diffDias <= 62;
    const buckets = [], mapa = {};
    if (diario) {
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const key = cursor.toISOString().split('T')[0];
        mapa[key] = { label: `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`, total: 0 };
        buckets.push(key);
        cursor.setDate(cursor.getDate() + 1);
      }
      filtradas.forEach((c) => { if (mapa[c.vencimento]) mapa[c.vencimento].total += Number(c.valor) || 0; });
    } else {
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      const fim = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
      while (cursor <= fim) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        mapa[key] = { label: `${MES_CURTO[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`, total: 0 };
        buckets.push(key);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      filtradas.forEach((c) => { const key = c.vencimento.slice(0, 7); if (mapa[key]) mapa[key].total += Number(c.valor) || 0; });
    }
    return buckets.map((k) => ({ periodo: mapa[k].label, total: Number(mapa[k].total.toFixed(2)) }));
  }, [filtradas, range]);

  const salvar = () => {
    const descricao = form.descricao.trim();
    const valor = parseNumero(form.valor);
    if (!descricao) { alert('Informe a descrição.'); return; }
    if (!valor) { alert('Informe um valor maior que zero.'); return; }
    if (!form.vencimento) { alert('Informe a data.'); return; }
    if (!form.categoria) { alert('Selecione o Item/Conta.'); return; }
    const planoContasId = form.planoContasId;
    const categoria = form.categoria;
    if (editingId) {
      setContas((prev) => prev.map((c) => (c.id === editingId ? { ...c, descricao, valor, vencimento: form.vencimento, categoria, planoContasId, status: form.status } : c)));
    } else if (form.recorrencia && form.recorrencia !== 'nenhuma') {
      const datas = (datasPreview.length ? datasPreview : [form.vencimento]).filter(Boolean);
      const serieId = uid();
      const novos = datas.map((venc) => ({ id: uid(), descricao, valor, vencimento: venc, categoria, planoContasId, status: form.status, recorrente: true, serieId }));
      setContas((prev) => [...prev, ...novos]);
    } else {
      setContas((prev) => [...prev, { id: uid(), descricao, valor, vencimento: form.vencimento, categoria, planoContasId, status: form.status }]);
    }
    setForm(formVazio());
    setBuscaItem('');
    setEditingId(null);
  };
  const editar = (c) => {
    setEditingId(c.id);
    setForm({ descricao: c.descricao, valor: String(c.valor).replace('.', ','), vencimento: c.vencimento, categoria: c.categoria || '', planoContasId: c.planoContasId || '', status: c.status, recorrencia: 'nenhuma', repeticoes: 12 });
    setBuscaItem(c.categoria || '');
  };
  const cancelarEdicao = () => { setForm(formVazio()); setBuscaItem(''); setEditingId(null); };
  const excluir = (id) => {
    const c = contas.find((x) => x.id === id);
    const naSerie = c?.serieId ? contas.filter((x) => x.serieId === c.serieId).length : 0;
    if (naSerie > 1) {
      const todos = confirm(`Este lançamento faz parte de uma recorrência (${naSerie} lançamentos).\n\nOK = excluir TODOS os ${naSerie}\nCancelar = manter`);
      if (todos) setContas((prev) => prev.filter((x) => x.serieId !== c.serieId));
      return;
    }
    if (confirm('Excluir este registro?')) setContas((prev) => prev.filter((x) => x.id !== id));
  };
  const toggleStatus = (id) => setContas((prev) => prev.map((c) => (c.id === id ? { ...c, status: c.status === 'pago' ? 'pendente' : 'pago' } : c)));
  const isAtrasada = (c) => c.status === 'pendente' && c.vencimento < hoje();

  return (
    <div className="space-y-5" data-testid={viewTestid}>
      {/* Filtro */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-gray-400" />
          <select value={modo} onChange={(e) => setModo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid={`${prefix}-filtro-modo-select`}>
            <option value="mes">Por mês</option>
            <option value="periodo">Período (De/Até)</option>
          </select>
        </div>
        {modo === 'mes' ? (
          <div className="flex items-center gap-2">
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid={`${prefix}-filtro-mes-select`}>
              {MES_CURTO.map((m, i) => <option key={m} value={i + 1}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value) || now.getFullYear())}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid={`${prefix}-filtro-ano-input`} />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600">De:</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid={`${prefix}-filtro-de-input`} />
            <label className="text-sm text-gray-600">Até:</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid={`${prefix}-filtro-ate-input`} />
          </div>
        )}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-2 md:gap-4" data-testid={`${prefix}-resumo`}>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-slate-50 border-slate-200 text-slate-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">{totalLabel}</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid={`${prefix}-resumo-total`}>{fmtMoeda(resumo.total)}</p>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-green-50 border-green-100 text-green-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">{doneLabel}</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid={`${prefix}-resumo-pago`}>{fmtMoeda(resumo.pago)}</p>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-red-50 border-red-100 text-red-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Pendente</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid={`${prefix}-resumo-pendente`}>{fmtMoeda(resumo.pendente)}</p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">{chartTitle}</h3>
        <div style={{ width: '100%', height: 260 }} data-testid={`${prefix}-chart`}>
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v) => fmtMoeda(v)} />
              <Line type="monotone" dataKey="total" stroke={lineColor} strokeWidth={2.5} dot={{ r: 2.5 }} activeDot={{ r: 5 }} name={lineName} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Formulário */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm md:text-base">{editingId ? 'Editar registro' : `Adicionar ${totalLabel.toLowerCase()}`}</h3>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs text-gray-500 mb-1">Descrição</label>
            <input type="text" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder={descricaoPlaceholder} data-testid={`${prefix}-descricao-input`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Valor (R$)</label>
            <input type="text" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })}
              placeholder="0,00" data-testid={`${prefix}-valor-input`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">{dateLabel}</label>
            <input type="date" value={form.vencimento} onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
              data-testid={`${prefix}-vencimento-input`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-2 relative">
            <label className="block text-xs text-gray-500 mb-1">Item/Conta *</label>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={15} />
              <input
                ref={itemInputRef}
                type="text"
                value={buscaItem}
                onChange={(e) => { setBuscaItem(e.target.value); setForm({ ...form, planoContasId: '', categoria: '' }); setShowItemDropdown(true); }}
                onFocus={() => setShowItemDropdown(true)}
                placeholder="Buscar item/conta..."
                data-testid={`${prefix}-categoria-input`}
                autoComplete="off"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
            {showItemDropdown && (
              <div ref={itemDropdownRef}
                className="absolute z-40 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg"
                data-testid={`${prefix}-item-dropdown`}>
                {itensFiltrados.length > 0 ? itensFiltrados.map((item) => (
                  <button key={item.id} type="button" onClick={() => selecionarItem(item)}
                    className={`block w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 border-b border-gray-50 ${form.planoContasId === item.id ? 'bg-emerald-100 text-emerald-700 font-medium' : 'text-gray-700'}`}
                    data-testid={`${prefix}-item-opt-${item.id}`}>
                    {item.subcategoria ? (<><span className="text-gray-500">{item.subcategoria} → </span>{item.nome}</>) : item.nome}
                  </button>
                )) : (
                  <div className="px-3 py-3 text-sm text-gray-400 text-center">
                    {Object.keys(hierarquia).length === 0 ? 'Carregando plano de contas...' : 'Nenhum item encontrado'}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Recorrência</label>
            <select
              value={form.recorrencia}
              onChange={(e) => setForm({ ...form, recorrencia: e.target.value })}
              disabled={!!editingId}
              data-testid={`${prefix}-recorrencia-select`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
              title={editingId ? 'A recorrência só se aplica a novos lançamentos' : 'Repetir automaticamente este lançamento'}
            >
              {FREQ_OPTS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          </div>
          {!editingId && form.recorrencia !== 'nenhuma' && (
            <div className="md:col-span-2">
              <label className="block text-xs text-gray-500 mb-1">Repetições</label>
              <input type="number" min="1" max="120" value={form.repeticoes}
                onChange={(e) => setForm({ ...form, repeticoes: e.target.value })}
                data-testid={`${prefix}-repeticoes-input`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-right focus:ring-2 focus:ring-emerald-500 outline-none" />
            </div>
          )}
          <div className="md:col-span-2 flex gap-2">
            <button onClick={salvar} data-testid={`${prefix}-salvar-btn`}
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

        {!editingId && datasPreview.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3" data-testid={`${prefix}-preview`}>
            <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
              <p className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                <Repeat size={14} className="text-emerald-600" />
                {datasPreview.length} {datasPreview.length === 1 ? 'lançamento será criado' : 'lançamentos serão criados'} — revise/ajuste as datas antes de salvar
              </p>
              <p className="text-xs text-gray-500" data-testid={`${prefix}-preview-total`}>
                Total: {fmtMoeda(parseNumero(form.valor) * datasPreview.length)}
              </p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {datasPreview.map((d, i) => (
                <div key={i} className="flex items-center gap-1">
                  <span className="text-[11px] text-gray-400 w-5 shrink-0">{i + 1}º</span>
                  <input type="date" value={d}
                    onChange={(e) => setDatasPreview((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))}
                    data-testid={`${prefix}-preview-data-${i}`}
                    className="flex-1 min-w-0 px-2 py-1 border border-gray-300 rounded text-xs focus:ring-2 focus:ring-emerald-500 outline-none" />
                  {datasPreview.length > 1 && (
                    <button onClick={() => setDatasPreview((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-gray-300 hover:text-red-600 shrink-0" title="Remover esta data"
                      data-testid={`${prefix}-preview-remover-${i}`}>
                      <X size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]" data-testid={`${prefix}-table`}>
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700">{dateLabel}</th>
                <th className="text-left p-3 font-semibold text-gray-700">Descrição</th>
                <th className="text-left p-3 font-semibold text-gray-700">Item/Conta</th>
                <th className="text-right p-3 font-semibold text-gray-700">Valor</th>
                <th className="text-center p-3 font-semibold text-gray-700">Status</th>
                <th className="text-center p-3 font-semibold text-gray-700">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-500">Nenhum registro neste período.</td></tr>
              ) : filtradas.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50" data-testid={`${prefix}-row-${c.id}`}>
                  <td className={`p-3 whitespace-nowrap ${isAtrasada(c) ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>
                    {fmtData(c.vencimento)}{isAtrasada(c) && <span className="ml-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{atrasadoLabel}</span>}
                  </td>
                  <td className="p-3 text-gray-800">
                    <span className="inline-flex items-center gap-1.5">
                      {c.recorrente && <Repeat size={13} className="text-emerald-600 shrink-0" title="Lançamento recorrente" />}
                      {c.descricao}
                    </span>
                  </td>
                  <td className="p-3 text-gray-600"><span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">{c.categoria}</span></td>
                  <td className="p-3 text-right font-semibold text-gray-800 whitespace-nowrap">{fmtNumero(c.valor)}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => toggleStatus(c.id)} data-testid={`${prefix}-status-${c.id}`}
                      className={`text-xs px-2.5 py-1 rounded-full font-medium transition ${c.status === 'pago' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`}
                      title="Clique para alternar">
                      {c.status === 'pago' ? doneLabel : 'Pendente'}
                    </button>
                  </td>
                  <td className="p-3">
                    <div className="flex justify-center gap-2">
                      <button onClick={() => editar(c)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar" data-testid={`${prefix}-editar-${c.id}`}><Pencil size={16} /></button>
                      <button onClick={() => excluir(c.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="Excluir" data-testid={`${prefix}-excluir-${c.id}`}><Trash2 size={16} /></button>
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
        <span>{isolamentoText}</span>
      </div>
    </div>
  );
}
