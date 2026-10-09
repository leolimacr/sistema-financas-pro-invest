import React, { useState } from 'react';
import { X, Plus, Trash2, FolderOpen, Tag, Pencil, Check, RotateCcw } from 'lucide-react';
import type { Category } from '../../../types';
import { getFlowLabels } from '../../../theme/fpiVoiceGuide';

interface CategoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSave: (cat: Category) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  commandMode?: boolean;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ 
  isOpen, 
  onClose, 
  categories, 
  onSave, 
  onDelete,
  commandMode,
}) => {
  const voice = getFlowLabels(commandMode);
  const [name, setName] = useState('');
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Limpa o formulário ao fechar ou resetar
  const resetForm = () => {
    setName('');
    setType('expense');
    setEditingId(null);
  };

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    try {
      await onSave({ 
        id: editingId || undefined, 
        name: name.trim(), 
        type 
      });
      resetForm();
    } catch (error: any) {
      const errorCode = error?.code || 'unknown';
      const errorMessage = error?.message || String(error);
      console.error('[CategoryManager] Erro ao salvar categoria:', { code: errorCode, message: errorMessage, stack: error?.stack, full: error });
      alert(`Erro ao processar categoria. (${errorCode})`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => {
    setName(cat.name);
    setType(cat.type);
    setEditingId(cat.id || null);
    // Rola para o topo do formulário para facilitar no mobile
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-surface-deep/40 backdrop-blur-sm p-4">
      <div className="bg-surface-primary dark:bg-slate-900 border border-surface-elevated dark:border-slate-800 w-full max-w-md rounded-4xl overflow-hidden shadow-card flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-surface-elevated dark:border-slate-800 flex justify-between items-center bg-surface-secondary dark:bg-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-primary/10 rounded-xl">
                <FolderOpen className="text-brand-primary" size={24} />
            </div>
            <div>
                <h3 className="text-text-primary dark:text-white font-black text-lg leading-none">
                    {editingId ? 'Editar Categoria' : 'Categorias'}
                </h3>
                <p className="text-text-muted dark:text-slate-400 text-xxs mt-1 font-bold uppercase tracking-ultra-wide">
                    Personalize sua gestão
                </p>
            </div>
          </div>
          <button onClick={() => { resetForm(); onClose(); }} className="p-2 hover:bg-surface-elevated dark:hover:bg-slate-700 rounded-full text-text-muted dark:text-slate-400 transition-colors">
            <X size={20} />
          </button>
        </div>
        {/* FORMULÁRIO DINÂMICO (Adicionar ou Editar) */}
        <form onSubmit={handleSave} className={`p-6 border-b border-surface-elevated dark:border-slate-800 transition-colors ${editingId ? 'bg-brand-accent/5 dark:bg-amber-950/20' : 'bg-surface-primary dark:bg-slate-900'}`}>
          <div className="space-y-4">
            <div>
              <label className="text-xxs font-black text-text-muted dark:text-slate-400 uppercase tracking-ultra-wide mb-1.5 block">
                {editingId ? 'Novo Nome da Categoria' : 'Nome da Categoria'}
              </label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Assinaturas, Mercado..."
                className="w-full bg-surface-primary dark:bg-slate-800 border border-surface-elevated dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-text-primary dark:text-white focus:outline-none focus:border-brand-primary shadow-soft"
                autoFocus
              />
            </div>
            
            <div className="flex gap-2">
                <button 
                  type="button"
                  onClick={() => setType('expense')}
                  className={`flex-1 py-2.5 rounded-2xl text-xxs font-black uppercase border transition-all ${type === 'expense' ? 'bg-status-danger/10 dark:bg-red-950/40 border-status-danger/30 text-action-dangerDark dark:text-red-400' : 'bg-surface-primary dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-400'}`}
                >
                  {voice.expenseSingular}
                </button>
                <button 
                  type="button"
                  onClick={() => setType('income')}
                  className={`flex-1 py-2.5 rounded-2xl text-xxs font-black uppercase border transition-all ${type === 'income' ? 'bg-status-success/10 dark:bg-emerald-950/40 border-brand-primary/30 text-action-primaryDark dark:text-emerald-400' : 'bg-surface-primary dark:bg-slate-800 border-surface-elevated dark:border-slate-700 text-text-muted dark:text-slate-400'}`}
                >
                  {voice.incomeSingular}
                </button>
            </div>

            <div className="flex gap-2">
                {editingId && (
                    <button 
                        type="button" 
                        onClick={resetForm}
                        className="p-3 bg-surface-elevated dark:bg-slate-700 text-text-secondary dark:text-slate-200 rounded-2xl hover:bg-surface-secondary dark:hover:bg-slate-600"
                        title="Cancelar Edição"
                    >
                        <RotateCcw size={20} />
                    </button>
                )}
                <button 
                  type="submit" 
                  disabled={isSubmitting || !name}
                  className={`flex-1 py-3 rounded-2xl font-black text-sm transition-all shadow-soft flex items-center justify-center gap-2 ${
                      editingId ? 'bg-brand-accent text-text-onBrand hover:bg-brand-accent/90' : 'bg-brand-primary text-text-onBrand hover:bg-brand-primary/90'
                  }`}
                >
                  {editingId ? <Check size={18}/> : <Plus size={18} />}
                  {editingId ? 'SALVAR ALTERAÇÃO' : 'ADICIONAR CATEGORIA'}
                </button>
            </div>
          </div>
        </form>

        {/* LISTA COM OPÇÕES DE EDITAR E EXCLUIR */}
        {/* O 'corredor' da barra agora Ã© fisicamente encurtado por margens verticais de 56px (1.5cm) */}
        <div className="flex-1 overflow-y-auto my-14 px-4 space-y-2 custom-scrollbar bg-surface-primary dark:bg-slate-900">
          {categories.length === 0 ? (
            <div className="text-center py-10 text-text-muted dark:text-slate-400">
                <Tag size={40} className="mx-auto mb-2 opacity-20" />
                <p className="text-xxs font-bold uppercase tracking-ultra-wide">Nenhuma categoria cadastrada</p>
            </div>
          ) : (
            categories.sort((a,b) => a.name.localeCompare(b.name)).map((cat) => (
              <div key={cat.id} className={`flex items-center justify-between p-3 rounded-3xl border transition-all ${editingId === cat.id ? 'bg-brand-accent/10 dark:bg-amber-950/40 border-brand-accent/30' : 'bg-surface-secondary dark:bg-slate-800/60 border-surface-elevated dark:border-slate-700 hover:border-text-muted/30'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${cat.type === 'income' ? 'bg-brand-primary' : 'bg-status-danger'}`}></div>
                  <span className="text-sm font-bold text-text-primary dark:text-white">{cat.name}</span>
                </div>
                
                <div className="flex gap-1">
                    {/* Botão Editar */}
                    <button 
                        onClick={() => startEdit(cat)}
                        className="p-2 text-text-muted dark:text-slate-400 hover:text-brand-accent dark:hover:text-amber-400 hover:bg-brand-accent/10 dark:hover:bg-amber-950/30 rounded-xl transition-all"
                        title="Editar"
                    >
                        <Pencil size={16} />
                    </button>
                    
                    {/* Botão Excluir com Mensagem de Confirmação */}
                    <button 
                        onClick={() => {
                            if(window.confirm(`⚠️ ATENÇÃO: Deseja realmente excluir a categoria "${cat.name}"?`)) {
                                onDelete(cat.id!);
                            }
                        }}
                        className="p-2 text-text-muted dark:text-slate-400 hover:text-status-danger dark:hover:text-red-400 hover:bg-status-danger/10 dark:hover:bg-red-950/30 rounded-xl transition-all"
                        title="Excluir"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default CategoryManager;
