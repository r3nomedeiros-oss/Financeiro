import React, { useState, useEffect } from 'react';
import { dreAPI } from '../services/api';

// Estrutura do DRE conforme imagem Excel
const DRE_ESTRUTURA = {
  receita_bruta: {
    label: "(+) Receita Bruta",
    cor: "text-cyan-600 font-semibold",
    bgCor: "bg-cyan-50",
    itens: [
      { codigo: "1", nome: "1 - Receita com Vendas" }
    ]
  },
  deducoes_vendas: {
    label: "(-) Deduções Sobre Vendas",
    cor: "text-red-600 font-semibold",
    bgCor: "bg-red-50",
    itens: [
      { codigo: "2", nome: "2 - Impostos Sobre Vendas" },
      { codigo: "3", nome: "3 - Outras Deduções" }
    ]
  },
  receita_liquida: {
    label: "(=) Receita Líquida",
    cor: "text-cyan-600 font-semibold",
    bgCor: "bg-cyan-50",
    isTotal: true
  },
  custos_variaveis: {
    label: "(-) Custos Variáveis",
    cor: "text-red-600 font-semibold",
    bgCor: "bg-red-50",
    itens: [
      { codigo: "4", nome: "4 - Custos com Fornecedores" },
      { codigo: "21", nome: "21 - Custos com Vendas" },
      { codigo: "22", nome: "22 - Custos com Produção" }
    ]
  },
  margem_contribuicao: {
    label: "(=) Margem de Contribuição",
    cor: "text-cyan-600 font-semibold",
    bgCor: "bg-cyan-50",
    isTotal: true
  },
  margem_contribuicao_pct: {
    label: "(=) % Margem de Contribuição",
    cor: "text-blue-600 font-semibold",
    bgCor: "bg-blue-50",
    isPercent: true
  },
  custos_fixos: {
    label: "(-) Custos Fixos",
    cor: "text-red-600 font-semibold",
    bgCor: "bg-red-50",
    itens: [
      { codigo: "5", nome: "5 - Gastos com Pessoal" },
      { codigo: "6", nome: "6 - Gastos com Ocupação" },
      { codigo: "7", nome: "7 - Gastos com Serviços de Terceiros" },
      { codigo: "16", nome: "16 - Gastos Operacionais" },
      { codigo: "17", nome: "17 - Gastos Financeiros" },
      { codigo: "18", nome: "18 - Gastos com Veículos" },
      { codigo: "19", nome: "19 - Despesas com Materiais e Equipamentos" },
      { codigo: "20", nome: "20 - Gastos Administrativos" }
    ]
  },
  resultado_operacional: {
    label: "(=) Resultado Operacional",
    cor: "text-cyan-600 font-semibold",
    bgCor: "bg-cyan-50",
    isTotal: true
  },
  resultado_nao_operacional_header: {
    label: "Resultado Não Operacional",
    cor: "text-gray-800 font-semibold",
    bgCor: "bg-gray-100",
    isHeader: true
  },
  receitas_nao_operacionais: {
    label: "",
    cor: "",
    bgCor: "",
    itens: [
      { codigo: "9", nome: "9 - Receitas não Operacionais" }
    ]
  },
  gastos_nao_operacionais: {
    label: "",
    cor: "",
    bgCor: "",
    itens: [
      { codigo: "10", nome: "10 - Gastos não Operacionais" },
      { codigo: "12", nome: "12 - Investimentos" }
    ]
  },
  lucro_liquido: {
    label: "(=) Lucro Líquido",
    cor: "text-green-600 font-bold",
    bgCor: "bg-green-50",
    isTotal: true
  },
  margem_liquida_pct: {
    label: "(=) % Margem Líquida",
    cor: "text-blue-600 font-semibold",
    bgCor: "bg-blue-50",
    isPercent: true
  }
};

const MESES_LABELS = {
  janeiro: "Jan",
  fevereiro: "Fev",
  marco: "Mar",
  abril: "Abr",
  maio: "Mai",
  junho: "Jun",
  julho: "Jul",
  agosto: "Ago",
  setembro: "Set",
  outubro: "Out",
  novembro: "Nov",
  dezembro: "Dez"
};

