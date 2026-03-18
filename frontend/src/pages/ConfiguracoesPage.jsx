import React from 'react';

export default function ConfiguracoesPage() {
  return (
    <div className="space-y-6" data-testid="configuracoes-page">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Configurações</h1>
        <p className="text-gray-600 mt-1">Personalize seu sistema</p>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <p className="text-yellow-800">
          <strong>⚠️ Em Desenvolvimento:</strong> Esta seção está sendo construída.
          Em breve você poderá configurar plano de contas padrão, categorias, perfis de usuário e muito mais.
        </p>
      </div>
    </div>
  );
}
