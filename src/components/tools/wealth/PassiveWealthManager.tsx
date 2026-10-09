import React, { useState, useEffect, useRef } from 'react';
import { collection, query, getDocs, addDoc, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { firestore } from '../../../firebase';
import { queryClient } from '../../../core/query/queryClient';
import { queryKeys } from '../../../core/query/queryKeys';
import { Building2, Plus, Trash2, Landmark, Pencil, X, Car, LayoutGrid, List, ShieldCheck, HelpCircle, ArrowRight, Banknote, Sparkles, ChevronDown } from 'lucide-react';
import { useWealthData } from '../../../hooks/useWealthData';
import { useWealthHistory } from '../../../hooks/useWealthHistory';
import type { PassiveAsset } from '../../../types';
import { useNavigate } from 'react-router-dom';

interface PassiveWealthManagerProps {
  userId: string | undefined;
  onNavigate?: (route: string, state?: any) => void;
}

const PASSIVE_CATEGORIES = ['Imóveis', 'Veículos', 'Terrenos', 'Joias/Arte', 'Outros'];

export const PassiveWealthManager: React.FC<PassiveWealthManagerProps> = ({ userId, onNavigate }) => {
  const navigate = useNavigate();
  const [assets, setAssets] = useState<PassiveAsset[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Função para processar venda estratégica (CFP)
  const handleSellAsset = (asset: PassiveAsset) => {
    const value = window.prompt(`Por quanto você vendeu "${asset.description}"?`, asset.currentValue.toString());
    if (value === null) return;

    const finalValue = parseFloat(value.replace(',', '.'));
    if (isNaN(finalValue)) return alert("Valor inválido");

    // Navega para o Nexus Chat com o contexto da venda
    if (onNavigate) {
      onNavigate('chat', { 
        initialPrompt: `Acabei de vender meu bem "${asset.description}" por R$ ${finalValue.toLocaleString('pt-BR')}. Como meu CFP, me ajude a direcionar esse recurso para minhas dívidas, meu Colchão Emergencial e meus investimentos. Analise meu cenário atual e sugira a melhor divisão.`,
        pendingSale: {
          assetId: asset.id,
          description: asset.description,
          value: finalValue
        }
      });
    }
  };
  
  // Validação do Patrimônio
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const { patrimonioLiquido, totalAssets, totalDebts, totalInvestments, totalProperty } = useWealthData();
  const { saveSnapshot, isSaving } = useWealthHistory(userId);

  const handleConfirmPatrimonio = async () => {
    try {
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: totalDebts,
        module: 'property'
      });
      setShowConfirmModal(false);
      alert('Valores patrimoniais confirmados com sucesso!');
    } catch (err) {
      console.error(err);
      alert('Erro ao confirmar valores.');
    }
  };

  const [viewMode, setViewMode] = useState<'grid' | 'list'>(() => {
    return (localStorage.getItem('passive_wealth_view_mode') as 'grid' | 'list') || 'list';
  });

  // Tooltip state
  const [showViewTooltip, setShowViewTooltip] = useState(false);
  const [showForm, setShowForm] = useState(true);
  const hasInitialized = useRef(false);

  // Estados do Formulário
  const [currentAsset, setCurrentAsset] = useState<PassiveAsset>({ 
    description: '', 
    category: 'Imóveis', 
    currentValue: 0, 
    observations: '',
    proposito: '',
    flexibility: 'intocavel'
  });
  const [displayValue, setDisplayValue] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Função para lidar com a digitação do valor financeiro (da direita para esquerda)
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    
    if (value === '') {
      setDisplayValue('');
      setCurrentAsset(prev => ({ ...prev, currentValue: 0 }));
      return;
    }

    const numericValue = parseInt(value, 10) / 100;

    const formattedString = numericValue.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    setDisplayValue(formattedString);
    setCurrentAsset(prev => ({ ...prev, currentValue: numericValue }));
  };

  // Leitura de Dados (Subcoleção: passivos)
  useEffect(() => {
    const loadPassives = async () => {
      if (!userId) {
        setIsLoading(false);
        return;
      }

      try {
        const assetsRef = collection(firestore, `users/${userId}/passivos`);
        // [FINOPS] Leitura única para evitar cobrança por tempo de tela
        const snapshot = await getDocs(query(assetsRef));
        const loadedAssets = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data() 
        } as PassiveAsset));
        
        setAssets(loadedAssets);
      } catch (error) {
        console.error("Erro ao buscar passivos:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPassives();
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
    if (!userId || currentAsset.currentValue < 0 || currentAsset.description.trim() === '') return;

    setIsSubmitting(true);
    try {
      const assetData = {
        description: currentAsset.description,
        category: currentAsset.category,
        currentValue: currentAsset.currentValue,
        observations: currentAsset.observations || '',
        proposito: currentAsset.proposito || '',
        flexibility: currentAsset.flexibility || 'intocavel',
      };

      if (editingId) {
        // MODO EDIÇÃO
        const assetRef = doc(firestore, `users/${userId}/passivos`, editingId);
        await updateDoc(assetRef, assetData);

        const oldAsset = assets.find(a => a.id === editingId);
        const diff = currentAsset.currentValue - (oldAsset ? oldAsset.currentValue : 0);
        const currentTotal = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
        const newTotalPatrimonioPassivo = currentTotal + diff;

        const userDocRef = doc(firestore, 'users', userId);
        await setDoc(userDocRef, { resumoFinanceiro: { patrimonioPassivo: newTotalPatrimonioPassivo } }, { merge: true });
        
        setAssets(prev => prev.map(a => a.id === editingId ? { id: editingId, ...assetData } : a));
      } else {
        // MODO CRIAÇÃO
        const assetsRef = collection(firestore, `users/${userId}/passivos`);
        const docRef = await addDoc(assetsRef, assetData);

        const newTotalPatrimonioPassivo = assets.reduce((acc, curr) => acc + curr.currentValue, 0) + currentAsset.currentValue;

        const userDocRef = doc(firestore, 'users', userId);
        await setDoc(userDocRef, { resumoFinanceiro: { patrimonioPassivo: newTotalPatrimonioPassivo } }, { merge: true });
        
        setAssets(prev => [...prev, { id: docRef.id, ...assetData }]);
      }

      handleCancelEdit();

      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.passivesByUser(userId) });

      // NOVO: Auto-salvamento de snapshot para o gráfico de evolução
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: totalDebts,
        module: 'property'
      });
    } catch (error) {
      console.error("Erro ao salvar passivo:", error);
      alert("Houve um erro ao salvar seu bem.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função Iniciar Edição
  const handleEditClick = (asset: PassiveAsset) => {
    setCurrentAsset({ 
      description: asset.description, 
      category: asset.category, 
      currentValue: asset.currentValue,
      observations: asset.observations || '',
      proposito: asset.proposito || '',
      flexibility: asset.flexibility || 'intocavel'
    });
    setDisplayValue(asset.currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    if (asset.id) setEditingId(asset.id);
    setTimeout(() => document.getElementById('wealth-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
  };

  // Função Cancelar Edição (ou Resetar Form)
  const handleCancelEdit = () => {
    setCurrentAsset({ 
      description: '', 
      category: 'Imóveis', 
      currentValue: 0, 
      observations: '', 
      proposito: '',
      flexibility: 'intocavel'
    });
    setDisplayValue('');
    setEditingId(null);
  };

  const toggleViewMode = (mode: 'grid' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('passive_wealth_view_mode', mode);
  };

  // Função Excluir
  const handleDeleteAsset = async (assetId: string, assetValue: number) => {
    if (!userId || !assetId) return;

    const confirmDelete = window.confirm("Tem certeza que deseja excluir este bem?");
    if (!confirmDelete) return;

    try {
      const assetDocRef = doc(firestore, `users/${userId}/passivos`, assetId);
      await deleteDoc(assetDocRef);

      const currentTotal = assets.reduce((acc, curr) => acc + curr.currentValue, 0);
      const newTotalPatrimonioPassivo = currentTotal - assetValue;

      const userDocRef = doc(firestore, 'users', userId);
      await updateDoc(userDocRef, {
        "resumoFinanceiro.patrimonioPassivo": newTotalPatrimonioPassivo >= 0 ? newTotalPatrimonioPassivo : 0
      });

      setAssets(prev => prev.filter(a => a.id !== assetId));

      if (editingId === assetId) {
        handleCancelEdit();
      }

      queryClient.invalidateQueries({ queryKey: queryKeys.wealth.passivesByUser(userId) });

      // NOVO: Auto-salvamento de snapshot para o gráfico de evolução
      await saveSnapshot({
        totalNetWorth: patrimonioLiquido,
        totalAssets: totalAssets,
        totalInvestments: totalInvestments,
        totalProperty: totalProperty,
        totalDebts: totalDebts,
        module: 'property'
      });
    } catch (error) {
      console.error("Erro ao excluir passivo:", error);
      alert("Houve um erro ao tentar excluir o bem.");
    }
  };

  const totalBens = assets.reduce((acc, asset) => acc + (asset.currentValue || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-8 animate-in fade-in duration-500 pb-32 bg-slate-50/95 dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm">
      {/* Cabeçalho */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-500/10 dark:bg-emerald-950/40 rounded-xl border border-emerald-500/20 dark:border-emerald-800">
            <Building2 size={24} className="text-emerald-400" />
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Bens Patrimoniais
          </h2>
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base max-w-2xl">
          Registre aqui os bens reais que compõem seu patrimônio consolidado, como imóveis, veículos, terrenos e outros itens de maior valor.
        </p>
      </header>

      {/* Formulário — colapsável */}
      {!showForm && assets.length > 0 ? (
        <button
          onClick={() => setShowForm(true)}
          className="w-full flex items-center justify-between bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-6 py-4 mb-8 shadow-sm hover:border-emerald-400 hover:shadow-md transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
              <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">Cadastrar Bem</span>
          </div>
          <ChevronDown size={18} className="text-slate-400 group-hover:text-emerald-500 transition-colors" />
        </button>
      ) : (
        <div id="wealth-form" className={`bg-white dark:bg-slate-800 border ${editingId ? 'border-emerald-500/40 shadow-emerald-500/10' : 'border-slate-200 dark:border-slate-700'} rounded-2xl p-6 mb-8 shadow-sm transition-colors duration-300`}>        
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center bg-emerald-100 dark:bg-emerald-950/50`}>
                {editingId ? <Pencil size={16} className="text-emerald-600 dark:text-emerald-400" /> : <Plus size={16} className="text-emerald-600 dark:text-emerald-400" />}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                {editingId ? 'Editando Bem' : 'Adicionar Novo Bem'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {editingId && (
                <button type="button" onClick={handleCancelEdit} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 flex items-center gap-1">
                  <X size={14} /> Cancelar
                </button>
              )}
              {!editingId && assets.length > 0 && (
                <button onClick={() => setShowForm(false)} className="text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 flex items-center gap-1">
                  <X size={14} /> Fechar
                </button>
              )}
            </div>
          </div>

          <form onSubmit={handleSaveAsset} className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end">
            
            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Descrição do Bem (Ex: Casa na Praia, Honda Civic) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Digite a descrição..."
                value={currentAsset.description}
                onChange={(e) => setCurrentAsset({ ...currentAsset, description: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Categoria <span className="text-rose-500">*</span>
              </label>
              <select
                value={currentAsset.category}
                onChange={(e) => setCurrentAsset({ ...currentAsset, category: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors [&>option]:bg-white [&>option]:dark:bg-slate-900"
              >
                {PASSIVE_CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>

            <div className="md:col-span-4">
              <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                Valor de Mercado (R$) <span className="text-rose-500">*</span>
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
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                />
              </div>
            </div>

            {/* CAMPO PROPÓSITO E FLEXIBILIDADE (NEXUS) */}
            <div className="md:col-span-8 grid grid-cols-1 gap-6">
              <div className="p-4 bg-emerald-50/30 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/40">
                <div className="flex items-center justify-between mb-2">
                  <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-300">
                    Propósito do Bem
                    <div className="group relative">
                      <HelpCircle size={14} className="text-emerald-400 cursor-help" />
                      <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-slate-900 text-white text-[10px] font-medium leading-relaxed rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-800">
                        <p className="font-black text-emerald-400 mb-1 uppercase tracking-widest text-left">Por que preencher o Propósito?</p>
                        <p className="text-left leading-relaxed">Para o Finanças Pro Invest não ser apenas uma calculadora, o Nexus precisa entender sua vida. Se soubermos que sua casa é seu 'Lar Inegociável', nunca sugeriremos nada que a coloque em risco. Se soubermos que seu carro é 'Apenas para Trabalho', saberemos como otimizar seus custos.</p>
                        <p className="mt-2 text-slate-500 italic text-left border-t border-slate-800 pt-2">Ex: "Este imóvel é para minha aposentadoria, quero viver do aluguel dele futuramente."</p>
                      </div>
                    </div>
                  </label>
                  <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">Inteligência Nexus</span>
                </div>
                <textarea
                  value={currentAsset.proposito || ''}
                  onChange={e => setCurrentAsset({ ...currentAsset, proposito: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border border-emerald-100 dark:border-emerald-800/40 focus:ring-2 focus:ring-brand-primaryCta/30 focus:border-brand-primaryCta transition-all text-sm font-medium bg-white dark:bg-slate-900 text-slate-900 dark:text-white min-h-[80px] resize-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  placeholder="O que este bem representa para você? Qual a finalidade dele na sua vida?"
                />
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800">
                <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 mb-3 ml-1">
                  Flexibilidade deste Bem (Negociação)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'intocavel', label: 'Intocável', desc: 'Meu Lar / Essencial', icon: '🔴' },
                    { id: 'negociavel', label: 'Negociável', desc: 'Topo vender se estratégico', icon: '🟡' },
                    { id: 'liquidez', label: 'Patrimônio', desc: 'Foco em liquidez futura', icon: '🟢' }
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

            <div className="md:col-span-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Observações <span className="text-slate-500 dark:text-slate-400 font-normal lowercase">(opcional)</span>
                </label>
                <input
                  type="text"
                  placeholder="Ano, placa, endereço..."
                  value={currentAsset.observations}
                  onChange={(e) => setCurrentAsset({ ...currentAsset, observations: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-brand-primaryCta focus:ring-2 focus:ring-brand-primaryCta/30 transition-colors"
                />
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full text-slate-950 dark:text-white font-black py-3.5 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                  editingId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700'
                } disabled:bg-slate-700`}
              >
                {editingId ? <><Pencil size={18} /> Salvar Alterações</> : <><Plus size={18} /> Adicionar Bem</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de Passivos */}
      <div className="mt-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark size={20} className="text-slate-500 dark:text-slate-400" /> Seus Bens Registrados
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
                      : 'Mude para blocos para uma visão mais visual e destacada de cada bem.'}
                  </p>
                </div>
              )}
            </div>

            <span className="text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-700">
              {assets.length} {assets.length === 1 ? 'bem' : 'bens'}
            </span>
            <span className="text-xs font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
              Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalBens)}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400 animate-pulse">Carregando seus bens...</div>
        ) : assets.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <div className="w-16 h-16 bg-emerald-500/10 dark:bg-emerald-950/40 border border-emerald-500/20 dark:border-emerald-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Car size={24} className="text-emerald-400" />
            </div>
            <p className="text-slate-600 dark:text-slate-300 font-medium mb-2">Nenhum bem registrado ainda</p>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Adicione seu primeiro bem patrimonial no formulário acima e comece a consolidar sua visão de patrimônio.</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assets.map((asset) => (
              <div key={asset.id} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 hover:border-emerald-500/50 transition-colors group relative overflow-hidden flex flex-col h-full shadow-sm">
            
                {/* Linha de cor por categoria */}
                <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/30" />                
                <div className="flex justify-between items-start mb-4 mt-2">
                  <div>
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 px-3 py-1 rounded-full mb-2 inline-block">                    
                      {asset.category}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1" title={asset.description}>{asset.description}</h4>
                  </div>
                  
                  {/* Botões de Ação */}
                  <div className="flex gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 transition-opacity">
                    <button 
                      onClick={() => handleSellAsset(asset)} 
                      className="text-emerald-600 dark:text-emerald-400 hover:text-white dark:hover:text-white p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 dark:hover:bg-emerald-600 transition-all flex items-center gap-1.5 shadow-sm"
                      title="Vender Bem"
                    >
                      <Banknote size={16} />
                      <span className="text-[10px] font-black uppercase tracking-tighter">Vender</span>
                    </button>
                    <button 
                      onClick={() => handleEditClick(asset)} 
                      className="text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors"
                      title="Editar Bem"
                    >
                      <Pencil size={16} />
                    </button>
                    <button 
                      onClick={() => asset.id && handleDeleteAsset(asset.id, asset.currentValue)} 
                      className="text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:bg-red-50 hover:border-red-200 transition-colors"
                      title="Excluir Bem"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                {/* Propósito e Observações */}
                <div className="flex-grow space-y-3">
                  {asset.proposito && (
                    <div className="bg-emerald-50/30 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-100/50 dark:border-emerald-800/40">
                      <p className="text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Propósito</p>
                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium italic">"{asset.proposito}"</p>
                    </div>
                  )}
                  {asset.observations && (
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 px-1">
                      {asset.observations}
                    </p>
                  )}
                </div>

                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase mb-1">Valor de Mercado</p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(asset.currentValue)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-3xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Bem / Categoria</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Propósito</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {assets.map((asset) => (
                    <tr key={asset.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-900 dark:text-white">{asset.description}</span>
                          <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-tighter">{asset.category}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium line-clamp-1">{asset.proposito || '—'}</span>
                          {asset.flexibility && (
                            <span className="text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              {asset.flexibility === 'intocavel' ? '🔴 Intocável' : asset.flexibility === 'negociavel' ? '🟡 Negociável' : '🟢 Patrimônio'}
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
      <div className="mt-12 mb-8 group relative overflow-hidden rounded-[2.5rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 shadow-soft">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500 text-white rounded-[2rem] shadow-emerald-500/20 shadow-lg">
              <ShieldCheck size={32} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight">Ritual de Governança</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Confirme se seus bens estão com valores atualizados.</p>
            </div>
          </div>
          <button
            onClick={() => setShowConfirmModal(true)}
            className="flex items-center gap-3 px-8 py-4 bg-brand-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all shadow-brand-glow active:scale-95"
          >
            Validar Valor de Mercado
            <ArrowRight size={18} />
          </button>
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 max-w-md w-full shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-[2rem] mb-2">
                <HelpCircle size={40} />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Validar Valores?</h3>
              <p className="text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                Você confirma que os valores cadastrados para seus bens (Imóveis, Veículos, Terrenos, etc.) refletem o valor de mercado atual?
                <br/><br/>
                <span className="text-brand-primary font-bold italic">Isso garantirá a precisão da sua Evolução Patrimonial total.</span>
              </p>
              
              <div className="flex flex-col w-full gap-3 pt-4">
                <button
                   onClick={handleConfirmPatrimonio}
                  disabled={isSaving}
                  className="w-full py-4 bg-brand-primary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-brand-primary/90 transition-all flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Salvando...' : 'Sim, Confirmar Valores'}
                </button>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-2xl font-black uppercase tracking-widest hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
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

export default PassiveWealthManager;
