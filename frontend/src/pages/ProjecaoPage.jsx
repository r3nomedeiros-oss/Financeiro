import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus, Trash2, Copy, Pencil, TrendingUp, ArrowUpCircle, ArrowDownCircle, Info,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import ContasAPagar from './ContasAPagar';

const STORAGE_KEY = 'projecao_fluxo_caixa_v1';

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);

const zeros = () => Array(12).fill(0);

const novaLinha = (nome = '') => ({ id: uid(), nome, valores: zeros() });

const novoCenario = (nome) => ({
  id: uid(),
  nome: nome || 'Novo Cenário',
  ano: new Date().getFullYear(),
  saldoInicial: 0,
  receitas: [novaLinha('Vendas')],
  despesas: [novaLinha('Despesas gerais')],
});

// ---------- helpers de número ----------
const parseNumero = (str) => {
  if (str === null || str === undefined) return 0;
  let s = String(str).replace(/[^\d,\-]/g, '');
  s = s.replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const fmtMoeda = (n) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n || 0);

const fmtNumero = (n) =>
  new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

// Célula de valor editável (mantém texto durante digitação, formata ao sair)
function CelulaValor({ value, onChange, testid }) {
  const [texto, setTexto] = useState('');
  const [focado, setFocado] = useState(false);

  useEffect(() => {
    if (!focado) setTexto(value ? fmtNumero(value) : '');
  }, [value, focado]);

  return (
    <input
      type="text"
      inputMode="decimal"
      data-testid={testid}
      value={texto}
      onFocus={() => {
        setFocado(true);
        setTexto(value ? String(value).replace('.', ',') : '');
      }}
      onBlur={() => {
        setFocado(false);
        onChange(parseNumero(texto));
      }}
      onChange={(e) => {
        setTexto(e.target.value);
        onChange(parseNumero(e.target.value));
      }}
      placeholder="0,00"
      className="w-full text-right px-2 py-1.5 rounded-md border border-transparent hover:border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 focus:bg-white bg-transparent text-sm outline-none"
    />
  );
}

