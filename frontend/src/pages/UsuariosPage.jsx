import React, { useEffect, useState, useCallback } from 'react';
import { usuariosAPI } from '../services/api';
import { Trash2, ShieldCheck, Shield, AlertTriangle, RefreshCw } from 'lucide-react';

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // user obj ou null
  const [busy, setBusy] = useState(false);

  // Recupera o usuário logado
  const currentUser = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  })();

  const carregar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await usuariosAPI.getAll();
      setUsuarios(res.data || []);
    } catch (e) {
      const msg = e?.response?.data?.detail || 'Falha ao carregar usuários.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleToggleAdmin = async (u) => {
    if (busy) return;
    setBusy(true);
    try {
      await usuariosAPI.setAdmin(u.id, !u.is_admin);
      setUsuarios((prev) => prev.map((x) => (x.id === u.id ? { ...x, is_admin: !u.is_admin } : x)));
    } catch (e) {
      alert(e?.response?.data?.detail || 'Falha ao alterar permissão');
    } finally {
      setBusy(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete) return;
    setDeletingId(confirmDelete.id);
    try {
      await usuariosAPI.delete(confirmDelete.id);
      setUsuarios((prev) => prev.filter((x) => x.id !== confirmDelete.id));
      setConfirmDelete(null);
    } catch (e) {
      alert(e?.response?.data?.detail || 'Falha ao excluir usuário');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (s) => {
    if (!s) return '-';
    try {
      return new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch {
      return '-';
    }
  };

  return (
    <div className="space-y-4" data-testid="usuarios-page">
      {/* Header */}
      <div className="bg-gray-50 pb-4">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-gray-800">Usuários</h1>
            <p className="text-gray-600 text-sm">
              Gerencie os usuários do sistema. Apenas administradores têm acesso a esta área.
            </p>
          </div>
          <button
            onClick={carregar}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50"
            data-testid="usuarios-refresh-btn"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div
          className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3"
          data-testid="usuarios-error"
        >
          <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
          <div className="text-sm">{error}</div>
        </div>
      )}

      {/* Tabela desktop */}
      <div className="hidden md:block bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 border-b-2 border-gray-300">
            <tr>
              <th className="text-left p-3 font-semibold text-gray-700">Nome</th>
              <th className="text-left p-3 font-semibold text-gray-700">Email</th>
              <th className="text-left p-3 font-semibold text-gray-700">Permissão</th>
              <th className="text-left p-3 font-semibold text-gray-700">Cadastro</th>
              <th className="text-right p-3 font-semibold text-gray-700">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  Carregando…
                </td>
              </tr>
            )}
            {!loading && usuarios.length === 0 && !error && (
              <tr>
                <td colSpan="5" className="p-6 text-center text-gray-500">
                  Nenhum usuário cadastrado.
                </td>
              </tr>
            )}
            {!loading &&
              usuarios.map((u) => {
                const isSelf = currentUser?.id === u.id;
                return (
                  <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50" data-testid={`usuario-row-${u.id}`}>
                    <td className="p-3 font-medium text-gray-800">
                      {u.nome}
                      {isSelf && (
                        <span className="ml-2 text-[10px] uppercase font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          você
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-700">{u.email}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleAdmin(u)}
                        disabled={busy || isSelf}
                        title={isSelf ? 'Você não pode alterar sua própria permissão' : 'Alternar permissão'}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition ${
                          u.is_admin
                            ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        } ${isSelf || busy ? 'cursor-not-allowed opacity-70' : ''}`}
                        data-testid={`usuario-toggle-admin-${u.id}`}
                      >
                        {u.is_admin ? <ShieldCheck size={14} /> : <Shield size={14} />}
                        {u.is_admin ? 'Admin' : 'Comum'}
                      </button>
                    </td>
                    <td className="p-3 text-gray-600">{formatDate(u.created_at)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => setConfirmDelete(u)}
                        disabled={isSelf || deletingId === u.id}
                        title={isSelf ? 'Você não pode excluir a si mesmo' : 'Excluir usuário'}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                          isSelf
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-50 text-red-600 hover:bg-red-100'
                        }`}
                        data-testid={`usuario-delete-btn-${u.id}`}
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Lista mobile */}
      <div className="md:hidden space-y-2">
        {loading && <div className="bg-white rounded-lg shadow p-4 text-center text-gray-500">Carregando…</div>}
        {!loading &&
          usuarios.map((u) => {
            const isSelf = currentUser?.id === u.id;
            return (
              <div key={u.id} className="bg-white rounded-lg shadow p-3" data-testid={`usuario-card-${u.id}`}>
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-800 truncate">
                      {u.nome}
                      {isSelf && (
                        <span className="ml-2 text-[10px] uppercase font-semibold bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                          você
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    <p className="text-xs text-gray-400 mt-1">Desde {formatDate(u.created_at)}</p>
                  </div>
                  <button
                    onClick={() => handleToggleAdmin(u)}
                    disabled={busy || isSelf}
                    className={`flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-semibold ${
                      u.is_admin ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    } ${isSelf || busy ? 'opacity-70' : ''}`}
                  >
                    {u.is_admin ? <ShieldCheck size={12} /> : <Shield size={12} />}
                    {u.is_admin ? 'Admin' : 'Comum'}
                  </button>
                </div>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={() => setConfirmDelete(u)}
                    disabled={isSelf || deletingId === u.id}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${
                      isSelf ? 'bg-gray-100 text-gray-400' : 'bg-red-50 text-red-600 active:bg-red-100'
                    }`}
                  >
                    <Trash2 size={14} />
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
      </div>

      {/* Modal de confirmação */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-5" data-testid="confirm-delete-modal">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-gray-800">Excluir usuário?</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Tem certeza que deseja excluir <span className="font-semibold">{confirmDelete.nome}</span> (
                  {confirmDelete.email})?
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Esta ação é irreversível. Todos os dados financeiros desse usuário serão removidos.
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <button
                onClick={() => setConfirmDelete(null)}
                disabled={deletingId === confirmDelete.id}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deletingId === confirmDelete.id}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold disabled:opacity-60"
                data-testid="confirm-delete-btn"
              >
                {deletingId === confirmDelete.id ? 'Excluindo…' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
