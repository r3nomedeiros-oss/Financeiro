import React, { useState, useEffect } from 'react';
import { movimentacoesAPI, contasAPI } from '../services/api';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function FluxoCaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [contaSelecionada, setContaSelecionada] = useState('todas');

  useEffect(() => {
    carregarDados();
  }, [mes, ano]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      const [movRes, contasRes] = await Promise.all([
        movimentacoesAPI.getAll({ mes, ano }),
        contasAPI.getAll()
      ]);
      setMovimentacoes(movRes.data);
      setContas(contasRes.data);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Calcular saldo inicial (soma dos saldos iniciais das contas)
  const getSaldoInicial = () => {
    if (contaSelecionada === 'todas') {
      return contas.reduce((acc, conta) => acc + (conta.saldo_inicial || 0), 0);
    }
    const conta = contas.find(c => c.id === contaSelecionada);
    return conta?.saldo_inicial || 0;
  };

  // Gerar dias do mês
  const getDiasMes = () => {
    const diasNoMes = new Date(ano, mes, 0).getDate();
    const dias = [];
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
      dias.push(dia);
    }
    return dias;
  };

  // Filtrar movimentações por conta se selecionada
  const getMovimentacoesFiltradas = () => {
    if (contaSelecionada === 'todas') {
      return movimentacoes;
    }
    return movimentacoes.filter(m => m.conta_bancaria_id === contaSelecionada);
  };

  // Calcular valores por dia
  const calcularFluxoDiario = () => {
    const dias = getDiasMes();
    const movsFiltradas = getMovimentacoesFiltradas();
    let saldoAcumulado = getSaldoInicial();
    
    // Calcular movimentações anteriores ao mês atual
    const movimentacoesAnteriores = movsFiltradas.filter(m => {
      const dataM = new Date(m.data);
      return dataM < new Date(ano, mes - 1, 1);
    });
    
    movimentacoesAnteriores.forEach(m => {
      if (m.tipo === 'entrada') {
        saldoAcumulado += m.valor;
      } else {
        saldoAcumulado -= m.valor;
      }
    });

    return dias.map(dia => {
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const movsDia = movsFiltradas.filter(m => m.data === dataStr);
      
      const entradas = movsDia
        .filter(m => m.tipo === 'entrada')
        .reduce((acc, m) => acc + m.valor, 0);
      
      const saidas = movsDia
        .filter(m => m.tipo === 'saida')
        .reduce((acc, m) => acc + m.valor, 0);
      
      saldoAcumulado += entradas - saidas;
      
      return {
        dia,
        data: dataStr,
        diaSemana: new Date(ano, mes - 1, dia).toLocaleDateString('pt-BR', { weekday: 'short' }),
        entradas,
        saidas,
        saldo: saldoAcumulado,
        temMovimento: entradas > 0 || saidas > 0
      };
    });
  };

  const fluxoDiario = calcularFluxoDiario();

  // Totais do mês
  const totais = fluxoDiario.reduce((acc, dia) => ({
    entradas: acc.entradas + dia.entradas,
    saidas: acc.saidas + dia.saidas
  }), { entradas: 0, saidas: 0 });

  const navegarMes = (direcao) => {
    if (direcao === -1) {
      if (mes === 1) {
        setMes(12);
        setAno(ano - 1);
      } else {
        setMes(mes - 1);
      }
    } else {
      if (mes === 12) {
        setMes(1);
        setAno(ano + 1);
      } else {
        setMes(mes + 1);
      }
    }
  };

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="fluxo-caixa-page">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa Diário</h1>
          <p className="text-gray-600 text-sm">Acompanhe entradas, saídas e saldo dia a dia</p>
        </div>

        <div className="flex items-center gap-4">
          {/* Filtro de Conta */}
          <select
            value={contaSelecionada}
            onChange={(e) => setContaSelecionada(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            data-testid="conta-select"
          >
            <option value="todas">Todas as Contas</option>
            {contas.map(conta => (
              <option key={conta.id} value={conta.id}>{conta.nome}</option>
            ))}
          </select>

          {/* Navegação do Mês */}
          <div className="flex items-center gap-2 bg-white rounded-lg shadow px-2 py-1">
            <button
              onClick={() => navegarMes(-1)}
              className="p-2 hover:bg-gray-100 rounded transition"
              data-testid="mes-anterior-btn"
            >
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-gray-700 min-w-[160px] text-center capitalize">
              {nomeMes}
            </span>
            <button
              onClick={() => navegarMes(1)}
              className="p-2 hover:bg-gray-100 rounded transition"
              data-testid="mes-proximo-btn"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Resumo do Mês */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">Saldo Inicial</p>
          <p className="text-xl font-bold text-gray-800">{formatCurrency(getSaldoInicial())}</p>
        </div>
        <div className="bg-green-50 rounded-lg shadow p-4">
          <p className="text-sm text-green-600">Total Entradas</p>
          <p className="text-xl font-bold text-green-700">{formatCurrency(totais.entradas)}</p>
        </div>
        <div className="bg-red-50 rounded-lg shadow p-4">
          <p className="text-sm text-red-600">Total Saídas</p>
          <p className="text-xl font-bold text-red-700">{formatCurrency(totais.saidas)}</p>
        </div>
        <div className={`rounded-lg shadow p-4 ${fluxoDiario[fluxoDiario.length - 1]?.saldo >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-sm text-gray-600">Saldo Final</p>
          <p className={`text-xl font-bold ${fluxoDiario[fluxoDiario.length - 1]?.saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {formatCurrency(fluxoDiario[fluxoDiario.length - 1]?.saldo || 0)}
          </p>
        </div>
      </div>

      {/* Tabela Diária */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm" data-testid="fluxo-tabela">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="text-left p-3 font-semibold text-gray-700 border-b">Dia</th>
                <th className="text-left p-3 font-semibold text-gray-700 border-b">Dia Semana</th>
                <th className="text-right p-3 font-semibold text-green-700 border-b">Entradas</th>
                <th className="text-right p-3 font-semibold text-red-700 border-b">Saídas</th>
                <th className="text-right p-3 font-semibold text-blue-700 border-b">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {fluxoDiario.map((dia) => (
                <tr 
                  key={dia.dia} 
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    dia.temMovimento ? '' : 'text-gray-400'
                  } ${dia.diaSemana.includes('sáb') || dia.diaSemana.includes('dom') ? 'bg-gray-50' : ''}`}
                >
                  <td className="p-3 font-medium">{String(dia.dia).padStart(2, '0')}/{String(mes).padStart(2, '0')}</td>
                  <td className="p-3 capitalize">{dia.diaSemana}</td>
                  <td className="p-3 text-right text-green-600">
                    {dia.entradas > 0 ? formatCurrency(dia.entradas) : '-'}
                  </td>
                  <td className="p-3 text-right text-red-600">
                    {dia.saidas > 0 ? formatCurrency(dia.saidas) : '-'}
                  </td>
                  <td className={`p-3 text-right font-semibold ${dia.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(dia.saldo)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 sticky bottom-0">
              <tr className="font-bold">
                <td colSpan={2} className="p-3">TOTAL DO MÊS</td>
                <td className="p-3 text-right text-green-700">{formatCurrency(totais.entradas)}</td>
                <td className="p-3 text-right text-red-700">{formatCurrency(totais.saidas)}</td>
                <td className={`p-3 text-right ${fluxoDiario[fluxoDiario.length - 1]?.saldo >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatCurrency(fluxoDiario[fluxoDiario.length - 1]?.saldo || 0)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
