
import React, { useState } from 'react';
import { subscribeToNewsletter } from '../services/newsletterService';

interface FooterProps {
  onNavigate?: (tool: string) => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) return;

    setStatus('loading');
    try {
        await subscribeToNewsletter(email, 'footer');
        setStatus('success');
        setEmail('');
    } catch (error) {
        setStatus('error');
    }
  };

  const handleNav = (tool: string) => {
  if (onNavigate) {
    onNavigate(tool);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

  return (
    <footer className="border-t border-slate-200 bg-surface-primary pt-20 pb-8 no-print">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          
          {/* Coluna 1: Marca & Newsletter */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold">FP</div>
               <h4 className="font-bold text-slate-900 text-lg">Finanças Pro Invest</h4>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Sua bússola para a liberdade financeira. Ferramentas precisas e educação sem enrolação.
            </p>
            
            <div className="pt-4">
               <h5 className="text-slate-900 font-bold text-sm mb-3">Fique Atualizado</h5>
              
              {status === 'success' ? (
                  <div className="bg-emerald-900/30 text-emerald-400 p-3 rounded-lg text-xs border border-emerald-500/20 animate-in fade-in">
                      ✅ Inscrito com sucesso! Obrigado.
                  </div>
              ) : (
                  <>
                    <p className="text-xs text-slate-500 mb-3">Receba tips de finanças direto na sua caixa de entrada.</p>
                    <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
                        <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={status === 'loading'}
                        placeholder="seu@email.com" 
                        className="bg-surface-secondary border border-slate-300 text-slate-900 text-xs rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-brand-primaryCta/30 outline-none transition-all disabled:opacity-50"
                        />
                        <button 
                            type="submit" 
                            disabled={status === 'loading'}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-w-[80px]"
                        >
                        {status === 'loading' ? '...' : 'Inscrever'}
                        </button>
                    </form>
                    {status === 'error' && (
                        <p className="text-red-400 text-[10px] mt-2">Erro ao salvar. Tente mais tarde.</p>
                    )}
                  </>
              )}
            </div>
          </div>

          {/* Coluna 2: Ferramentas */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Ferramentas</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => handleNav('compound')} className="hover:text-emerald-400 transition-colors text-left">Simulador de Juros Compostos</button></li>
              <li><button onClick={() => handleNav('manager')} className="hover:text-emerald-400 transition-colors text-left">Controla</button></li>
              <li><button onClick={() => handleNav('fire')} className="hover:text-emerald-400 transition-colors text-left">Calculadora FIRE</button></li>
              <li><button onClick={() => handleNav('rent')} className="hover:text-emerald-400 transition-colors text-left">Aluguel vs Financiamento</button></li>
              <li><button onClick={() => handleNav('debt')} className="hover:text-emerald-400 transition-colors text-left">Otimizador de Dívidas</button></li>
              <li><button onClick={() => handleNav('roi')} className="hover:text-emerald-400 transition-colors text-left">Calculadora de ROI</button></li>
            </ul>
          </div>

          {/* Coluna 3: Conteúdo */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Academia & Conteúdo</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => handleNav('education')} className="hover:text-emerald-400 transition-colors text-left">Blog Oficial</button></li>
              <li><button onClick={() => handleNav('education')} className="hover:text-emerald-400 transition-colors text-left">Guias para Iniciantes</button></li>
              <li><button onClick={() => handleNav('education')} className="hover:text-emerald-400 transition-colors text-left">Psicologia do Dinheiro</button></li>
              <li><button onClick={() => handleNav('game')} className="hover:text-emerald-400 transition-colors text-left">Simulador de Resiliência</button></li>
              <li><button onClick={() => handleNav('inflation')} className="hover:text-emerald-400 transition-colors text-left">Poder de Compra</button></li>
            </ul>
          </div>

          {/* Coluna 4: Institucional */}
          <div>
            <h4 className="font-bold text-slate-900 mb-6 text-sm uppercase tracking-wider">Institucional</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li><button onClick={() => handleNav('sobre')} className="hover:text-emerald-400 transition-colors text-left">Sobre Nós</button></li>
              <li><button onClick={() => handleNav('faq')} className="hover:text-emerald-400 transition-colors text-left">FAQ</button></li>
              <li><button onClick={() => handleNav('privacidade')} className="hover:text-emerald-400 transition-colors text-left">Política de Privacidade</button></li>
              <li><button onClick={() => handleNav('termos')} className="hover:text-emerald-400 transition-colors text-left">Termos de Uso</button></li>
              <li><button onClick={() => handleNav('sobre')} className="hover:text-emerald-400 transition-colors text-left">Contato</button></li>
            </ul>
          </div>

        </div>

        <div className="pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} Finanças Pro Invest. Todos os direitos reservados.
          </p>
          <div className="flex gap-4">
             <button className="text-slate-400 hover:text-slate-900 transition-colors"><span className="sr-only">Instagram</span>📷</button>
             <button className="text-slate-400 hover:text-slate-900 transition-colors"><span className="sr-only">Twitter</span>🐦</button>
             <button className="text-slate-400 hover:text-slate-900 transition-colors"><span className="sr-only">LinkedIn</span>💼</button>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;