export default function ProjecaoPage() {
  const [cenarios, setCenarios] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [carregado, setCarregado] = useState(false);
  const [renomeando, setRenomeando] = useState(false);
  const [nomeTmp, setNomeTmp] = useState('');
  const [view, setView] = useState('simulacao'); // 'simulacao' | 'contas'
  const renameRef = useRef(null);

  // Carregar do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data?.cenarios?.length) {
          setCenarios(data.cenarios);
          setActiveId(data.activeId && data.cenarios.some(c => c.id === data.activeId) ? data.activeId : data.cenarios[0].id);
          setCarregado(true);
          return;
        }
      }
    } catch (e) {
      console.error('Erro ao carregar projeções:', e);
    }
    const inicial = novoCenario('Cenário Base');
    setCenarios([inicial]);
    setActiveId(inicial.id);
    setCarregado(true);
  }, []);

  // Persistir no localStorage
  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ cenarios, activeId }));
    } catch (e) {
      console.error('Erro ao salvar projeções:', e);
    }
  }, [cenarios, activeId, carregado]);

  useEffect(() => {
    if (renomeando && renameRef.current) renameRef.current.focus();
  }, [renomeando]);

  const cenario = useMemo(() => cenarios.find((c) => c.id === activeId) || null, [cenarios, activeId]);

  const atualizarCenario = (patch) => {
    setCenarios((prev) => prev.map((c) => (c.id === activeId ? { ...c, ...patch } : c)));
  };

  // ---------- CRUD de cenários ----------
  const criarCenario = () => {
    const novo = novoCenario(`Cenário ${cenarios.length + 1}`);
    setCenarios((prev) => [...prev, novo]);
    setActiveId(novo.id);
  };

  const duplicarCenario = () => {
    if (!cenario) return;
    const copia = {
      ...cenario,
      id: uid(),
      nome: `${cenario.nome} (cópia)`,
      receitas: cenario.receitas.map((l) => ({ ...l, id: uid(), valores: [...l.valores] })),
      despesas: cenario.despesas.map((l) => ({ ...l, id: uid(), valores: [...l.valores] })),
    };
    setCenarios((prev) => [...prev, copia]);
    setActiveId(copia.id);
  };

  const excluirCenario = () => {
    if (!cenario) return;
    if (cenarios.length === 1) {
      alert('Você precisa manter pelo menos um cenário.');
      return;
    }
    if (!confirm(`Excluir o cenário "${cenario.nome}"?`)) return;
    setCenarios((prev) => {
      const restante = prev.filter((c) => c.id !== activeId);
      setActiveId(restante[0]?.id || null);
      return restante;
    });
  };

  const salvarNome = () => {
    const nome = nomeTmp.trim();
    if (nome) atualizarCenario({ nome });
    setRenomeando(false);
  };

  // ---------- CRUD de linhas ----------
  const addLinha = (tipo) => {
    atualizarCenario({ [tipo]: [...cenario[tipo], novaLinha('')] });
  };
  const removerLinha = (tipo, id) => {
    atualizarCenario({ [tipo]: cenario[tipo].filter((l) => l.id !== id) });
  };
  const setNomeLinha = (tipo, id, nome) => {
    atualizarCenario({ [tipo]: cenario[tipo].map((l) => (l.id === id ? { ...l, nome } : l)) });
  };
  const setValorLinha = (tipo, id, mesIdx, valor) => {
    atualizarCenario({
      [tipo]: cenario[tipo].map((l) => {
        if (l.id !== id) return l;
        const valores = [...l.valores];
        valores[mesIdx] = valor;
        return { ...l, valores };
      }),
    });
  };

  // ---------- cálculos ----------
  const calc = useMemo(() => {
    if (!cenario) return null;
    const somaPorMes = (linhas) =>
      MESES.map((_, m) => linhas.reduce((acc, l) => acc + (Number(l.valores[m]) || 0), 0));

    const recMes = somaPorMes(cenario.receitas);
    const despMes = somaPorMes(cenario.despesas);
    const resultadoMes = MESES.map((_, m) => recMes[m] - despMes[m]);

    const saldoAcum = [];
    let acumulado = Number(cenario.saldoInicial) || 0;
    MESES.forEach((_, m) => {
      acumulado += resultadoMes[m];
      saldoAcum[m] = acumulado;
    });

    const totalRec = recMes.reduce((a, b) => a + b, 0);
    const totalDesp = despMes.reduce((a, b) => a + b, 0);

    return {
      recMes, despMes, resultadoMes, saldoAcum,
      totalRec, totalDesp,
      totalResultado: totalRec - totalDesp,
      saldoFinal: saldoAcum[11],
    };
  }, [cenario]);

  const chartData = useMemo(() => {
    if (!calc) return [];
    return MESES.map((mes, m) => ({ mes, saldo: Number(calc.saldoAcum[m].toFixed(2)) }));
  }, [calc]);

  if (!cenario || !calc) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  const anosDisponiveis = (() => {
    const atual = new Date().getFullYear();
    const anos = new Set([atual - 1, atual, atual + 1, atual + 2, cenario.ano]);
    return Array.from(anos).sort((a, b) => a - b);
  })();

  const totalLinha = (l) => l.valores.reduce((a, b) => a + (Number(b) || 0), 0);

  return (
    <div className="space-y-5" data-testid="projecao-page">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <TrendingUp size={24} />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Projeção de Fluxo de Caixa</h1>
            <p className="text-gray-600 text-sm">Simule cenários futuros livremente</p>
          </div>
        </div>

        {/* Aviso de isolamento */}
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg px-3 py-2 text-xs md:text-sm">
          <Info size={16} className="shrink-0 mt-0.5" />
          <span>
            Esta aba é <strong>independente</strong>. Os valores aqui são apenas simulações e <strong>não afetam</strong> nem
            leem o DRE, Movimentações ou saldos reais. Os cenários ficam salvos apenas neste navegador.
          </span>
        </div>
      </div>

      {/* Abas internas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setView('simulacao')}
            className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${view === 'simulacao' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            data-testid="tab-simulacao"
          >
            Simulação (12 meses)
          </button>
          <button
            onClick={() => setView('contas')}
            className={`py-2.5 px-1 border-b-2 font-medium text-sm transition-colors ${view === 'contas' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            data-testid="tab-contas-pagar"
          >
            Contas a Pagar
          </button>
        </nav>
      </div>

      {view === 'contas' && <ContasAPagar />}

      {view === 'simulacao' && (
      <>
      {/* Barra de cenários */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <label className="text-sm text-gray-600 shrink-0">Cenário:</label>
          {renomeando ? (
            <input
              ref={renameRef}
              value={nomeTmp}
              onChange={(e) => setNomeTmp(e.target.value)}
              onBlur={salvarNome}
              onKeyDown={(e) => { if (e.key === 'Enter') salvarNome(); if (e.key === 'Escape') setRenomeando(false); }}
              className="flex-1 min-w-0 px-3 py-2 border border-emerald-400 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid="renomear-cenario-input"
            />
          ) : (
            <select
              value={activeId || ''}
              onChange={(e) => setActiveId(e.target.value)}
              className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
              data-testid="cenario-select"
            >
              {cenarios.map((c) => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={() => { setNomeTmp(cenario.nome); setRenomeando(true); }}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            data-testid="renomear-cenario-btn" title="Renomear">
            <Pencil size={15} /> <span className="hidden sm:inline">Renomear</span>
          </button>
          <button onClick={duplicarCenario}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            data-testid="duplicar-cenario-btn" title="Duplicar">
            <Copy size={15} /> <span className="hidden sm:inline">Duplicar</span>
          </button>
          <button onClick={excluirCenario}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
            data-testid="excluir-cenario-btn" title="Excluir">
            <Trash2 size={15} /> <span className="hidden sm:inline">Excluir</span>
          </button>
          <button onClick={criarCenario}
            className="flex items-center gap-1.5 px-3 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            data-testid="novo-cenario-btn">
            <Plus size={16} /> Novo Cenário
          </button>
        </div>
      </div>

      {/* Parâmetros: ano + saldo inicial */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano da projeção</label>
          <select
            value={cenario.ano}
            onChange={(e) => atualizarCenario({ ano: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none"
            data-testid="projecao-ano-select"
          >
            {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div className="bg-white rounded-xl shadow-md p-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Saldo inicial (R$)</label>
          <CelulaValorLarge
            value={cenario.saldoInicial}
            onChange={(v) => atualizarCenario({ saldoInicial: v })}
          />
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4" data-testid="projecao-resumo">
        <CardResumo titulo="Total Receitas" valor={calc.totalRec} cor="green" />
        <CardResumo titulo="Total Despesas" valor={calc.totalDesp} cor="red" />
        <CardResumo titulo="Resultado (12m)" valor={calc.totalResultado} cor={calc.totalResultado >= 0 ? 'green' : 'red'} />
        <CardResumo titulo="Saldo Final" valor={calc.saldoFinal} cor={calc.saldoFinal >= 0 ? 'blue' : 'red'} />
      </div>

      {/* Gráfico de saldo acumulado */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <h3 className="font-semibold text-gray-700 mb-2 text-sm md:text-base">Evolução do Saldo Acumulado</h3>
        <div style={{ width: '100%', height: 260 }} data-testid="projecao-chart">
          <ResponsiveContainer>
            <LineChart data={chartData} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 11 }} width={70}
                tickFormatter={(v) => new Intl.NumberFormat('pt-BR', { notation: 'compact' }).format(v)} />
              <Tooltip formatter={(v) => fmtMoeda(v)} labelFormatter={(l) => `${l}/${cenario.ano}`} />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="saldo" stroke="#059669" strokeWidth={2.5}
                dot={{ r: 3 }} activeDot={{ r: 5 }} name="Saldo acumulado" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabela de projeção */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse min-w-[1100px]" data-testid="projecao-table">
            <thead>
              <tr className="bg-gray-100 border-b-2 border-gray-300">
                <th className="text-left p-2 sticky left-0 bg-gray-100 border-r border-gray-300 min-w-[200px]">Descrição</th>
                {MESES.map((m) => (
                  <th key={m} className="text-right p-2 min-w-[95px] border-r border-gray-200">{m}</th>
                ))}
                <th className="text-right p-2 min-w-[110px] bg-gray-200 font-bold">Total</th>
                <th className="w-10 p-2 bg-gray-100"></th>
              </tr>
            </thead>
            <tbody>
              {/* RECEITAS */}
              <SecaoHeader
                icon={<ArrowUpCircle size={16} className="text-green-600" />}
                label="Receitas / Entradas"
                cor="bg-green-50 text-green-800"
                onAdd={() => addLinha('receitas')}
                testid="add-receita-btn"
              />
              {cenario.receitas.map((l) => (
                <LinhaEditavel key={l.id} linha={l} tipo="receitas" corValor="text-green-700"
                  onNome={setNomeLinha} onValor={setValorLinha} onRemover={removerLinha} total={totalLinha(l)} />
              ))}
              <LinhaTotal label="Total Receitas" valores={calc.recMes} total={calc.totalRec} cor="text-green-700" bg="bg-green-50" />

              {/* DESPESAS */}
              <SecaoHeader
                icon={<ArrowDownCircle size={16} className="text-red-600" />}
                label="Despesas / Saídas"
                cor="bg-red-50 text-red-800"
                onAdd={() => addLinha('despesas')}
                testid="add-despesa-btn"
              />
              {cenario.despesas.map((l) => (
                <LinhaEditavel key={l.id} linha={l} tipo="despesas" corValor="text-red-700"
                  onNome={setNomeLinha} onValor={setValorLinha} onRemover={removerLinha} total={totalLinha(l)} />
              ))}
              <LinhaTotal label="Total Despesas" valores={calc.despMes} total={calc.totalDesp} cor="text-red-700" bg="bg-red-50" />

              {/* RESULTADOS */}
              <LinhaTotal label="Resultado do Mês" valores={calc.resultadoMes} total={calc.totalResultado}
                cor="" bg="bg-gray-50" destaque colorir />
              <LinhaTotal label="Saldo Acumulado" valores={calc.saldoAcum} total={calc.saldoFinal}
                cor="" bg="bg-blue-50" destaque colorir semTotalSoma />
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}
    </div>
  );
}

// Saldo inicial (input grande)
function CelulaValorLarge({ value, onChange }) {
  const [texto, setTexto] = useState('');
  const [focado, setFocado] = useState(false);
  useEffect(() => { if (!focado) setTexto(value ? fmtNumero(value) : ''); }, [value, focado]);
  return (
    <input
      type="text" inputMode="decimal" data-testid="projecao-saldo-inicial-input"
      value={texto}
      onFocus={() => { setFocado(true); setTexto(value ? String(value).replace('.', ',') : ''); }}
      onBlur={() => { setFocado(false); onChange(parseNumero(texto)); }}
      onChange={(e) => { setTexto(e.target.value); onChange(parseNumero(e.target.value)); }}
      placeholder="0,00"
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-base font-semibold focus:ring-2 focus:ring-emerald-500 outline-none"
    />
  );
}

function CardResumo({ titulo, valor, cor }) {
  const cores = {
    green: 'bg-green-50 border-green-100 text-green-700',
    red: 'bg-red-50 border-red-100 text-red-700',
    blue: 'bg-blue-50 border-blue-100 text-blue-700',
  };
  return (
    <div className={`rounded-xl shadow border p-3 md:p-4 ${cores[cor]}`}>
      <p className="text-[11px] md:text-sm font-medium opacity-90">{titulo}</p>
      <p className="text-sm md:text-xl font-bold break-words">{fmtMoeda(valor)}</p>
    </div>
  );
}

function SecaoHeader({ icon, label, cor, onAdd, testid }) {
  return (
    <tr className={`${cor} border-y border-gray-200`}>
      <td className="p-2 sticky left-0 font-semibold border-r border-gray-200" style={{ background: 'inherit' }}>
        <div className="flex items-center gap-2">{icon}{label}</div>
      </td>
      <td colSpan={12}></td>
      <td></td>
      <td className="p-1 text-center">
        <button onClick={onAdd} data-testid={testid}
          className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/70 hover:bg-white text-gray-700 border border-gray-300"
          title="Adicionar linha">
          <Plus size={15} />
        </button>
      </td>
    </tr>
  );
}

function LinhaEditavel({ linha, tipo, corValor, onNome, onValor, onRemover, total }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 group">
      <td className="p-1 sticky left-0 bg-white group-hover:bg-gray-50 border-r border-gray-200">
        <input
          type="text"
          value={linha.nome}
          onChange={(e) => onNome(tipo, linha.id, e.target.value)}
          placeholder="Descrição..."
          className="w-full px-2 py-1.5 rounded-md border border-transparent hover:border-gray-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm outline-none bg-transparent"
          data-testid={`linha-nome-${linha.id}`}
        />
      </td>
      {linha.valores.map((v, m) => (
        <td key={m} className="border-r border-gray-100">
          <CelulaValor value={v} onChange={(nv) => onValor(tipo, linha.id, m, nv)} testid={`celula-${linha.id}-${m}`} />
        </td>
      ))}
      <td className={`text-right p-2 bg-gray-50 font-semibold ${corValor}`}>{fmtNumero(total)}</td>
      <td className="p-1 text-center">
        <button onClick={() => onRemover(tipo, linha.id)}
          className="text-gray-300 hover:text-red-600 transition"
          title="Remover linha" data-testid={`remover-linha-${linha.id}`}>
          <Trash2 size={15} />
        </button>
      </td>
    </tr>
  );
}

function LinhaTotal({ label, valores, total, cor, bg, destaque, colorir, semTotalSoma }) {
  const corDe = (v) => (colorir ? (v >= 0 ? 'text-emerald-700' : 'text-red-600') : cor);
  return (
    <tr className={`${bg} border-y border-gray-200 ${destaque ? 'font-bold' : 'font-semibold'}`}>
      <td className={`p-2 sticky left-0 ${bg} border-r border-gray-300`}>{label}</td>
      {valores.map((v, m) => (
        <td key={m} className={`text-right p-2 border-r border-gray-100 ${corDe(v)}`}>{fmtNumero(v)}</td>
      ))}
      <td className={`text-right p-2 bg-gray-100 ${semTotalSoma ? corDe(total) : cor || corDe(total)}`}>
        {fmtNumero(total)}
      </td>
      <td></td>
    </tr>
  );
}
