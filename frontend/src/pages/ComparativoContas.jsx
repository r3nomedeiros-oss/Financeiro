import React, { useState, useEffect, useMemo } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts';

const KEY_PAGAR = 'projecao_contas_pagar_v1';
const KEY_RECEBER = 'projecao_contas_receber_v1';
const KEY_SALDO = 'projecao_comparativo_saldo_inicial_v1';
const MES_CURTO = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

const toDate = (iso) => new Date(iso + 'T00:00:00');
const fmtMoeda = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);
const parseNumero = (v) => {
  if (typeof v === 'number') return v;
  if (!v) return 0;
  const n = parseFloat(String(v).replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, ''));
  return isNaN(n) ? 0 : n;
};

const lerLS = (key) => {
  try { return JSON.parse(localStorage.getItem(key) || '[]') || []; }
  catch { return []; }
};

export default function ComparativoContas() {
  const [pagar, setPagar] = useState([]);
  const [receber, setReceber] = useState([]);

  const [modo, setModo] = useState('periodo');
  const now = new Date();
  const [ano, setAno] = useState(now.getFullYear());
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [de, setDe] = useState(new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]);
  const [ate, setAte] = useState(new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0]);
  const [saldoInicialStr, setSaldoInicialStr] = useState('');

  const recarregar = () => { setPagar(lerLS(KEY_PAGAR)); setReceber(lerLS(KEY_RECEBER)); };
  useEffect(() => {
    recarregar();
    const v = localStorage.getItem(KEY_SALDO);
    if (v !== null) setSaldoInicialStr(v);
  }, []);
  const setSaldo = (v) => { setSaldoInicialStr(v); try { localStorage.setItem(KEY_SALDO, v); } catch { /* ignore */ } };
  const saldoInicial = parseNumero(saldoInicialStr);

  const range = useMemo(() => {
    if (modo === 'mes') return { start: new Date(ano, mes - 1, 1), end: new Date(ano, mes, 0) };
    let start = toDate(de), end = toDate(ate);
    if (start > end) [start, end] = [end, start];
    return { start, end };
  }, [modo, ano, mes, de, ate]);

  const filtrar = (lista) => lista.filter((c) => { const d = toDate(c.vencimento); return d >= range.start && d <= range.end; });

  const dados = useMemo(() => {
    const fp = filtrar(pagar), fr = filtrar(receber);
    const diffDias = Math.round((range.end - range.start) / 86400000);
    const diario = diffDias <= 62;
    const buckets = [], mapa = {};

    if (diario) {
      const cursor = new Date(range.start);
      while (cursor <= range.end) {
        const key = cursor.toISOString().split('T')[0];
        mapa[key] = { label: `${String(cursor.getDate()).padStart(2, '0')}/${String(cursor.getMonth() + 1).padStart(2, '0')}`, pagar: 0, receber: 0 };
        buckets.push(key);
        cursor.setDate(cursor.getDate() + 1);
      }
      fp.forEach((c) => { if (mapa[c.vencimento]) mapa[c.vencimento].pagar += Number(c.valor) || 0; });
      fr.forEach((c) => { if (mapa[c.vencimento]) mapa[c.vencimento].receber += Number(c.valor) || 0; });
    } else {
      const cursor = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      const fim = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
      while (cursor <= fim) {
        const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
        mapa[key] = { label: `${MES_CURTO[cursor.getMonth()]}/${String(cursor.getFullYear()).slice(2)}`, pagar: 0, receber: 0 };
        buckets.push(key);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      fp.forEach((c) => { const k = c.vencimento.slice(0, 7); if (mapa[k]) mapa[k].pagar += Number(c.valor) || 0; });
      fr.forEach((c) => { const k = c.vencimento.slice(0, 7); if (mapa[k]) mapa[k].receber += Number(c.valor) || 0; });
    }

    let acumulado = saldoInicial;
    const serie = buckets.map((k) => {
      const b = mapa[k];
      acumulado += b.receber - b.pagar;
      return {
        periodo: b.label,
        receber: Number(b.receber.toFixed(2)),
        pagar: Number(b.pagar.toFixed(2)),
        saldo: Number(acumulado.toFixed(2)),
      };
    });

    const totalReceber = fr.reduce((a, c) => a + (Number(c.valor) || 0), 0);
    const totalPagar = fp.reduce((a, c) => a + (Number(c.valor) || 0), 0);
    return { serie, totalReceber, totalPagar, saldo: totalReceber - totalPagar, saldoFinal: saldoInicial + totalReceber - totalPagar };
  }, [pagar, receber, range, saldoInicial]);

  return (
    <div className="space-y-5" data-testid="comparativo-view">
      {/* Filtro */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-gray-400" />
          <select value={modo} onChange={(e) => setModo(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid="comp-filtro-modo-select">
            <option value="mes">Por mês</option>
            <option value="periodo">Período (De/Até)</option>
          </select>
        </div>
        {modo === 'mes' ? (
          <div className="flex items-center gap-2">
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="comp-filtro-mes-select">
              {MES_CURTO.map((m, i) => <option key={m} value={i + 1}>{m.charAt(0).toUpperCase() + m.slice(1)}</option>)}
            </select>
            <input type="number" value={ano} onChange={(e) => setAno(parseInt(e.target.value) || now.getFullYear())}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="comp-filtro-ano-input" />
          </div>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <label className="text-sm text-gray-600">De:</label>
            <input type="date" value={de} onChange={(e) => setDe(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="comp-filtro-de-input" />
            <label className="text-sm text-gray-600">Até:</label>
            <input type="date" value={ate} onChange={(e) => setAte(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="comp-filtro-ate-input" />
          </div>
        )}
        <button onClick={recarregar}
          className="md:ml-auto flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
          data-testid="comp-recarregar-btn" title="Atualizar com os dados mais recentes">
          <RefreshCw size={15} /> Atualizar
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4" data-testid="comparativo-resumo">
        <div className="rounded-xl shadow border p-3 md:p-4 bg-slate-50 border-slate-200 text-slate-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Saldo Inicial</p>
          <div className="flex items-center gap-1">
            <span className="text-sm md:text-lg font-bold">R$</span>
            <input type="text" inputMode="decimal" value={saldoInicialStr} onChange={(e) => setSaldo(e.target.value)}
              placeholder="0,00" data-testid="comp-saldo-inicial-input"
              className="w-full bg-transparent text-sm md:text-xl font-bold outline-none border-b border-slate-300 focus:border-slate-500" />
          </div>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-green-50 border-green-100 text-green-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Entradas (A Receber)</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="comp-total-receber">{fmtMoeda(dados.totalReceber)}</p>
        </div>
        <div className="rounded-xl shadow border p-3 md:p-4 bg-red-50 border-red-100 text-red-700">
          <p className="text-[11px] md:text-sm font-medium opacity-90">Saídas (A Pagar)</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="comp-total-pagar">{fmtMoeda(dados.totalPagar)}</p>
        </div>
        <div className={`rounded-xl shadow border p-3 md:p-4 ${dados.saldoFinal >= 0 ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
          <p className="text-[11px] md:text-sm font-medium opacity-90">Saldo Final</p>
          <p className="text-sm md:text-xl font-bold break-words" data-testid="comp-saldo-final">{fmtMoeda(dados.saldoFinal)}</p>
        </div>
      </div>

      <p className="text-xs text-gray-400 -mt-2" data-testid="comp-formula">
        Saldo Final = Saldo Inicial ({fmtMoeda(saldoInicial)}) + Entradas ({fmtMoeda(dados.totalReceber)}) − Saídas ({fmtMoeda(dados.totalPagar)})
      </p>

      {/* Gráfico comparativo */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">A Receber × A Pagar × Saldo acumulado</h3>
        <div style={{ width: '100%', height: 300 }} data-testid="comparativo-chart">
          <ResponsiveContainer>
            <LineChart data={dados.serie} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="periodo" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={16} />
              <YAxis tick={{ fontSize: 11 }} width={70} tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v) => fmtMoeda(v)} />
              <Legend />
              <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="receber" stroke="#059669" strokeWidth={2.5} dot={{ r: 2 }} name="A Receber" />
              <Line type="monotone" dataKey="pagar" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 2 }} name="A Pagar" />
              <Line type="monotone" dataKey="saldo" stroke="#2563eb" strokeWidth={2.5} strokeDasharray="5 4" dot={{ r: 2 }} name="Saldo acumulado" />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          "Saldo acumulado" começa no Saldo Inicial e soma progressivamente (recebimentos − pagamentos) ao longo do período. Use "Atualizar" após cadastrar contas nas outras abas.
        </p>
      </div>
    </div>
  );
}
