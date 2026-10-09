import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, query, getDocs, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../firebase';
import { queryClient } from '../../../core/query/queryClient';
import { queryKeys } from '../../../core/query/queryKeys';
import { TrendingUp, Plus, Trash2, Wallet, PieChart, Pencil, X, ShieldCheck, HelpCircle, ArrowRight, LayoutGrid, List, ChevronDown } from 'lucide-react';
import { useWealthData } from '../../../hooks/useWealthData';
import { useWealthHistory } from '../../../hooks/useWealthHistory';
import type { ActiveAsset } from '../../../types';

interface ActiveWealthManagerProps {
  userId: string | undefined;
  onNavigate?: (route: string) => void;
}

const ACTIVE_CATEGORIES = ['Renda Fixa', 'Ações', 'FIIs', 'Exterior', 'Cripto', 'Outros'];

export const ActiveWealthManager: React.FC<ActiveWealthManagerProps> = ({ userId, onNavigate }) => {
  const [assets, setAssets] = useState<ActiveAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('invest_view_mode') as 'grid' | 'list') || 'list';
  });
  const [showForm, setShowForm] = useState(true);
  const hasInitialized = useRef(false);
  const [showViewTooltip, setShowViewTooltip] = useState(false);

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('invest_view_mode', mode);
  };

  // Estados do Formulário
  const [currentAsset, setCurrentAsset] = useState<ActiveAsset>({ 
    name: '', 
    category: 'Renda Fixa', 
    currentValue: 0, 
    proposito: '',
    flexibility: 'liquidez' 
  });
  const [displayValue, setDisplayValue] = useState<string>(''); // Novo: Guarda a string formatada (ex: "1.500,00")
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Validação do Patrimônio
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { patrimonioLiquido, totalAssets, totalDebts, totalInvestments, totalProperty } = useWealthData();
  const { saveSnapshot, isSaving } = useWealthHistory(userId);

  const totalValue = useMemo(() => assets.reduce((sum, a) => sum + a.currentValue, 0), [assets]);

  const handleConfirmPatrimonio = async () => {
    try {
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: totalDebts,
        module: 'investments'
      });
      setShowConfirmModal(false);
      alert('Investimentos validados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao validar investimentos.');
    }
  };

  // Função para lidar com a digitação do valor financeiro (da direita para esquerda)
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // 1. Pega o valor digitado e remove tudo que não é número
    let value = e.target.value.replace(/\D/g, '');
    
    // Se o usuário apagar tudo, reseta para vazio/zero
    if (value === '') {
      setDisplayValue('');
      setCurrentAsset(prev => ({ ...prev, currentValue: 0 }));
      return;
    }

    // 2. Transforma a string em um número flutuante (dividindo por 100 para criar os centavos)
    const numericValue = parseInt(value, 10) / 100;

    // 3. Formata para o padrão brasileiro (1.500,00) apenas para exibição
    const formattedString = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    // 4. Salva a string formatada para a tela e o número real para o Firebase
    setDisplayValue(formattedString);
    setCurrentAsset(prev => ({ ...prev, currentValue: numericValue }));
  };

  // Leitura de Dados
  useEffect(() => {
    const loadAssets = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const assetsRef = collection(firestore, `users/${userId}/ativos`);
        // [FINOPS] Troca de onSnapshot por getDocs (leitura única sob demanda)
        const snapshot = await getDocs(query(assetsRef));
        const loadedAssets = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as ActiveAsset));
        
        setAssets(loadedAssets);
      } catch (error) {
        console.error("Erro ao buscar ativos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssets();

    // Registra que o usuário revisou o patrimônio agora
    if (userId) {
      setDoc(
        doc(firestore, 'users', userId),
        { lastWealthReviewAt: new Date().toISOString() },
        { merge: true }
      ).catch(() => {});
    }
  }, [userId]);

  useEffect(() => {
    if (!isLoading && !hasInitialized.current) {
      hasInitialized.current = true;
      if (assets.length > 0) setShowForm(false);
    }
  }, [isLoading, assets.length]);

  useEffect(() => {
    if (editingId) setShowForm(true);
  }, [editingId]);

  // Função Salvar (Criar ou Editar)
  const handleSaveAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || currentAsset.currentValue < 0 || currentAsset.name.trim() === '') return;

    setIsSubmitting(true);
    try {
      const assetData = {
        name: currentAsset.name,
        category: currentAsset.category,
        currentValue: currentAsset.currentValue,
        proposito: currentAsset.proposito || '',
        flexibility: currentAsset.flexibility || 'liquidez',
      };

      if (editingId) {
        // MODO EDIÇÃO
        const assetRef = doc(firestore, `users/${userId}/ativos`, editingId);
        await updateDoc(assetRef, assetData);

        const oldAsset = assets.find(a => a.id === editingId);
        const diff = currentAsset.currentValue - (oldAsset ? oldAsset.currentValue : 0);
        const currentTotal = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
        const newTotalPatrimonioAtivo = currentTotal + diff;

        const userDocRef = doc(firestore, 'users', userId);
        await setDoc(userDocRef, { resumoFinanceiro: { patrimonioAtivo: newTotalPatrimonioAtivo } }, { merge: true });
        
        setAssets(prev => prev.map(a => a.id === editingId ? { id: editingId, ...assetData } : a));
      } else {
        // MODO CRIAÇÃO
        const assetsRef = collection(firestore, `users/${userId}/ativos`);
        const docRef = await addDoc(assetsRef, assetData);

        const newTotalPatrimonioAtivo = assets.reduce((acc, curr) => acc + curr.currentValue, 0) + currentAsset.currentValue;

        const userDocRef = doc(firestore, 'users', userId);
        await setDoc(userDocRef, { resumoFinanceiro: { patrimonioAtivo: newTotalPatrimonioAtivo } }, { merge: true });
        
        setAssets(prev => [...prev, { id: docRef.id, ...assetData }]);
      }

      // Reseta formulário
      handleCancelEdit();

      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.assetsByUser(userId) });

      // NOVO: Auto-salvamento de snapshot para o gráfico de evolução
      // Isso garante que cada mudança gere um ponto no gráfico
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: totalDebts,
        module: 'investments'
      });
    } catch (error) {
      console.error("Erro ao salvar ativo:", error);
      alert("Houve um erro ao salvar seu investimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função Iniciar Edição
  const handleEditClick = (asset: ActiveAsset) => {
    setCurrentAsset({ 
      name: asset.name, 
      category: asset.category, 
      currentValue: asset.currentValue, 
      proposito: asset.proposito || '',
      flexibility: asset.flexibility || 'liquidez'
    });
    // Ao clicar em editar, já formata o valor para a máscara da tela
    setDisplayValue(asset.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (asset.id) setEditingId(asset.id);
    setTimeout(() => document.getElementById('wealth-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  // Função Cancelar Edição (ou Resetar Form)
  const handleCancelEdit = () => {
    setCurrentAsset({ 
      name: '', 
      category: 'Renda Fixa', 
      currentValue: 0, 
      proposito: '',
      flexibility: 'liquidez' 
    });
    setDisplayValue(''); // Limpa o campo visual também
    setEditingId(null);
  };

  // Função Excluir
  const handleDeleteAsset = async (assetId: string, assetValue: number) => {
    if (!userId || !assetId) return;

    const confirmDelete = window.confirm("Tem certeza que deseja excluir este investimento?");
    if (!confirmDelete) return;

    try {
      const assetDocRef = doc(firestore, `users/${userId}/ativos`, assetId);
      await deleteDoc(assetDocRef);

      const currentTotal = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
      const newTotalPatrimonioAtivo = currentTotal - assetValue;

      const userDocRef = doc(firestore, 'users', userId);
      await updateDoc(userDocRef, {
        "resumoFinanceiro.patrimonioAtivo": newTotalPatrimonioAtivo >= 0 ? newTotalPatrimonioAtivo : 0
      });

      setAssets(prev => prev.filter(a => a.id !== assetId));

      if (editingId === assetId) {
        handleCancelEdit();
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.assetsByUser(userId) });

      // NOVO: Auto-salvamento de snapshot para o gráfico de evolução
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalDebts: totalDebts,
        module: 'investments'
      });
    } catch (error) {
      console.error("Erro ao excluir ativo:", error);
      alert("Houve um erro ao tentar excluir o investimento.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6 pb-28 animate-in fade-in duration-500 font-sans">
      
      {/* Header com Imagem Lifestyle Integrada */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 p-8 md:p-12 shadow-floating mb-8 group">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.05),transparent_50%)]" />
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div className="space-y-4 flex-1">
            <div className="flex flex-col gap-4">
              {onNavigate && (
                <button
                  onClick={() => { onNavigate('home'); setTimeout(() => { document.getElementById('secao-ferramentas')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 100); }}
                  className="w-fit flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-emerald-700 dark:hover:text-emerald-400 transition-all font-black uppercase text-[10px] tracking-[0.2em]"
                >
                  ← Voltar
                </button>
              )}
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] shadow-sm w-fit">
                <ShieldCheck size={14} />
                Gestão Ativa de Patrimônio
              </div>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-black text-slate-950 dark:text-white tracking-tight leading-[1.1]">
              Seu legado em <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-sky-500">plena construção.</span>
            </h1>
            
            <p className="text-lg text-slate-500 dark:text-slate-400 max-w-xl leading-relaxed font-medium">
              Acompanhe a evolução real dos seus ativos. A base para sua liberdade financeira começa com dados organizados e clareza de propósito.
            </p>
          </div>

          <div className="hidden lg:block w-80 h-56 shrink-0 relative animate-in fade-in slide-in-from-right-4 duration-700">
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-card relative group-hover:scale-[1.02] transition-transform duration-500">
              <img 
                src="/assets/images/lifestyle/wealth-construction.webp" 
                alt="Construção de Patrimônio" 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="absolute -bottom-3 -left-3 bg-white dark:bg-slate-800 px-5 py-2.5 rounded-2xl shadow-floating border border-slate-100 dark:border-slate-700 flex items-center gap-2">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 tracking-tighter">Patrimônio Ativo</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário — colapsável */}
      {!showForm && assets.length > 0 ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-between bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 mb-8 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
              <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Cadastrar Investimento</span>
          </div>
          <ChevronDown size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
        </button>
      ) : (
        <div
          id="wealth-form"
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
                {editingId ? 'Editando Investimento' : 'Adicionar Novo Investimento'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {editingId && (
                <button
                  onClick={handleCancelEdit}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <X size={14} /> Cancelar
                </button>
              )}
              {!editingId && assets.length > 0 && (
                <button
                  onClick={() => setShowForm(false)}
                  className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1"
                >
                  <X size={14} /> Fechar
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveAsset} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
            <div className="md:col-span-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                Nome do Ativo (Ex: Tesouro Selic, HGLG11)
              </label>
              <input
                type="text"
                required
                placeholder="Digite o nome..."
                value={currentAsset.name}
                onChange={(e) => setCurrentAsset({ ...currentAsset, name: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Categoria
              </label>
              <select
                value={currentAsset.category}
                onChange={(e) => setCurrentAsset({ ...currentAsset, category: e.target.value })}
                className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors [&>option]:bg-white [&>option]:dark:bg-slate-800"
              >
                <option value="Renda Fixa">Renda Fixa</option>
                <option value="Ações">Ações (Brasil)</option>
                <option value="FIIs">Fundos Imobiliários</option>
                <option value="Exterior">Exterior (Stocks/REITs)</option>
                <option value="Cripto">Criptomoedas</option>
                <option value="Outros">Outros</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-0">
                Valor Total (R$)
              </label>
              <div className="relative w-full">
                <span className="absolute left-4 top-[14px] text-slate-500 dark:text-slate-400 text-sm font-bold">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="0,00"
                  value={displayValue}
                  onChange={handleCurrencyChange}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                />
              </div>
            </div>

            {/* CAMPO PROPÓSITO E FLEXIBILIDADE (NEXUS) */}
            <div className="md:col-span-3 grid grid-cols-1 gap-6">
              <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/40">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Propósito do Investimento
                    <div className="group relative">
                      <HelpCircle size={14} className="text-emerald-400 cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-800">
                        <p className="font-black text-emerald-400 mb-1 uppercase tracking-widest text-left">Por que preencher o Propósito?</p>
                        <p className="text-left leading-relaxed">Para o Finanças Pro Invest não ser apenas uma calculadora, o Nexus precisa entender sua vida. Se soubermos qual a meta deste investimento (ex: aposentadoria vs reserva), nossas análises de rentabilidade e risco serão muito mais precisas e humanas.</p>
                        <p className="mt-2 text-slate-500 italic text-left border-t border-slate-800 pt-2">Ex: "Reserva de emergência para segurança da família." ou "Meta: Casa própria em 5 anos."</p>
                      </div>
                    </div>
                  </label>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Inteligência Nexus</span>
                </div>
                <textarea
                  value={currentAsset.proposito || ''}
                  onChange={e => setCurrentAsset({ ...currentAsset, proposito: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-emerald-100/50 dark:border-emerald-800/40 focus:ring-2 focus:ring-brand-primaryCta/30 focus:border-brand-primaryCta transition-all text-sm font-medium bg-white dark:bg-slate-800 text-slate-900 dark:text-white min-h-[60px] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="Qual o objetivo deste investimento? O que você planeja conquistar com ele?"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-100 dark:border-slate-700">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 ml-1">
                  Disponibilidade deste Ativo
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'intocavel', label: 'Intocável', desc: 'Aposentadoria / Longo Prazo', icon: '🔴' },
                    { id: 'negociavel', label: 'Estratégico', desc: 'Posso mover se precisar', icon: '🟡' },
                    { id: 'liquidez', label: 'Liquidez', desc: 'Reserva / Uso Rápido', icon: '🟢' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setCurrentAsset({ ...currentAsset, flexibility: opt.id as any })}
                      className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                        currentAsset.flexibility === opt.id 
                          ? 'border-emerald-500 bg-white dark:bg-slate-800 shadow-sm shadow-emerald-100 dark:shadow-none' 
                          : 'border-transparent bg-slate-100/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-700/60 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-tight flex items-center gap-1.5 mb-1">
                        <span className="text-xs opacity-80">{opt.icon}</span>
                        <span className={currentAsset.flexibility === opt.id ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}>{opt.label}</span>
                      </span>
                      <span className="text-[9px] leading-tight font-medium opacity-70">{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="md:col-span-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-slate-950 dark:text-white font-black py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  editingId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:bg-slate-700 h-[46px]`}
                title={editingId ? 'Salvar Alterações' : 'Adicionar Ativo'}
              >
                {editingId ? <Pencil size={20} /> : <Plus size={20} />}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Ativos */}
      <div className="mt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Wallet size={20} className="text-emerald-500" /> Sua Carteira de Investimentos
          </h3>
          <div className="flex flex-wrap items-center gap-3">
            {/* VIEW SWITCHER */}
            <div className="relative flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => toggleViewMode('grid')}
                onMouseEnter={() => setShowViewTooltip(true)}
                onMouseLeave={() => setShowViewTooltip(false)}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                onClick={() => toggleViewMode('list')}
                onMouseEnter={() => setShowViewTooltip(true)}
                onMouseLeave={() => setShowViewTooltip(false)}
                className={`p-1.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
              >
                <List size={16} />
              </button>

              {/* Tooltip Educativo */}
              {showViewTooltip && (
                <div className="absolute bottom-full mb-2 right-0 z-50 w-48 p-3 bg-slate-800 text-white rounded-xl shadow-xl animate-in fade-in zoom-in duration-200 pointer-events-none">
                  <p className="text-[10px] leading-tight font-medium">
                    <span className="font-black text-emerald-400 uppercase tracking-widest block mb-1">Dica de Visualização</span>
                    {viewMode === 'grid' 
                      ? 'Mude para lista para uma visão mais compacta e organizada em linhas.' 
                      : 'Mude para blocos para uma visão mais visual e destacada de cada ativo.'}
                  </p>
                </div>
              )}
            </div>

            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {assets.length} {assets.length === 1 ? 'ativo' : 'ativos'}
            </span>
            <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-600 dark:text-slate-400 animate-pulse">Carregando sua carteira...</div>
        ) : assets.length === 0 ? (
          <div className="py-14 px-6 bg-emerald-50 dark:bg-emerald-950/30 border border-dashed border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
            <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950/50 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
              <PieChart size={24} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-slate-800 dark:text-slate-200 font-black text-base mb-1">Carteira ainda vazia</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto leading-relaxed mb-5">
              Adicione seus investimentos aqui em cima — Tesouro Direto, FIIs, ações, cripto. Esses dados alimentam sua visão de carteira e dão contexto melhor para as próximas camadas da Central.
            </p>
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl transition-all active:scale-95"
            >
              <Plus size={14} /> Adicionar primeiro ativo
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white dark:bg-slate-900 backdrop-blur-md border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-slate-300 dark:hover:border-slate-700 transition-colors group relative overflow-hidden shadow-sm flex flex-col h-full">
                <div className={`absolute top-0 left-0 w-full h-1 ${
                  asset.category === 'Renda Fixa' ? 'bg-sky-500' : 
                  asset.category === 'Ações' ? 'bg-emerald-500' : 
                  asset.category === 'FIIs' ? 'bg-indigo-500' : 
                  asset.category === 'Exterior' ? 'bg-purple-500' : 
                  asset.category === 'Cripto' ? 'bg-amber-500' : 'bg-slate-500'
                }`} />

                <div className="flex justify-between items-start mb-4 mt-2">
                  <div>
                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md mb-2 inline-block border border-slate-200 dark:border-slate-700">
                      {asset.category}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{asset.name}</h4>
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditClick(asset)}
                      className="text-slate-500 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-950/40 border border-slate-200 dark:border-slate-700 hover:border-amber-200 transition-colors"
                      title="Editar Ativo"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => asset.id && handleDeleteAsset(asset.id, asset.currentValue)}
                      className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-red-50 dark:hover:bg-red-950/40 border border-slate-200 dark:border-slate-700 hover:border-red-200 transition-colors"
                      title="Excluir Ativo"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="flex-grow space-y-3">
                  {asset.proposito && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/40">
                      <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Propósito</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">"{asset.proposito}"</p>
                    </div>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Valor Atual</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.currentValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-100 dark:border-slate-800">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Ativo / Categoria</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Propósito</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor Atual</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-8 rounded-full ${
                            asset.category === 'Renda Fixa' ? 'bg-sky-500' : 
                            asset.category === 'Ações' ? 'bg-emerald-500' : 
                            asset.category === 'FIIs' ? 'bg-indigo-500' : 
                            asset.category === 'Exterior' ? 'bg-purple-500' : 
                            asset.category === 'Cripto' ? 'bg-amber-500' : 'bg-slate-500'
                          }`} />
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-slate-900 dark:text-white">{asset.name}</span>
                            <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">{asset.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{asset.proposito || '—'}</span>
                          {asset.flexibility && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              {asset.flexibility === 'intocavel' ? '🔴 Intocável' : asset.flexibility === 'negociavel' ? '🟡 Estratégico' : '🟢 Liquidez'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.currentValue)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button 
                            onClick={() => handleEditClick(asset)} 
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                            title="Editar"
                          >
                            <Pencil size={14} />
                          </button>
                          <button 
                            onClick={() => asset.id && handleDeleteAsset(asset.id, asset.currentValue)} 
                            className="p-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* RITUAL DE VALIDAÇÃO (MOVIDO PARA O FINAL) */}
      <div className="mt-12 mb-8 group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-soft">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500 text-white rounded-[2rem] shadow-emerald-500/20 shadow-lg">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">Ritual de Governança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Confirme se seus investimentos estão atualizados hoje.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-brand-glow active:scale-95"
          >
            Validar Carteira Atual
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-[3rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-[2rem] mb-2">
                <HelpCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Validar Investimentos?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Você confirma que todos os seus ativos financeiros (Renda Fixa, Ações, Cripto, etc.) estão com os valores atualizados na data de hoje? 
                <br/><br/>
                <span className="text-brand-primary font-bold italic">Isso garantirá a precisão absoluta do seu gráfico de evolução patrimonial.</span>
              </p>
              
              <div className="flex flex-col w-full gap-3 pt-4">
                <button
                   onClick={handleConfirmPatrimonio}
                  disabled={isSaving}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Salvando...' : 'Sim, Confirmar Agora'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveWealthManager;
