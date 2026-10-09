import React, { useState } from 'react';
import { createUserWithEmailAndPassword, sendEmailVerification, signOut } from 'firebase/auth';
import { auth, firestore } from '../../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react';

const AuthRegister: React.FC<{ onSuccess: () => void, onSwitchToLogin: () => void }> = ({ onSuccess, onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError('As senhas não coincidem.');
    setError('');
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(firestore, 'users', user.uid), {
        email: email.trim().toLowerCase(),
        plan: 'free',
        launchCount: 0,
        onboardingCompleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await sendEmailVerification(user);
      await signOut(auth);
      setEmailSent(true);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') setError('E-mail já cadastrado.');
      else if (err.code === 'auth/weak-password') setError('Senha fraca (mínimo 6 caracteres).');
      else setError('Erro ao criar conta: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- TELA DE SUCESSO (ENVIADO) ---
  if (emailSent) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 bg-surface-secondary dark:bg-slate-950">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-sky-500"></div>
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/40 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Verifique seu E-mail</h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-4">
                Confirme seu e-mail e comece a registrar sua rotina no Controla.
              </p>
              <div className="bg-sky-100/50 dark:bg-sky-950/30 p-4 rounded-xl border border-sky-200 dark:border-sky-900/50 mb-6">
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Enviamos um link para <span className="text-indigo-600 dark:text-indigo-400 font-bold">{email}</span>. Clique para ativar sua conta.
                </p>
              </div>
              <button 
                onClick={onSwitchToLogin} 
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
              >
                Fazer Login <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- TELA DE FORMULÁRIO (PADRÃO) ---
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full px-4 bg-surface-secondary dark:bg-slate-950 pt-20">
      <div className="w-full max-w-md">
        {/* Botão Voltar */}
        <button 
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors mb-4 ml-2 text-sm font-bold uppercase tracking-widest"
        >
          <ArrowRight size={16} className="rotate-180" /> Voltar ao site
        </button>

        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          
          {/* Detalhe decorativo no topo */}
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-emerald-400 to-sky-500"></div>
          
          <div className="p-8">
            {/* HEADER com logo e título */}
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-gradient-to-br from-indigo-50 to-slate-50 dark:from-indigo-950/40 dark:to-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm mb-4">
                <img src="/assets/images/brand/icon.png" alt="Logo" className="w-12 h-12" />
              </div>
              
              <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                Finanças <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600">Pro Invest</span>
              </h1>
              
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">
                Grátis no Controla: registre à vontade e organize o mês.
              </p>
              <p className="text-slate-600 dark:text-slate-300 text-xs mt-3 leading-relaxed bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2.5 text-left">
                Meses passados e comparações avançadas ficam no plano Pro — quando você quiser aprofundar.
              </p>
            </div>

            {/* Mensagem de erro */}
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-sm mb-6">
                <span className="font-medium">{error}</span>
              </div>
            )}
            
            <form onSubmit={handleRegister} className="space-y-5">
              {/* Campo E-mail */}
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={20} />
                <input 
                  type="email" 
                  placeholder="Seu melhor e-mail" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  required 
                />
              </div>
              
              {/* Campo Senha */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Crie uma senha (mínimo 6 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white pl-12 pr-12 py-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                >
                  {showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}
                </button>
              </div>

              {/* Campo Confirmar Senha */}
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" size={20} />
                <input 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Confirme sua senha"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-white pl-12 pr-4 py-4 rounded-xl outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/40 transition-all placeholder:text-slate-500 dark:placeholder:text-slate-400"
                  required 
                />
              </div>

              {/* Botão principal */}
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
              >
                {loading ? 'ABRINDO SUA CONTA...' : 'Começar grátis no Controla'} <ArrowRight size={18} />
              </button>
            </form>

            {/* Rodapé - Já tem conta */}
            <div className="mt-8 text-center">
              <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Já tem uma conta?</p>
              <button 
                onClick={onSwitchToLogin} 
                className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors text-sm uppercase tracking-wider hover:underline"
              >
                Entrar agora
              </button>
            </div>
          </div>
        </div>
        
        {/* Texto de segurança */}
        <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-6">
          🔒 Seus dados estão protegidos com criptografia de ponta a ponta.
        </p>
      </div>
    </div>
  );
};

export default AuthRegister;
