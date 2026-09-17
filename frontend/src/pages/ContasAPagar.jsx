import React from 'react';
import ContasSection from './ContasSection';

const CONFIG = {
  storageKey: 'projecao_contas_pagar_v1',
  prefix: 'cp',
  viewTestid: 'contas-pagar-view',
  chartTitle: 'Contas a pagar por período',
  lineColor: '#dc2626',
  lineName: 'Total a pagar',
  dateLabel: 'Vencimento',
  totalLabel: 'Total a Pagar',
  doneLabel: 'Pago',
  atrasadoLabel: 'vencida',
  descricaoPlaceholder: 'Ex: Fornecedor XYZ - NF 123',
  categorias: ['Fornecedores', 'Salários', 'Impostos', 'Aluguel', 'Energia', 'Água', 'Internet/Telefone', 'Empréstimos', 'Manutenção', 'Outros'],
  isolamentoText: 'Estas contas são apenas para simulação/controle nesta aba e não afetam os relatórios do sistema. Salvas apenas neste navegador.',
};

export default function ContasAPagar() {
  return <ContasSection config={CONFIG} />;
}