export default function DREPage() {
  const [dre, setDre] = useState(null);
  const [loading, setLoading] = useState(false);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [criandoPlano, setCriandoPlano] = useState(false);

  useEffect(() => {
    carregarDRE();
  }, [ano]);

  const carregarDRE = async () => {
    try {
      setLoading(true);
      const response = await dreAPI.getAnual(ano);
      setDre(response.data);
    } catch (error) {
      console.error('Erro ao carregar DRE:', error);
    } finally {
      setLoading(false);
    }
  };

  const criarPlanoPadrao = async () => {
    try {
      setCriandoPlano(true);
      await dreAPI.criarPlanoPadrao();
      alert('Plano de contas padrão criado com sucesso!');
      carregarDRE();
    } catch (error) {
      console.error('Erro ao criar plano de contas:', error);
      alert('Erro ao criar plano de contas padrão');
    } finally {
      setCriandoPlano(false);
    }
  };

  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === 0) return '-';
    const isNegative = value < 0;
    const formatted = new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Math.abs(value));
    return isNegative ? `-${formatted}` : formatted;
  };

  const formatPercent = (value) => {
    if (value === null || value === undefined || value === 0) return '0%';
    return `${value.toFixed(0)}%`;
  };

  const getValorClasse = (valor, isPercent = false) => {
    if (valor === 0 || valor === null || valor === undefined) return 'text-gray-400';
    if (isPercent) return valor < 0 ? 'text-red-600' : 'text-gray-800';
    return valor < 0 ? 'text-red-600' : 'text-gray-800';
  };

  const calcularAV = (valor, receitaBrutaTotal) => {
    if (!receitaBrutaTotal || receitaBrutaTotal === 0) return '0%';
    return `${((valor / receitaBrutaTotal) * 100).toFixed(0)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600"></div>
      </div>
    );
  }

  const meses = dre?.meses || [];
  const totais = dre?.totais || {};
  const linhas = dre?.linhas || {};
  const receitaBrutaTotal = totais?.receita_bruta?.total || 0;

  return (
    <div className="space-y-4" data-testid="dre-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">DRE - Demonstrativo de Resultado</h1>
          <p className="text-gray-600 text-sm">Visão anual consolidada</p>
        </div>

        <div className="flex gap-3 items-center">
          <button
            onClick={criarPlanoPadrao}
            disabled={criandoPlano}
            className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            data-testid="criar-plano-btn"
          >
            {criandoPlano ? 'Criando...' : 'Criar Plano Padrão'}
          </button>
          
          <select
            value={ano}
            onChange={(e) => setAno(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            data-testid="ano-select"
          >
            {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i + 1).map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela DRE estilo Excel */}
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm border-collapse" data-testid="dre-table">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="text-left p-2 sticky left-0 bg-gray-100 min-w-[280px] border-r border-gray-300">
                Descrição
              </th>
              {meses.map((mes) => (
                <th key={mes} className="text-right p-2 min-w-[85px] border-r border-gray-200">
                  {MESES_LABELS[mes]}
                </th>
              ))}
              <th className="text-right p-2 min-w-[100px] bg-gray-200 border-r border-gray-300 font-bold">
                {ano}
              </th>
              <th className="text-right p-2 min-w-[60px] bg-gray-200 font-bold">
                AV%
              </th>
            </tr>
          </thead>
          <tbody>
            {/* (+) Receita Bruta */}
            <tr className="bg-cyan-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-cyan-50 text-cyan-700 font-semibold border-r border-gray-300">
                (+) Receita Bruta
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-cyan-700 font-semibold border-r border-gray-200">
                  {formatCurrency(totais.receita_bruta?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold border-r border-gray-300">
                {formatCurrency(totais.receita_bruta?.total)}
              </td>
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold">
                100%
              </td>
            </tr>

            {/* 1 - Receita com Vendas */}
            <tr className="border-b border-gray-100 hover:bg-gray-50">
              <td className="p-2 pl-4 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                1 - Receita com Vendas
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 border-r border-gray-200">
                  {formatCurrency(linhas["1"]?.meses?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                {formatCurrency(linhas["1"]?.total)}
              </td>
              <td className="text-right p-2 bg-gray-50">
                {calcularAV(linhas["1"]?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* (-) Deduções Sobre Vendas */}
            <tr className="bg-red-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-red-50 text-red-600 font-semibold border-r border-gray-300">
                (-) Deduções Sobre Vendas
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-red-600 font-semibold border-r border-gray-200">
                  {formatCurrency(totais.deducoes_vendas?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold border-r border-gray-300">
                {formatCurrency(totais.deducoes_vendas?.total)}
              </td>
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold">
                {calcularAV(totais.deducoes_vendas?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* Itens de Deduções */}
            {["2", "3"].map((codigo) => (
              <tr key={codigo} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-2 pl-4 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                  {codigo} - {linhas[codigo]?.nome || (codigo === "2" ? "Impostos Sobre Vendas" : "Outras Deduções")}
                </td>
                {meses.map((mes) => (
                  <td key={mes} className="text-right p-2 border-r border-gray-200">
                    {formatCurrency(linhas[codigo]?.meses?.[mes])}
                  </td>
                ))}
                <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                  {formatCurrency(linhas[codigo]?.total)}
                </td>
                <td className="text-right p-2 bg-gray-50">
                  {calcularAV(linhas[codigo]?.total, receitaBrutaTotal)}
                </td>
              </tr>
            ))}

            {/* (=) Receita Líquida */}
            <tr className="bg-cyan-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-cyan-50 text-cyan-700 font-semibold border-r border-gray-300">
                (=) Receita Líquida
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-cyan-700 font-semibold border-r border-gray-200">
                  {formatCurrency(totais.receita_liquida?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold border-r border-gray-300">
                {formatCurrency(totais.receita_liquida?.total)}
              </td>
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold">
                {calcularAV(totais.receita_liquida?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* (-) Custos Variáveis */}
            <tr className="bg-red-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-red-50 text-red-600 font-semibold border-r border-gray-300">
                (-) Custos Variáveis
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-red-600 font-semibold border-r border-gray-200">
                  {formatCurrency(totais.custos_variaveis?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold border-r border-gray-300">
                {formatCurrency(totais.custos_variaveis?.total)}
              </td>
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold">
                {calcularAV(totais.custos_variaveis?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* Itens de Custos Variáveis */}
            {["4", "21", "22"].map((codigo) => (
              <tr key={codigo} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-2 pl-4 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                  {codigo} - {linhas[codigo]?.nome || `Custo ${codigo}`}
                </td>
                {meses.map((mes) => (
                  <td key={mes} className="text-right p-2 border-r border-gray-200">
                    {formatCurrency(linhas[codigo]?.meses?.[mes])}
                  </td>
                ))}
                <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                  {formatCurrency(linhas[codigo]?.total)}
                </td>
                <td className="text-right p-2 bg-gray-50">
                  {calcularAV(linhas[codigo]?.total, receitaBrutaTotal)}
                </td>
              </tr>
            ))}

            {/* (=) Margem de Contribuição */}
            <tr className="bg-cyan-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-cyan-50 text-cyan-700 font-semibold border-r border-gray-300">
                (=) Margem de Contribuição
              </td>
              {meses.map((mes) => (
                <td key={mes} className={`text-right p-2 font-semibold border-r border-gray-200 ${getValorClasse(totais.margem_contribuicao?.[mes])}`}>
                  {formatCurrency(totais.margem_contribuicao?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold border-r border-gray-300">
                {formatCurrency(totais.margem_contribuicao?.total)}
              </td>
              <td className="text-right p-2 bg-cyan-100 text-cyan-700 font-bold">
                {calcularAV(totais.margem_contribuicao?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* (=) % Margem de Contribuição */}
            <tr className="bg-blue-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-blue-50 text-blue-600 font-semibold border-r border-gray-300">
                (=) % Margem de Contribuição
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-blue-600 font-semibold border-r border-gray-200">
                  {formatPercent(totais.margem_contribuicao_pct?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-blue-100 text-blue-700 font-bold border-r border-gray-300">
                {formatPercent(totais.margem_contribuicao_pct?.total)}
              </td>
              <td className="text-right p-2 bg-blue-100 text-blue-700 font-bold">
                {formatPercent(totais.margem_contribuicao_pct?.total)}
              </td>
            </tr>

            {/* (-) Custos Fixos */}
            <tr className="bg-red-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-red-50 text-red-600 font-semibold border-r border-gray-300">
                (-) Custos Fixos
              </td>
              {meses.map((mes) => (
                <td key={mes} className="text-right p-2 text-red-600 font-semibold border-r border-gray-200">
                  {formatCurrency(totais.custos_fixos?.[mes])}
                </td>
              ))}
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold border-r border-gray-300">
                {formatCurrency(totais.custos_fixos?.total)}
              </td>
              <td className="text-right p-2 bg-red-100 text-red-600 font-bold">
                {calcularAV(totais.custos_fixos?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* Itens de Custos Fixos */}
            {["5", "6", "7", "16", "17", "18", "19", "20"].map((codigo) => (
              <tr key={codigo} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-2 pl-4 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                  {codigo} - {linhas[codigo]?.nome || `Gasto ${codigo}`}
                </td>
                {meses.map((mes) => (
                  <td key={mes} className="text-right p-2 border-r border-gray-200">
                    {formatCurrency(linhas[codigo]?.meses?.[mes])}
                  </td>
                ))}
                <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                  {formatCurrency(linhas[codigo]?.total)}
                </td>
                <td className="text-right p-2 bg-gray-50">
                  {calcularAV(linhas[codigo]?.total, receitaBrutaTotal)}
                </td>
              </tr>
            ))}

            {/* (=) Resultado Operacional */}
            <tr className="bg-cyan-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-cyan-50 text-cyan-700 font-semibold border-r border-gray-300">
                (=) Resultado Operacional
              </td>
              {meses.map((mes) => (
                <td key={mes} className={`text-right p-2 font-semibold border-r border-gray-200 ${getValorClasse(totais.resultado_operacional?.[mes])}`}>
                  {formatCurrency(totais.resultado_operacional?.[mes])}
                </td>
              ))}
              <td className={`text-right p-2 bg-cyan-100 font-bold border-r border-gray-300 ${getValorClasse(totais.resultado_operacional?.total)}`}>
                {formatCurrency(totais.resultado_operacional?.total)}
              </td>
              <td className="text-right p-2 bg-cyan-100 font-bold">
                {calcularAV(totais.resultado_operacional?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* Resultado Não Operacional - Header */}
            <tr className="bg-gray-100 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-gray-100 text-gray-800 font-semibold border-r border-gray-300">
                Resultado Não Operacional
              </td>
              {meses.map((mes) => (
                <td key={mes} className={`text-right p-2 font-semibold border-r border-gray-200 ${getValorClasse(totais.resultado_nao_operacional?.[mes])}`}>
                  {formatCurrency(totais.resultado_nao_operacional?.[mes])}
                </td>
              ))}
              <td className={`text-right p-2 bg-gray-200 font-bold border-r border-gray-300 ${getValorClasse(totais.resultado_nao_operacional?.total)}`}>
                {formatCurrency(totais.resultado_nao_operacional?.total)}
              </td>
              <td className="text-right p-2 bg-gray-200 font-bold">
                {calcularAV(totais.resultado_nao_operacional?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* Itens Não Operacionais */}
            {["9", "10", "12"].map((codigo) => (
              <tr key={codigo} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-2 pl-4 sticky left-0 bg-white hover:bg-gray-50 border-r border-gray-300">
                  {codigo} - {linhas[codigo]?.nome || `Item ${codigo}`}
                </td>
                {meses.map((mes) => (
                  <td key={mes} className="text-right p-2 border-r border-gray-200">
                    {formatCurrency(linhas[codigo]?.meses?.[mes])}
                  </td>
                ))}
                <td className="text-right p-2 bg-gray-50 border-r border-gray-300">
                  {formatCurrency(linhas[codigo]?.total)}
                </td>
                <td className="text-right p-2 bg-gray-50">
                  {calcularAV(linhas[codigo]?.total, receitaBrutaTotal)}
                </td>
              </tr>
            ))}

            {/* (=) Lucro Líquido */}
            <tr className="bg-green-50 border-b border-gray-200">
              <td className="p-2 sticky left-0 bg-green-50 text-green-700 font-bold border-r border-gray-300">
                (=) Lucro Líquido
              </td>
              {meses.map((mes) => (
                <td key={mes} className={`text-right p-2 font-bold border-r border-gray-200 ${totais.lucro_liquido?.[mes] >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(totais.lucro_liquido?.[mes])}
                </td>
              ))}
              <td className={`text-right p-2 bg-green-100 font-bold border-r border-gray-300 ${totais.lucro_liquido?.total >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                {formatCurrency(totais.lucro_liquido?.total)}
              </td>
              <td className="text-right p-2 bg-green-100 font-bold">
                {calcularAV(totais.lucro_liquido?.total, receitaBrutaTotal)}
              </td>
            </tr>

            {/* (=) % Margem Líquida */}
            <tr className="bg-blue-50">
              <td className="p-2 sticky left-0 bg-blue-50 text-blue-600 font-semibold border-r border-gray-300">
                (=) % Margem Líquida
              </td>
              {meses.map((mes) => (
                <td key={mes} className={`text-right p-2 font-semibold border-r border-gray-200 ${totais.margem_liquida_pct?.[mes] >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  {formatPercent(totais.margem_liquida_pct?.[mes])}
                </td>
              ))}
              <td className={`text-right p-2 bg-blue-100 font-bold border-r border-gray-300 ${totais.margem_liquida_pct?.total >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                {formatPercent(totais.margem_liquida_pct?.total)}
              </td>
              <td className="text-right p-2 bg-blue-100 font-bold">
                {formatPercent(totais.margem_liquida_pct?.total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Legenda */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-gray-700 mb-2">Legenda:</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-cyan-100 border border-cyan-300 rounded"></span>
            <span>Receitas / Totais</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-red-100 border border-red-300 rounded"></span>
            <span>Custos / Deduções</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-green-100 border border-green-300 rounded"></span>
            <span>Lucro Líquido</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-4 h-4 bg-blue-100 border border-blue-300 rounded"></span>
            <span>Percentuais</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-gray-400">-</span>
            <span>Sem movimento</span>
          </div>
        </div>
      </div>
    </div>
  );
}
