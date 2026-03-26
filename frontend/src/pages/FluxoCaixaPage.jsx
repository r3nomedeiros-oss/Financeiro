import React, { useState, useEffect } from 'react';
import { movimentacoesAPI, contasAPI } from '../services/api';
import { ChevronLeft, ChevronRight, Calendar, Download, FileSpreadsheet } from 'lucide-react';

export default function FluxoCaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [contaSelecionada, setContaSelecionada] = useState('todas');
  
  // Filtro por período personalizado
  const [usarFiltroPeriodo, setUsarFiltroPeriodo] = useState(false);
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarDados();
  }, [mes, ano, usarFiltroPeriodo, dataInicio, dataFim]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      let params = {};
      if (usarFiltroPeriodo) {
        params = { data_inicio: dataInicio, data_fim: dataFim };
      } else {
        params = { mes, ano };
      }
      
      const [movRes, contasRes] = await Promise.all([
        movimentacoesAPI.getAll(params),
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

  // Gerar dias do período
  const getDiasPeriodo = () => {
    if (usarFiltroPeriodo) {
      const dias = [];
      const inicio = new Date(dataInicio + 'T00:00:00');
      const fim = new Date(dataFim + 'T00:00:00');
      
      let atual = new Date(inicio);
      while (atual <= fim) {
        dias.push({
          dia: atual.getDate(),
          mes: atual.getMonth() + 1,
          ano: atual.getFullYear()
        });
        atual.setDate(atual.getDate() + 1);
      }
      return dias;
    } else {
      const diasNoMes = new Date(ano, mes, 0).getDate();
      const dias = [];
      for (let dia = 1; dia <= diasNoMes; dia++) {
        dias.push({ dia, mes, ano });
      }
      return dias;
    }
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
    const dias = getDiasPeriodo();
    const movsFiltradas = getMovimentacoesFiltradas();
    let saldoAcumulado = getSaldoInicial();
    
    // Calcular movimentações anteriores ao período
    const primeiroDia = usarFiltroPeriodo 
      ? new Date(dataInicio + 'T00:00:00')
      : new Date(ano, mes - 1, 1);
    
    const movimentacoesAnteriores = movsFiltradas.filter(m => {
      const dataM = new Date(m.data + 'T00:00:00');
      return dataM < primeiroDia;
    });
    
    movimentacoesAnteriores.forEach(m => {
      if (m.tipo === 'entrada') {
        saldoAcumulado += m.valor;
      } else {
        saldoAcumulado -= m.valor;
      }
    });

    return dias.map(diaInfo => {
      const dataStr = `${diaInfo.ano}-${String(diaInfo.mes).padStart(2, '0')}-${String(diaInfo.dia).padStart(2, '0')}`;
      const movsDia = movsFiltradas.filter(m => m.data === dataStr);
      
      const entradas = movsDia
        .filter(m => m.tipo === 'entrada')
        .reduce((acc, m) => acc + m.valor, 0);
      
      const saidas = movsDia
        .filter(m => m.tipo === 'saida')
        .reduce((acc, m) => acc + m.valor, 0);
      
      saldoAcumulado += entradas - saidas;
      
      return {
        dia: diaInfo.dia,
        mes: diaInfo.mes,
        ano: diaInfo.ano,
        data: dataStr,
        diaSemana: new Date(diaInfo.ano, diaInfo.mes - 1, diaInfo.dia).toLocaleDateString('pt-BR', { weekday: 'short' }),
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

  // Exportar para Excel
  const exportToExcel = () => {
    const rows = [['Data', 'Dia Semana', 'Entradas', 'Saídas', 'Saldo'].join(';')];
    
    fluxoDiario.forEach(dia => {
      rows.push([
        `${String(dia.dia).padStart(2, '0')}/${String(dia.mes).padStart(2, '0')}/${dia.ano}`,
        dia.diaSemana,
        dia.entradas.toFixed(2).replace('.', ','),
        dia.saidas.toFixed(2).replace('.', ','),
        dia.saldo.toFixed(2).replace('.', ',')
      ].join(';'));
    });
    
    rows.push(['TOTAL', '', totais.entradas.toFixed(2).replace('.', ','), totais.saidas.toFixed(2).replace('.', ','), (fluxoDiario[fluxoDiario.length - 1]?.saldo || 0).toFixed(2).replace('.', ',')].join(';'));
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = usarFiltroPeriodo ? `FluxoCaixa_${dataInicio}_${dataFim}.csv` : `FluxoCaixa_${mes}_${ano}.csv`;
    link.click();
  };

  // Exportar para PDF
  const exportToPDF = () => {
    const rows = fluxoDiario.map(dia => `
      <tr style="${dia.diaSemana.includes('sáb') || dia.diaSemana.includes('dom') ? 'background:#f5f5f5;' : ''}">
        <td style="padding:4px;border:1px solid #ddd;">${String(dia.dia).padStart(2, '0')}/${String(dia.mes).padStart(2, '0')}</td>
        <td style="padding:4px;border:1px solid #ddd;text-transform:capitalize;">${dia.diaSemana}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:right;color:#16a34a;">${dia.entradas > 0 ? formatCurrency(dia.entradas) : '-'}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:right;color:#dc2626;">${dia.saidas > 0 ? formatCurrency(dia.saidas) : '-'}</td>
        <td style="padding:4px;border:1px solid #ddd;text-align:right;font-weight:600;color:${dia.saldo >= 0 ? '#2563eb' : '#dc2626'};">${formatCurrency(dia.saldo)}</td>
      </tr>
    `).join('');
    
    const titulo = usarFiltroPeriodo 
      ? `Fluxo de Caixa - ${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : `Fluxo de Caixa - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}`;
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${titulo}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
          h1 { text-align: center; margin-bottom: 20px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; }
          th { background: #e5e5e5; padding: 6px; border: 1px solid #ddd; text-align: left; }
          @media print { @page { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h1>${titulo}</h1>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Dia Semana</th>
              <th style="text-align:right;">Entradas</th>
              <th style="text-align:right;">Saídas</th>
              <th style="text-align:right;">Saldo</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
          <tfoot>
            <tr style="background:#d5d5d5;font-weight:bold;">
              <td colspan="2" style="padding:6px;border:1px solid #ddd;">TOTAL</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#16a34a;">${formatCurrency(totais.entradas)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right;color:#dc2626;">${formatCurrency(totais.saidas)}</td>
              <td style="padding:6px;border:1px solid #ddd;text-align:right;color:${(fluxoDiario[fluxoDiario.length - 1]?.saldo || 0) >= 0 ? '#2563eb' : '#dc2626'};">${formatCurrency(fluxoDiario[fluxoDiario.length - 1]?.saldo || 0)}</td>
            </tr>
          </tfoot>
        </table>
        <script>setTimeout(() => { window.print(); window.close(); }, 500);</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

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

        <div className="flex items-center gap-3">
          {/* Botões de Exportação */}
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
            data-testid="export-excel-btn"
          >
            <FileSpreadsheet size={16} />
            Excel
          </button>
          <button
            onClick={exportToPDF}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700"
            data-testid="export-pdf-btn"
          >
            <Download size={16} />
            PDF
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Toggle Filtro */}
          <button
            onClick={() => setUsarFiltroPeriodo(!usarFiltroPeriodo)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition ${
              usarFiltroPeriodo ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}
            data-testid="toggle-filtro-periodo"
          >
            <Calendar size={16} />
            {usarFiltroPeriodo ? 'Filtro por Período' : 'Filtro por Mês'}
          </button>

          {usarFiltroPeriodo ? (
            <>
              {/* Filtro por Período */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">De:</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="data-inicio"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Até:</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="data-fim"
                />
              </div>
            </>
          ) : (
            <>
              {/* Navegação do Mês */}
              <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-2 py-1">
                <button
                  onClick={() => navegarMes(-1)}
                  className="p-2 hover:bg-gray-200 rounded transition"
                  data-testid="mes-anterior-btn"
                >
                  <ChevronLeft size={20} />
                </button>
                <span className="font-semibold text-gray-700 min-w-[160px] text-center capitalize">
                  {nomeMes}
                </span>
                <button
                  onClick={() => navegarMes(1)}
                  className="p-2 hover:bg-gray-200 rounded transition"
                  data-testid="mes-proximo-btn"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </>
          )}

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
                  key={dia.dia + '-' + dia.mes + '-' + dia.ano} 
                  className={`border-b border-gray-100 hover:bg-gray-50 ${
                    dia.temMovimento ? '' : 'text-gray-400'
                  } ${dia.diaSemana.includes('sáb') || dia.diaSemana.includes('dom') ? 'bg-gray-50' : ''}`}
                >
                  <td className="p-3 font-medium">{String(dia.dia).padStart(2, '0')}/{String(dia.mes).padStart(2, '0')}</td>
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
