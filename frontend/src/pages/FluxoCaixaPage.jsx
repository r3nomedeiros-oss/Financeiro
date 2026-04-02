import React, { useState, useEffect } from 'react';
import { movimentacoesAPI, contasAPI } from '../services/api';
import { ChevronLeft, ChevronRight, Calendar, Download, FileSpreadsheet, List } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function FluxoCaixaPage() {
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [contaSelecionada, setContaSelecionada] = useState('todas');
  
  // Modo de visualização: 'mes' = resumo mensal, 'periodo' = detalhamento diário
  const [modoVisualizacao, setModoVisualizacao] = useState('mes');
  const [dataInicio, setDataInicio] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  );
  const [dataFim, setDataFim] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    carregarDados();
  }, [mes, ano, modoVisualizacao, dataInicio, dataFim]);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      let params = {};
      if (modoVisualizacao === 'periodo') {
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
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getSaldoInicial = () => {
    if (contaSelecionada === 'todas') {
      return contas.reduce((acc, conta) => acc + (conta.saldo_inicial || 0), 0);
    }
    const conta = contas.find(c => c.id === contaSelecionada);
    return conta?.saldo_inicial || 0;
  };

  const getMovimentacoesFiltradas = () => {
    if (contaSelecionada === 'todas') {
      return movimentacoes;
    }
    return movimentacoes.filter(m => m.conta_bancaria_id === contaSelecionada);
  };

  // Calcular fluxo diário para modo período
  const calcularFluxoDiario = () => {
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

    const movsFiltradas = getMovimentacoesFiltradas();
    let saldoAcumulado = getSaldoInicial();
    
    // Movimentações anteriores
    const movimentacoesAnteriores = movsFiltradas.filter(m => {
      const dataM = new Date(m.data + 'T00:00:00');
      return dataM < inicio;
    });
    
    movimentacoesAnteriores.forEach(m => {
      if (m.tipo === 'entrada') saldoAcumulado += m.valor;
      else saldoAcumulado -= m.valor;
    });

    return dias.map(diaInfo => {
      const dataStr = `${diaInfo.ano}-${String(diaInfo.mes).padStart(2, '0')}-${String(diaInfo.dia).padStart(2, '0')}`;
      const movsDia = movsFiltradas.filter(m => m.data === dataStr);
      
      const entradas = movsDia.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0);
      const saidas = movsDia.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0);
      
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

  // Calcular resumo mensal por semana
  const calcularResumoMensal = () => {
    const movsFiltradas = getMovimentacoesFiltradas();
    const diasNoMes = new Date(ano, mes, 0).getDate();
    
    // Agrupar por semana
    const semanas = [];
    let semanaAtual = { inicio: 1, fim: 0, entradas: 0, saidas: 0 };
    
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const dataObj = new Date(ano, mes - 1, dia);
      const diaSemana = dataObj.getDay(); // 0 = domingo
      
      const dataStr = `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
      const movsDia = movsFiltradas.filter(m => m.data === dataStr);
      
      const entradas = movsDia.filter(m => m.tipo === 'entrada').reduce((acc, m) => acc + m.valor, 0);
      const saidas = movsDia.filter(m => m.tipo === 'saida').reduce((acc, m) => acc + m.valor, 0);
      
      semanaAtual.entradas += entradas;
      semanaAtual.saidas += saidas;
      semanaAtual.fim = dia;
      
      // Se é domingo ou último dia do mês, fecha a semana
      if (diaSemana === 0 || dia === diasNoMes) {
        semanas.push({ ...semanaAtual });
        semanaAtual = { inicio: dia + 1, fim: 0, entradas: 0, saidas: 0 };
      }
    }
    
    // Calcular saldos
    let saldoAcumulado = getSaldoInicial();
    
    // Movimentações anteriores ao mês
    const primeiroDia = new Date(ano, mes - 1, 1);
    const movimentacoesAnteriores = movsFiltradas.filter(m => new Date(m.data + 'T00:00:00') < primeiroDia);
    movimentacoesAnteriores.forEach(m => {
      if (m.tipo === 'entrada') saldoAcumulado += m.valor;
      else saldoAcumulado -= m.valor;
    });
    
    return semanas.map((sem, idx) => {
      saldoAcumulado += sem.entradas - sem.saidas;
      return {
        ...sem,
        numero: idx + 1,
        saldo: saldoAcumulado
      };
    });
  };

  const fluxoDiario = modoVisualizacao === 'periodo' ? calcularFluxoDiario() : [];
  const resumoMensal = modoVisualizacao === 'mes' ? calcularResumoMensal() : [];

  // Totais
  const totais = modoVisualizacao === 'periodo' 
    ? fluxoDiario.reduce((acc, dia) => ({ entradas: acc.entradas + dia.entradas, saidas: acc.saidas + dia.saidas }), { entradas: 0, saidas: 0 })
    : resumoMensal.reduce((acc, sem) => ({ entradas: acc.entradas + sem.entradas, saidas: acc.saidas + sem.saidas }), { entradas: 0, saidas: 0 });

  const saldoFinal = modoVisualizacao === 'periodo'
    ? (fluxoDiario[fluxoDiario.length - 1]?.saldo || getSaldoInicial())
    : (resumoMensal[resumoMensal.length - 1]?.saldo || getSaldoInicial());

  const navegarMes = (direcao) => {
    if (direcao === -1) {
      if (mes === 1) { setMes(12); setAno(ano - 1); }
      else setMes(mes - 1);
    } else {
      if (mes === 12) { setMes(1); setAno(ano + 1); }
      else setMes(mes + 1);
    }
  };

  const nomeMes = new Date(ano, mes - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Exportar Excel
  const exportToExcel = () => {
    const rows = [];
    
    if (modoVisualizacao === 'periodo') {
      rows.push(['Data', 'Dia Semana', 'Entradas', 'Saídas', 'Saldo'].join(';'));
      fluxoDiario.forEach(dia => {
        rows.push([
          `${String(dia.dia).padStart(2, '0')}/${String(dia.mes).padStart(2, '0')}/${dia.ano}`,
          dia.diaSemana,
          dia.entradas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
          dia.saidas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
          dia.saldo.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')
        ].join(';'));
      });
    } else {
      rows.push(['Semana', 'Período', 'Entradas', 'Saídas', 'Saldo'].join(';'));
      resumoMensal.forEach(sem => {
        rows.push([
          `Semana ${sem.numero}`,
          `${String(sem.inicio).padStart(2, '0')}/${String(mes).padStart(2, '0')} - ${String(sem.fim).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
          sem.entradas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
          sem.saidas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'),
          sem.saldo.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')
        ].join(';'));
      });
    }
    
    rows.push(['TOTAL', '', totais.entradas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'), totais.saidas.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.'), saldoFinal.toFixed(0).replace(/B(?=(d{3})+(?!d))/g, '.')].join(';'));
    
    const csvContent = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = modoVisualizacao === 'periodo' ? `FluxoCaixa_${dataInicio}_${dataFim}.csv` : `FluxoCaixa_${mes}_${ano}.csv`;
    link.click();
  };

  // Exportar PDF - download automático
  const exportToPDF = () => {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    
    const titulo = modoVisualizacao === 'periodo'
      ? `Fluxo de Caixa - ${new Date(dataInicio + 'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(dataFim + 'T00:00:00').toLocaleDateString('pt-BR')}`
      : `Fluxo de Caixa - ${nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)}`;
    
    doc.setFontSize(14);
    doc.text(titulo, doc.internal.pageSize.width / 2, 15, { align: 'center' });
    
    let headers, body;
    
    if (modoVisualizacao === 'periodo') {
      headers = [['Data', 'Dia', 'Entradas', 'Saídas', 'Saldo']];
      body = fluxoDiario.map(dia => [
        `${String(dia.dia).padStart(2, '0')}/${String(dia.mes).padStart(2, '0')}`,
        dia.diaSemana,
        formatCurrency(dia.entradas),
        formatCurrency(dia.saidas),
        formatCurrency(dia.saldo)
      ]);
    } else {
      headers = [['Semana', 'Período', 'Entradas', 'Saídas', 'Saldo']];
      body = resumoMensal.map(sem => [
        `Semana ${sem.numero}`,
        `${String(sem.inicio).padStart(2, '0')}/${String(mes).padStart(2, '0')} - ${String(sem.fim).padStart(2, '0')}/${String(mes).padStart(2, '0')}`,
        formatCurrency(sem.entradas),
        formatCurrency(sem.saidas),
        formatCurrency(sem.saldo)
      ]);
    }
    
    // Adicionar linha de total
    body.push(['TOTAL', '', formatCurrency(totais.entradas), formatCurrency(totais.saidas), formatCurrency(saldoFinal)]);
    
    autoTable(doc, {
      head: headers,
      body: body,
      startY: 22,
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [229, 229, 229], textColor: [0, 0, 0], fontStyle: 'bold' },
      footStyles: { fillColor: [200, 200, 200], fontStyle: 'bold' },
      didParseCell: function(data) {
        if (data.row.index === body.length - 1) {
          data.cell.styles.fillColor = [200, 200, 200];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    });
    
    doc.save(modoVisualizacao === 'periodo' ? `FluxoCaixa_${dataInicio}_${dataFim}.pdf` : `FluxoCaixa_${mes}_${ano}.pdf`);
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
          <h1 className="text-2xl font-bold text-gray-800">Fluxo de Caixa</h1>
          <p className="text-gray-600 text-sm">
            {modoVisualizacao === 'mes' ? 'Resumo mensal por semana' : 'Detalhamento diário'}
          </p>
        </div>

        <div className="flex items-center gap-3">
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

      {/* Tabs de Modo */}
      <div className="bg-white rounded-lg shadow">
        <div className="flex border-b">
          <button
            onClick={() => setModoVisualizacao('mes')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition border-b-2 ${
              modoVisualizacao === 'mes' 
                ? 'border-blue-600 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-mes"
          >
            <Calendar size={18} />
            Resumo Mensal
          </button>
          <button
            onClick={() => setModoVisualizacao('periodo')}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition border-b-2 ${
              modoVisualizacao === 'periodo' 
                ? 'border-blue-600 text-blue-600 bg-blue-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            data-testid="tab-periodo"
          >
            <List size={18} />
            Detalhamento por Período
          </button>
        </div>

        {/* Filtros */}
        <div className="p-4 flex flex-wrap items-center gap-4 bg-gray-50">
          {modoVisualizacao === 'mes' ? (
            <div className="flex items-center gap-2 bg-white rounded-lg border px-2 py-1">
              <button onClick={() => navegarMes(-1)} className="p-2 hover:bg-gray-100 rounded transition" data-testid="mes-anterior-btn">
                <ChevronLeft size={20} />
              </button>
              <span className="font-semibold text-gray-700 min-w-[160px] text-center capitalize">{nomeMes}</span>
              <button onClick={() => navegarMes(1)} className="p-2 hover:bg-gray-100 rounded transition" data-testid="mes-proximo-btn">
                <ChevronRight size={20} />
              </button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">De:</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="data-inicio"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium">Até:</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  data-testid="data-fim"
                />
              </div>
            </>
          )}

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

      {/* Resumo Cards */}
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
        <div className={`rounded-lg shadow p-4 ${saldoFinal >= 0 ? 'bg-blue-50' : 'bg-red-50'}`}>
          <p className="text-sm text-gray-600">Saldo Final</p>
          <p className={`text-xl font-bold ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
            {formatCurrency(saldoFinal)}
          </p>
        </div>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          {modoVisualizacao === 'mes' ? (
            // Resumo Mensal - por semana
            <table className="w-full text-sm" data-testid="fluxo-tabela-resumo">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-3 font-semibold text-gray-700 border-b">Semana</th>
                  <th className="text-left p-3 font-semibold text-gray-700 border-b">Período</th>
                  <th className="text-right p-3 font-semibold text-green-700 border-b">Entradas</th>
                  <th className="text-right p-3 font-semibold text-red-700 border-b">Saídas</th>
                  <th className="text-right p-3 font-semibold text-blue-700 border-b">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {resumoMensal.map((sem) => (
                  <tr key={sem.numero} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="p-3 font-medium">Semana {sem.numero}</td>
                    <td className="p-3 text-gray-600">
                      {String(sem.inicio).padStart(2, '0')}/{String(mes).padStart(2, '0')} - {String(sem.fim).padStart(2, '0')}/{String(mes).padStart(2, '0')}
                    </td>
                    <td className="p-3 text-right text-green-600">
                      {sem.entradas > 0 ? formatCurrency(sem.entradas) : '-'}
                    </td>
                    <td className="p-3 text-right text-red-600">
                      {sem.saidas > 0 ? formatCurrency(sem.saidas) : '-'}
                    </td>
                    <td className={`p-3 text-right font-semibold ${sem.saldo >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {formatCurrency(sem.saldo)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 sticky bottom-0">
                <tr className="font-bold">
                  <td colSpan={2} className="p-3">TOTAL DO MÊS</td>
                  <td className="p-3 text-right text-green-700">{formatCurrency(totais.entradas)}</td>
                  <td className="p-3 text-right text-red-700">{formatCurrency(totais.saidas)}</td>
                  <td className={`p-3 text-right ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatCurrency(saldoFinal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          ) : (
            // Detalhamento por período - diário
            <table className="w-full text-sm" data-testid="fluxo-tabela-diario">
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
                    key={dia.data} 
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
                  <td colSpan={2} className="p-3">TOTAL DO PERÍODO</td>
                  <td className="p-3 text-right text-green-700">{formatCurrency(totais.entradas)}</td>
                  <td className="p-3 text-right text-red-700">{formatCurrency(totais.saidas)}</td>
                  <td className={`p-3 text-right ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                    {formatCurrency(saldoFinal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
