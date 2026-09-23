import React from 'react';
import ContasSection from './ContasSection';

const CONFIG = {
  storageKey: 'projecao_contas_receber_v1',
  prefix: 'cr',
  viewTestid: 'contas-receber-view',
  chartTitle: 'Contas a receber por período',
  lineColor: '#059669',
  lineName: 'Total a receber',
  dateLabel: 'Recebimento',
  totalLabel: 'Total a Receber',
  doneLabel: 'Recebido',
  atrasadoLabel: 'atrasada',
  tipoPlano: 'receita',
  descricaoPlaceholder: 'Ex: Cliente ABC - NF 456',
  categorias: ['Vendas de Produtos', 'Prestação de Serviços', 'Clientes', 'Rendimentos', 'Aluguéis a Receber', 'Outros'],
  isolamentoText: 'Estes recebíveis são apenas para simulação/controle nesta aba e não afetam os relatórios do sistema. Salvos apenas neste navegador.',
};

export default function ContasAReceber() {
  return <ContasSection config={CONFIG} />;
}
