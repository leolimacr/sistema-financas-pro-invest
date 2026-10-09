import React, { useState } from 'react';
import type { User } from 'firebase/auth';
import { signInWithEmailAndPassword, sendPasswordResetEmail, signOut, sendEmailVerification } from 'firebase/auth';
import { auth } from '../../firebase';
import { Lock, Mail, ArrowRight, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthLoginProps {
  onSuccess: () => void;
  onSwitchToRegister: () => void;
}

const AuthLogin: React.FC<AuthLoginProps> = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [unverifiedUser, setUnverifiedUser] = useState<User | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setUnverifiedUser(null);
    setLoading(true);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      if (!user.emailVerified) {
        setUnverifiedUser(user);
        setError('E-mail não verificado.');
        setLoading(false);
        return;
      }

      onSuccess();
    } catch (err: any) {
      await signOut(auth);
      
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('E-mail ou senha incorretos.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde um momento.');
      } else {
        setError('Erro ao entrar. Tente novamente.');
      }
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!unverifiedUser) return;
    
    setLoading(true);
    try {
      await sendEmailVerification(unverifiedUser);
      setSuccessMsg(`E-mail reenviado para ${email}! Verifique o SPAM.`);
      setError('');
      setUnverifiedUser(null);
      await signOut(auth);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
         setError('Aguarde alguns minutos antes de reenviar.');
      } else {
         setError('Erro ao reenviar.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Digite seu e-mail para recuperar a senha.');
      return;
    }
    setError('');
    setSuccessMsg('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMsg(`Link de recuperação enviado para ${email}.`);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') setError('E-mail não cadastrado.');
      else setError('Erro ao enviar e-mail de recuperação.');
    } finally {
      setLoading(false);
    }
  };

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
                  Acesse sua conta para continuar sua jornada
                </p>
              </div>

              {/* Mensagens de feedback com ícones */}
              {error && (
                <div className="flex items-start gap-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400 p-4 rounded-xl text-sm mb-6">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold">{error}</p>
                    {unverifiedUser && (
                      <button 
                        onClick={handleResendVerification}
                        className="underline hover:text-rose-900 dark:hover:text-rose-300 transition-colors text-xs mt-1 font-medium"
                      >
                        Reenviar e-mail de verificação
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              {successMsg && (
                <div className="flex items-start gap-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 p-4 rounded-xl text-sm mb-6">
                  <CheckCircle size={18} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{successMsg}</span>
                </div>
              )}
              
              <form onSubmit={handleLogin} className="space-y-5">
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
                    placeholder="Sua senha" 
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
                {/* Link Esqueceu a senha */}
                <div className="flex justify-end">
                  <button 
                    type="button" 
                    onClick={handleForgotPassword}
                    className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>

                {/* Botão principal */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-4 rounded-xl transition-all active:scale-[0.98] shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm uppercase tracking-wider"
                >
                  {loading ? 'Acessando...' : 'Acessar Conta'} <ArrowRight size={18} />
                </button>
              </form>

              {/* Rodapé - Criar conta */}
              <div className="mt-8 text-center">
                <p className="text-slate-500 dark:text-slate-400 text-sm mb-2">Ainda não faz parte?</p>
                <button 
                  onClick={onSwitchToRegister} 
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:text-emerald-800 dark:hover:text-emerald-300 transition-colors text-sm uppercase tracking-wider hover:underline"
                >
                  Criar Conta Gratuita
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

export default AuthLogin;
