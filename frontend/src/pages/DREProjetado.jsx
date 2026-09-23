import React, { useState, useEffect, useMemo } from 'react';
import { RefreshCw, Info, FileBarChart } from 'lucide-react';
import { planoContasAPI } from '../services/api';

const KEY_PAGAR = 'projecao_contas_pagar_v1';
const KEY_RECEBER = 'projecao_contas_receber_v1';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const fmtMoeda = (n) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0);

const lerStore = (key) => {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
};

export default function DREProjetado() {
  const [hierarquia, setHierarquia] = useState({});
  const [pagar, setPagar] = useState([]);
  const [receber, setReceber] = useState([]);
  const [ano, setAno] = useState('todos');
  const [mes, setMes] = useState('todos');

  const recarregar = () => {
    setPagar(lerStore(KEY_PAGAR));
    setReceber(lerStore(KEY_RECEBER));
  };

  useEffect(() => {
    planoContasAPI.getHierarquico()
      .then((res) => setHierarquia(res.data || {}))
      .catch((e) => console.error('Erro ao carregar plano de contas:', e));
    recarregar();
  }, []);

  // Mapa: planoContasId -> { catDre, nome }
  const mapaItens = useMemo(() => {
    const map = {};
    Object.entries(hierarquia).forEach(([catKey, cat]) => {
      (cat.subcategorias || []).forEach((sub) => {
        map[sub.id] = { catDre: catKey, nome: sub.nome };
        (sub.itens || []).forEach((it) => { map[it.id] = { catDre: catKey, nome: it.nome }; });
      });
    });
    return map;
  }, [hierarquia]);

  // Anos disponíveis a partir dos lançamentos
  const anosDisponiveis = useMemo(() => {
    const set = new Set();
    [...pagar, ...receber].forEach((c) => { if (c.vencimento) set.add(c.vencimento.slice(0, 4)); });
    return Array.from(set).sort();
  }, [pagar, receber]);

  const noPeriodo = (c) => {
    if (!c.vencimento) return false;
    if (ano !== 'todos' && c.vencimento.slice(0, 4) !== ano) return false;
    if (mes !== 'todos' && c.vencimento.slice(5, 7) !== String(mes).padStart(2, '0')) return false;
    return true;
  };

  // Agregação por categoria DRE + itens
  const dados = useMemo(() => {
    const cat = { receita_bruta: 0, deducoes_vendas: 0, custos_variaveis: 0, custos_fixos: 0 };
    let receitasNaoOp = 0, gastosNaoOp = 0;
    const itens = {}; // catDre -> { label -> valor (assinado) }
    const add = (c, label, v) => { itens[c] = itens[c] || {}; itens[c][label] = (itens[c][label] || 0) + v; };

    const processar = (lista, origem) => {
      lista.filter(noPeriodo).forEach((c) => {
        const v = Number(c.valor) || 0;
        const info = c.planoContasId ? mapaItens[c.planoContasId] : null;
        const catDre = info?.catDre;
        const label = c.categoria || info?.nome || 'Sem categoria';
        if (catDre === 'receita_bruta') { cat.receita_bruta += v; add('receita_bruta', label, v); }
        else if (catDre === 'deducoes_vendas') { cat.deducoes_vendas += v; add('deducoes_vendas', label, v); }
        else if (catDre === 'custos_variaveis') { cat.custos_variaveis += v; add('custos_variaveis', label, v); }
        else if (catDre === 'custos_fixos') { cat.custos_fixos += v; add('custos_fixos', label, v); }
        else if (catDre === 'resultado_nao_operacional') {
          if (origem === 'receita') { receitasNaoOp += v; add('resultado_nao_operacional', label, v); }
          else { gastosNaoOp += v; add('resultado_nao_operacional', label, -v); }
        } else {
          // Sem categoria DRE mapeada: receber -> Receita Bruta, pagar -> Custos Variáveis
          if (origem === 'receita') { cat.receita_bruta += v; add('receita_bruta', label, v); }
          else { cat.custos_variaveis += v; add('custos_variaveis', label, v); }
        }
      });
    };

    processar(receber, 'receita');
    processar(pagar, 'despesa');

    const receita_liquida = cat.receita_bruta - cat.deducoes_vendas;
    const margem_contribuicao = receita_liquida - cat.custos_variaveis;
    const resultado_operacional = margem_contribuicao - cat.custos_fixos;
    const resultado_nao_operacional = receitasNaoOp - gastosNaoOp;
    const lucro_liquido = resultado_operacional + resultado_nao_operacional;
    const base = receita_liquida > 0 ? receita_liquida : (cat.receita_bruta > 0 ? cat.receita_bruta : 0);

    return {
      cat, itens,
      receita_liquida, margem_contribuicao, resultado_operacional,
      resultado_nao_operacional, lucro_liquido, base,
      margem_contribuicao_pct: base > 0 ? (margem_contribuicao / base) * 100 : 0,
      margem_liquida_pct: base > 0 ? (lucro_liquido / base) * 100 : 0,
      temDados: (receber.length + pagar.length) > 0,
    };
  }, [pagar, receber, mapaItens, ano, mes]);

  const pct = (v) => (dados.base > 0 ? `${Math.round((v / dados.base) * 100)}%` : '0%');
  const itensDe = (catKey) => Object.entries(dados.itens[catKey] || {}).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

  const Categoria = ({ catKey, label, bg, text, valor }) => (
    <>
      <tr className={`${bg} border-b border-gray-200`} data-testid={`drep-cat-${catKey}`}>
        <td className={`p-2 font-semibold ${text}`}>{label}</td>
        <td className={`p-2 text-right font-semibold ${text} whitespace-nowrap`}>{fmtMoeda(valor)}</td>
        <td className={`p-2 text-right ${text}`}>{pct(valor)}</td>
      </tr>
      {itensDe(catKey).map(([nome, val]) => (
        <tr key={nome} className="border-b border-gray-50 hover:bg-gray-50">
          <td className="p-2 pl-6 text-gray-600 text-sm">• {nome}</td>
          <td className="p-2 text-right text-gray-600 text-sm whitespace-nowrap">{fmtMoeda(val)}</td>
          <td className="p-2 text-right text-gray-500 text-sm">{pct(val)}</td>
        </tr>
      ))}
    </>
  );

  const Total = ({ label, valor, cls, ehPct, pctValor }) => (
    <tr className={`${cls} border-y border-gray-200 font-bold`}>
      <td className="p-2">{label}</td>
      <td className="p-2 text-right whitespace-nowrap">{ehPct ? `${Math.round(pctValor)}%` : fmtMoeda(valor)}</td>
      <td className="p-2 text-right">{ehPct ? '-' : pct(valor)}</td>
    </tr>
  );

  const Card = ({ titulo, valor, cor }) => {
    const cores = {
      cyan: 'bg-cyan-50 border-cyan-100 text-cyan-700',
      blue: 'bg-blue-50 border-blue-100 text-blue-700',
      green: 'bg-green-50 border-green-100 text-green-700',
      red: 'bg-red-50 border-red-100 text-red-700',
    };
    return (
      <div className={`rounded-xl shadow border p-3 md:p-4 ${cores[cor]}`}>
        <p className="text-[11px] md:text-sm font-medium opacity-90">{titulo}</p>
        <p className="text-sm md:text-xl font-bold break-words">{fmtMoeda(valor)}</p>
      </div>
    );
  };

  return (
    <div className="space-y-5" data-testid="dre-projetado-view">
      {/* Cabeçalho + filtros */}
      <div className="bg-white rounded-xl shadow-md p-3 md:p-4 flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <FileBarChart size={18} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800 text-sm md:text-base">DRE Projetado</h3>
            <p className="text-xs text-gray-500">Montado a partir das Contas a Pagar e a Receber por Item/Conta</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={mes} onChange={(e) => setMes(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="drep-mes-select">
            <option value="todos">Todos os meses</option>
            {MESES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={(e) => setAno(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 outline-none" data-testid="drep-ano-select">
            <option value="todos">Todos os anos</option>
            {anosDisponiveis.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={recarregar}
            className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            data-testid="drep-atualizar-btn" title="Reler lançamentos">
            <RefreshCw size={15} /> Atualizar
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4" data-testid="drep-cards">
        <Card titulo="Receita Líquida" valor={dados.receita_liquida} cor="cyan" />
        <Card titulo="Margem de Contribuição" valor={dados.margem_contribuicao} cor="blue" />
        <Card titulo="Resultado Operacional" valor={dados.resultado_operacional} cor={dados.resultado_operacional >= 0 ? 'green' : 'red'} />
        <Card titulo="Lucro Líquido" valor={dados.lucro_liquido} cor={dados.lucro_liquido >= 0 ? 'green' : 'red'} />
      </div>

      {/* Tabela DRE */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[520px]" data-testid="drep-table">
            <thead className="bg-gray-100 border-b-2 border-gray-300">
              <tr>
                <th className="text-left p-2 font-semibold text-gray-700">Descrição</th>
                <th className="text-right p-2 font-semibold text-gray-700 w-40">Valor</th>
                <th className="text-right p-2 font-semibold text-gray-700 w-20">AV%</th>
              </tr>
            </thead>
            <tbody>
              <Categoria catKey="receita_bruta" label="(+) Receita Bruta" bg="bg-cyan-50" text="text-cyan-700" valor={dados.cat.receita_bruta} />
              <Categoria catKey="deducoes_vendas" label="(-) Deduções Sobre Vendas" bg="bg-red-50" text="text-red-600" valor={dados.cat.deducoes_vendas} />
              <Total label="(=) Receita Líquida" valor={dados.receita_liquida} cls="bg-cyan-100 text-cyan-800" />
              <Categoria catKey="custos_variaveis" label="(-) Custos Variáveis" bg="bg-red-50" text="text-red-600" valor={dados.cat.custos_variaveis} />
              <Total label="(=) Margem de Contribuição" valor={dados.margem_contribuicao} cls="bg-cyan-100 text-cyan-800" />
              <Total label="(=) % Margem de Contribuição" ehPct pctValor={dados.margem_contribuicao_pct} cls="bg-blue-50 text-blue-700" />
              <Categoria catKey="custos_fixos" label="(-) Custos Fixos" bg="bg-red-50" text="text-red-600" valor={dados.cat.custos_fixos} />
              <Total label="(=) Resultado Operacional" valor={dados.resultado_operacional} cls="bg-cyan-100 text-cyan-800" />
              <Categoria catKey="resultado_nao_operacional" label="Resultado Não Operacional" bg="bg-gray-100" text="text-gray-800" valor={dados.resultado_nao_operacional} />
              <Total label="(=) Lucro Líquido" valor={dados.lucro_liquido} cls="bg-green-100 text-green-800" />
              <Total label="(=) % Margem Líquida" ehPct pctValor={dados.margem_liquida_pct} cls="bg-blue-50 text-blue-700" />
            </tbody>
          </table>
        </div>
        {!dados.temDados && (
          <div className="p-8 text-center text-gray-500 text-sm">
            Nenhum lançamento em Contas a Pagar/Receber ainda. Adicione lançamentos com seus Item/Conta para preencher o DRE projetado.
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 text-xs text-gray-400">
        <Info size={14} className="shrink-0 mt-0.5" />
        <span>
          Projeção baseada nas abas Contas a Pagar e a Receber (dados deste navegador). Cada lançamento entra no DRE conforme a categoria do Item/Conta selecionado.
          Não afeta o DRE real do sistema. Use "Atualizar" após adicionar lançamentos em outra aba.
        </span>
      </div>
    </div>
  );
}
