import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  X,
  RefreshCw,
  Search,
  ShieldCheck,
  Crown,
  Sparkles,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  Activity,
  Calendar,
  Filter,
} from 'lucide-react';
import {
  fetchAdminUsers,
  type AdminUserData,
  type ListAdminUsersSummary,
} from '../../services/adminUsersService';

interface AdminUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminUsersModal: React.FC<AdminUsersModalProps> = ({ isOpen, onClose }) => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [summary, setSummary] = useState<ListAdminUsersSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState<'all' | 'free' | 'pro' | 'premium'>('all');
  const [abandonmentFilter, setAbandonmentFilter] = useState<'all' | '0' | '1-2' | '3-4' | '5-6'>('all');
  const [activityFilter, setActivityFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAdminUsers();
      if (res?.success) {
        setUsers(res.users || []);
        setSummary(res.summary || null);
      } else {
        setError('Não foi possível carregar os dados dos usuários.');
      }
    } catch (err: any) {
      console.error('[AdminUsersModal] Erro ao carregar usuários:', err);
      setError(err?.message || 'Falha ao buscar usuários do sistema.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      // Busca
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchEmail = u.email?.toLowerCase().includes(q);
        const matchName = u.displayName?.toLowerCase().includes(q);
        const matchUid = u.uid.toLowerCase().includes(q);
        if (!matchEmail && !matchName && !matchUid) return false;
      }

      // Plano / Tier
      if (tierFilter !== 'all' && u.tier !== tierFilter) {
        return false;
      }

      // Atividade (14 dias)
      if (activityFilter === 'active' && !u.isActive) return false;
      if (activityFilter === 'inactive' && u.isActive) return false;

      // Abandono
      if (abandonmentFilter === '0' && u.abandonmentScore !== 0) return false;
      if (abandonmentFilter === '1-2' && (u.abandonmentScore < 1 || u.abandonmentScore > 2)) return false;
      if (abandonmentFilter === '3-4' && (u.abandonmentScore < 3 || u.abandonmentScore > 4)) return false;
      if (abandonmentFilter === '5-6' && u.abandonmentScore < 5) return false;

      return true;
    });
  }, [users, search, tierFilter, activityFilter, abandonmentFilter]);

  if (!isOpen) return null;

  const getAbandonmentBadge = (score: number, label: string) => {
    switch (score) {
      case 0:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Grau 0 • {label}
          </span>
        );
      case 1:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
            Grau 1 • {label}
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 text-sky-800 border border-sky-200">
            Grau 2 • {label}
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
            Grau 3 • {label}
          </span>
        );
      case 4:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300">
            Grau 4 • {label}
          </span>
        );
      case 5:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-900 border border-rose-300">
            Grau 5 • {label}
          </span>
        );
      case 6:
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-red-950 text-white border border-red-800">
            Grau 6 • {label}
          </span>
        );
    }
  };

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'premium':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-700 border border-emerald-400/60 shadow-xs">
            <Crown size={11} className="text-emerald-600" />
            Premium
          </span>
        );
      case 'pro':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-sky-500/15 text-sky-700 border border-sky-300 shadow-xs">
            <Sparkles size={11} className="text-sky-600" />
            Pro
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            Free
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-6xl max-h-[92vh] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Cabeçalho Soberano */}
        <div className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 px-6 py-5 border-b border-slate-800 flex items-center justify-between text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-sky-500/20 text-sky-300 border border-sky-400/30 shadow-inner">
              <Users size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  Painel Soberano de Usuários
                </h2>
                <span className="px-2 py-0.5 rounded-md bg-sky-500/30 text-sky-200 text-[10px] font-black uppercase tracking-widest border border-sky-400/40">
                  Exclusivo Leo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Controle integral de usuários, planos (Free/Pro/Premium) e probabilidade de abandono (0 a 6)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              title="Atualizar dados"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/20 hover:text-rose-300 text-slate-200 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Container Rolável Unificado: KPIs, Filtros e Lista de Usuários */}
        <div className="overflow-y-auto flex-1 flex flex-col">
          {/* Métricas e KPIs Rápidos */}
          {summary && (
            <div className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3 shrink-0">
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Usuários</span>
                <span className="text-xl font-black text-slate-900 dark:text-white">{summary.totalUsers}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Premium</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">{summary.byTier.premium}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">Pro</span>
                <span className="text-xl font-black text-sky-700 dark:text-sky-400">{summary.byTier.pro}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Free</span>
                <span className="text-xl font-black text-slate-700 dark:text-slate-200">{summary.byTier.free}</span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Ativos (≤ 14d)</span>
                <span className="text-xl font-black text-emerald-700 dark:text-emerald-400">
                  {summary.activeUsers} <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">({summary.totalUsers > 0 ? Math.round((summary.activeUsers / summary.totalUsers) * 100) : 0}%)</span>
                </span>
              </div>
              <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs">
                <span className="block text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Abandono (G5-G6)</span>
                <span className="text-xl font-black text-rose-700 dark:text-rose-400">{summary.abandonedCount}</span>
              </div>
            </div>
          )}

          {/* Barra de Filtros e Busca */}
          <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por e-mail, nome ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-medium text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              {/* Filtro de Plano */}
              <select
                value={tierFilter}
                onChange={(e: any) => setTierFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">Todos os Planos</option>
                <option value="free">Somente Free</option>
                <option value="pro">Somente Pro</option>
                <option value="premium">Somente Premium</option>
              </select>

              {/* Filtro de Abandono */}
              <select
                value={abandonmentFilter}
                onChange={(e: any) => setAbandonmentFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">Todos os Graus (0 a 6)</option>
                <option value="0">Grau 0 (Usuários Plenos)</option>
                <option value="1-2">Graus 1-2 (Uso Estável / Atenção)</option>
                <option value="3-4">Graus 3-4 (Risco Moderado / Alto)</option>
                <option value="5-6">Graus 5-6 (Abandono Iminente / Pleno)</option>
              </select>

              {/* Filtro de Atividade */}
              <select
                value={activityFilter}
                onChange={(e: any) => setActivityFilter(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                <option value="all">Todos os Status</option>
                <option value="active">Somente Ativos (≤14d)</option>
                <option value="inactive">Somente Inativos (&gt;14d)</option>
              </select>

              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 ml-auto">
                Exibindo {filteredUsers.length} de {users.length}
              </span>
            </div>
          </div>

          {/* Tabela de Usuários com Cabeçalho Estático (Sticky) */}
          <div className="p-4 sm:p-6 flex-1">
            {loading && users.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <RefreshCw size={28} className="animate-spin mx-auto mb-3 text-sky-600" />
                <p className="text-sm font-medium">Carregando lista soberana de usuários e métricas de abandono...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
                <AlertTriangle size={20} className="shrink-0 text-rose-600" />
                <div>
                  <p className="font-bold">Erro ao carregar</p>
                  <p className="text-xs">{error}</p>
                </div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <Users size={36} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                <p className="text-sm font-medium">Nenhum usuário corresponde aos filtros aplicados.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-20 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md border-b border-slate-300 dark:border-slate-700 shadow-xs">
                    <tr className="text-slate-700 dark:text-slate-300 font-black uppercase tracking-wider text-[10px]">
                      <th className="p-3 pl-4 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Usuário</th>
                      <th className="p-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Plano</th>
                      <th className="p-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Grau de Abandono (0-6)</th>
                      <th className="p-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Último Acesso</th>
                      <th className="p-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Lançamentos</th>
                      <th className="p-3 sticky top-0 bg-slate-100/95 dark:bg-slate-800/95 backdrop-blur-md z-20">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredUsers.map((user) => (
                      <tr key={user.uid} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors">
                        <td className="p-3 pl-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 dark:text-white text-[13px]">
                              {user.displayName || 'Sem nome cadastrado'}
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                              {user.email || 'Sem e-mail'}
                            </span>
                            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                              UID: {user.uid}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          {getTierBadge(user.tier)}
                        </td>
                        <td className="p-3">
                          {getAbandonmentBadge(user.abandonmentScore, user.abandonmentLabel)}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {user.daysSinceLastActive === 0
                                ? 'Hoje'
                                : user.daysSinceLastActive === 1
                                ? 'Ontem'
                                : user.daysSinceLastActive >= 999
                                ? 'Nunca acessou'
                                : `Há ${user.daysSinceLastActive} dias`}
                            </span>
                            {user.lastActiveAt && (
                              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                {new Date(user.lastActiveAt).toLocaleDateString('pt-BR')}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 font-mono font-bold text-slate-700 dark:text-slate-300">
                            {user.launchCount}
                          </span>
                        </td>
                        <td className="p-3">
                          {user.isActive ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                              <UserCheck size={13} /> Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400 dark:text-slate-500">
                              <UserX size={13} /> Inativo
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Informativo */}
        <div className="bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 px-6 py-3 text-[11px] text-slate-500 dark:text-slate-400 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0">
          <span>
            <strong>Métricas Soberanas:</strong> Grau 0 = Usuário pleno ativo no app • Grau 6 = Tempo sem uso $\ge 30$ dias (abandono pleno).
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold transition-all text-xs"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
