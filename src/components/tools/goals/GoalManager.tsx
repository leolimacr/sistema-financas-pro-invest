import React, { useState, useEffect, useMemo } from 'react';
import { useGoals } from '../../../hooks/useGoals';
import type { Goal } from '../../../services/goalService';
import { Timestamp } from 'firebase/firestore';
import { getLocalDateString } from '../../../utils/dateHelpers';
import { useToast } from '../../../contexts/ToastContext';
import { 
  TrendingUp, 
  Plus, 
  Trash2, 
  Pencil, 
  X, 
  Calendar,
  Bell,
  Mail,
  BellRing
} from 'lucide-react';

interface GoalManagerProps {
  userId: string | undefined;
  userMeta: any; // deve conter uid
  isPrivacyMode?: boolean;
}

const GoalManager: React.FC<GoalManagerProps> = ({ userId, isPrivacyMode = false }) => {
  const { goals, loading, addGoal, editGoal, removeGoal } = useGoals(userId);
  const { addToast } = useToast();

  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const highlightGoalId = searchParams.get('highlight');

  useEffect(() => {
    if (!highlightGoalId || goals.length === 0) return;
    const target = goals.find(g => g.id === highlightGoalId);
    if (target) {
      setTimeout(() => {
        const el = document.getElementById(`goal-${highlightGoalId}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }
  }, [highlightGoalId, goals]);

  // Pré-preenchimento vindo de ferramentas externas (como a Calculadora FIRE)
  useEffect(() => {
    const action = searchParams.get('action');
    const paramNome = searchParams.get('nome');
    const paramValor = searchParams.get('valor');

    if (action === 'new' || paramNome || paramValor) {
      const numValor = paramValor ? parseFloat(paramValor) : 0;
      setFormData(prev => ({
        ...prev,
        nome: paramNome || prev.nome || 'Independência Financeira (FIRE)',
        valor: numValor > 0 ? numValor : prev.valor,
      }));
      if (numValor > 0) {
        setDisplayValor(numValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
      }
      setTimeout(() => {
        const formEl = document.getElementById('goal-form');
        formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 200);
      addToast('Meta pré-preenchida a partir da Calculadora FIRE! Ajuste os campos se desejar e confirme para salvar.', 'info');
    }
  }, [searchParams, addToast]);

  // Estado do formulário
  const [formData, setFormData] = useState<Partial<Goal>>({
    nome: '',
    valor: 0,
    frequencia: 'mensal',
    diasPersonalizado: undefined,
    dataInicio: Timestamp.now(),
    ativa: true,
    lembretes: {
      cincoDias: true,
      vespera: true,
      dia: true,
      canal: 'email',
    },
  });
  const [displayValor, setDisplayValor] = useState<string>('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Formatar valor monetário
  const handleValorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setDisplayValor('');
      setFormData(prev => ({ ...prev, valor: 0 }));
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setDisplayValor(numericValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setFormData(prev => ({ ...prev, valor: numericValue }));
  };

  // Manipular mudanças nos campos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked,
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLembreteChange = (field: keyof Goal['lembretes'], checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      lembretes: {
        ...(prev.lembretes || { cincoDias: false, vespera: false, dia: false, canal: 'email' }),
        [field]: checked,
      },
    }));
  };

  const handleCanalChange = (canal: 'email' | 'push' | 'ambos') => {
    setFormData(prev => ({
      ...prev,
      lembretes: {
        ...(prev.lembretes || { cincoDias: false, vespera: false, dia: false, canal: 'email' }),
        canal,
      },
    }));
  };

  // Resetar formulário
  const resetForm = () => {
    setFormData({
      nome: '',
      valor: 0,
      frequencia: 'mensal',
      diasPersonalizado: undefined,
      dataInicio: Timestamp.now(),
      ativa: true,
      lembretes: {
        cincoDias: true,
        vespera: true,
        dia: true,
        canal: 'email',
      },
    });
    setDisplayValor('');
    setEditingId(null);
  };

  // Carregar dados para edição
  const handleEdit = (goal: Goal) => {
    setFormData({
      nome: goal.nome,
      valor: goal.valor,
      frequencia: goal.frequencia,
      diasPersonalizado: goal.diasPersonalizado,
      dataInicio: goal.dataInicio,
      ativa: goal.ativa,
      lembretes: goal.lembretes,
    });
    setDisplayValor(goal.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setEditingId(goal.id || null);
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) {
      alert('Usuário não autenticado');
      return;
    }
    if (!formData.valor || formData.valor <= 0) {
      alert('Valor do aporte deve ser maior que zero');
      return;
    }
    if (!formData.nome) {
      alert('Dê um nome para sua meta');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingId) {
        await editGoal(editingId, formData);
        addToast('Meta atualizada. Continue firme no plano!', 'success');
      } else {
        await addGoal(formData as any);
        addToast('Nova meta criada. Cada aporte te aproxima da liberdade.', 'success');
      }
      resetForm();
    } catch (error) {
      console.error('Erro ao salvar meta:', error);
      alert('Erro ao salvar meta. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Excluir meta
  const handleDelete = async (goalId: string) => {
    if (!userId) return;
    if (window.confirm('Tem certeza que deseja excluir esta meta?')) {
      try {
        await removeGoal(goalId);
        if (editingId === goalId) resetForm();
      } catch (error) {
        alert('Erro ao excluir meta');
      }
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 md:p-6 lg:p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Cabeçalho */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Metas de Aporte
          </h2>
        </div>
        <p className="text-slate-600 dark:text-slate-300 text-sm md:text-base max-w-2xl">
          Defina metas de aporte regulares para acelerar sua liberdade financeira. Acompanhe seu progresso e receba lembretes.
        </p>
      </header>

      {/* Formulário */}
      <div
        id="goal-form"
        className={`bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border ${
          editingId ? 'border-amber-300 dark:border-amber-600 shadow-amber-200/40' : 'border-slate-200 dark:border-slate-800'
        } rounded-2xl p-6 mb-8 shadow-sm transition-colors duration-300`}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${editingId ? 'bg-amber-100 dark:bg-amber-950/50' : 'bg-emerald-100 dark:bg-emerald-950/50'}`}>
              {editingId ? <Pencil size={16} className="text-amber-600 dark:text-amber-400" /> : <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />}
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {editingId ? 'Editando Meta' : 'Nova Meta de Aporte'}
            </h3>
          </div>
          {editingId && (
            <button
              onClick={resetForm}
              className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
            >
              <X size={14} /> Cancelar
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome da Meta */}
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Nome da Meta (ex: "Aposentadoria", "Viagem dos Sonhos")
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome || ''}
                onChange={handleChange}
                placeholder="Dê um nome para sua meta"                
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"                
                required
              />
            </div>

            {/* Valor do Aporte */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Valor do Aporte (R$)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-[14px] text-slate-500 dark:text-slate-400 text-sm font-bold">R$</span>  
                <input
                  type="text"
                  inputMode="numeric"
                  value={displayValor}
                  onChange={handleValorChange}
                  placeholder="0,00"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Frequência */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Frequência
              </label>
              <select
                name="frequencia"
                value={formData.frequencia}
                onChange={handleChange}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors [&>option]:bg-white [&>option]:dark:bg-slate-800"
              >
                <option value="semanal">Semanal</option>
                <option value="quinzenal">Quinzenal</option>
                <option value="mensal">Mensal</option>
                <option value="personalizado">Personalizado</option>
              </select>
            </div>

            {/* Dias personalizado (se aplicável) */}
            {formData.frequencia === 'personalizado' && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  A cada quantos dias?
                </label>
                <input
                  type="number"
                  name="diasPersonalizado"
                  value={formData.diasPersonalizado || ''}
                  onChange={handleChange}
                  min="1"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                  required
                />
              </div>
            )}

            {/* Data de Início */}
            <div>
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Data do Primeiro Aporte
              </label>
              <input
                type="date"
                name="dataInicio"
                value={formData.dataInicio ? getLocalDateString(new Date(formData.dataInicio.seconds * 1000)) : ''}
                onChange={(e) => {
                  const date = new Date(e.target.value);
                  setFormData(prev => ({ ...prev, dataInicio: Timestamp.fromDate(date) }));
                }}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                required
              />
            </div>

            {/* Ativa */}
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="ativa"
                  checked={formData.ativa}
                  onChange={(e) => setFormData(prev => ({ ...prev, ativa: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-primaryCta/30"
                />
                <span className="text-sm text-slate-800 dark:text-slate-200">Meta ativa</span>
              </label>
            </div>
          </div>

          {/* Lembretes */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-6">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <Bell size={16} className="text-emerald-500" /> Lembretes
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.lembretes?.cincoDias || false}
                    onChange={(e) => handleLembreteChange('cincoDias', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-primaryCta/30"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">Lembrar 5 dias antes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.lembretes?.vespera || false}
                    onChange={(e) => handleLembreteChange('vespera', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-primaryCta/30"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">Lembrar na véspera</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.lembretes?.dia || false}
                    onChange={(e) => handleLembreteChange('dia', e.target.checked)}
                    className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded focus:ring-brand-primaryCta/30"
                  />
                  <span className="text-sm text-slate-800 dark:text-slate-200">Lembrar no dia</span>
                </label>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Canal de notificação
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="canal"
                      value="email"
                      checked={formData.lembretes?.canal === 'email'}
                      onChange={() => handleCanalChange('email')}
                      className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-brand-primaryCta/30"
                    />
                    <Mail size={14} className="text-emerald-500" />
                    <span className="text-sm text-slate-800 dark:text-slate-200">E-mail</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="canal"
                      value="push"
                      checked={formData.lembretes?.canal === 'push'}
                      onChange={() => handleCanalChange('push')}
                      className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-brand-primaryCta/30"
                    />
                    <BellRing size={14} className="text-slate-500" />
                    <span className="text-sm text-slate-800 dark:text-slate-200">Push</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="canal"
                      value="ambos"
                      checked={formData.lembretes?.canal === 'ambos'}
                      onChange={() => handleCanalChange('ambos')}
                      className="w-4 h-4 text-emerald-600 bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 focus:ring-brand-primaryCta/30"
                    />
                    <span className="text-sm text-slate-800 dark:text-slate-200">Ambos</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Botão de submit */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-3 rounded-xl font-black text-slate-950 dark:text-white transition-all shadow-lg flex items-center gap-2 ${
                editingId
                  ? 'bg-amber-400 hover:bg-amber-300'
                  : 'bg-emerald-600 hover:bg-emerald-700'
              } disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-500 dark:disabled:text-slate-600 disabled:cursor-not-allowed`}
            >
              {isSubmitting ? (
                <>Salvando...</>
              ) : (
                <>
                  {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                  {editingId ? 'Salvar Alterações' : 'Criar Meta'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Lista de Metas */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Calendar size={20} className="text-emerald-500" /> Suas Metas
          </h3>
          <span className="text-xs font-bold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-600">
            {goals.length} {goals.length === 1 ? 'meta' : 'metas'}
          </span>
        </div>

        {loading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400 animate-pulse">Carregando suas metas...</div>
        ) : goals.length === 0 ? (
          <div className="py-14 px-6 bg-emerald-50 dark:bg-emerald-950/20 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-900/40 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
              <TrendingUp size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-slate-800 dark:text-white font-black text-base mb-1">Nenhuma meta criada ainda</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed mb-5">
              Crie sua primeira meta de aporte aqui em cima. O sistema monitora os prazos e te lembra quando o dia chegar — por e-mail ou push.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Plus size={14} /> Criar primeira meta
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((goal) => {
              const proximoAporte = calcularProximoAporte({
                dataInicio: goal.dataInicio,
                frequencia: goal.frequencia,
                diasPersonalizado: goal.diasPersonalizado,
              });
              const diasRestantes = diasAteProximoAporte(proximoAporte);

              return (
                <div
                  key={goal.id}
                  id={`goal-${goal.id}`}
                  className={`backdrop-blur-md border rounded-xl p-5 transition-all group relative overflow-hidden shadow-sm ${
                    goal.id === highlightGoalId
                      ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-400 dark:border-emerald-600 ring-2 ring-emerald-500 shadow-lg shadow-emerald-100/50 dark:shadow-none'
                      : goal.ativa
                        ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                        : 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 opacity-70'
                  }`}
                >
                  {/* Indicador de status */}
                  <div
                    className={`absolute top-0 left-0 w-full h-1 ${
                      goal.id === highlightGoalId
                        ? 'bg-emerald-500 animate-pulse'
                        : goal.ativa
                          ? 'bg-emerald-600'
                          : 'bg-slate-300 dark:bg-slate-600'
                    }`}
                  />

                  <div className="flex justify-between items-start mb-4 mt-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">
                          {goal.nome || 'Meta sem nome'}
                        </h4>
                        {goal.id === highlightGoalId && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[9px] font-black uppercase tracking-wider animate-pulse">
                            Citada na Notificação
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-1 rounded-full border border-slate-200 dark:border-slate-600">
                          {goal.frequencia === 'semanal' && 'Semanal'}
                          {goal.frequencia === 'quinzenal' && 'Quinzenal'}
                          {goal.frequencia === 'mensal' && 'Mensal'}
                          {goal.frequencia === 'personalizado' && `A cada ${goal.diasPersonalizado} dias`}
                        </span>
                        {!goal.ativa && (
                          <span className="text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                            Pausada
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Botões de Ação */}
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => handleEdit(goal)} 
                        className="text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-600 hover:border-amber-200 dark:hover:border-amber-700 transition-colors"
                        title="Editar Meta"
                      >
                        <Pencil size={16} />
                      </button>
                      <button 
                        onClick={() => goal.id && handleDelete(goal.id)} 
                        className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-600 hover:border-red-200 dark:hover:border-red-700 transition-colors"
                        title="Excluir Meta"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Valor do aporte</p>
                      <p className="text-2xl font-black text-slate-900 dark:text-white">
                        {isPrivacyMode
                          ? '••••••'
                          : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(goal.valor)}
                      </p>
                    </div>

                    {goal.ativa && proximoAporte && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-700">
                        <div>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">Próximo aporte</p>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">
                            {proximoAporte.toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <div className={`text-right ${
                          diasRestantes !== null && diasRestantes <= 0 ? 'text-emerald-600 dark:text-emerald-400' : 
                          diasRestantes !== null && diasRestantes <= 5 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
                        }`}>
                          <p className="text-[10px] font-bold uppercase">Faltam</p>
                          <p className="text-lg font-black">
                            {diasRestantes !== null ? (diasRestantes <= 0 ? 'Hoje' : `${diasRestantes} dias`) : '-'}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Importar funções utilitárias
import { calcularProximoAporte, diasAteProximoAporte } from '../../../utils/dateHelpers';

export default GoalManager;