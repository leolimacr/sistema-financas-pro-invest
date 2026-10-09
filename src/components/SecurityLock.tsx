import React, { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Delete, Lock } from 'lucide-react';
import { NativeBiometric } from 'capacitor-native-biometric';

interface SecurityLockProps {
  storedPin: string; // O PIN salvo no dispositivo
  useBiometrics: boolean; // Se o usuário ativou biometria nas configurações
  onSuccess: () => void; // O que fazer quando acertar o PIN
}

const SecurityLock: React.FC<SecurityLockProps> = ({ storedPin, useBiometrics, onSuccess }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  // Tenta biometria automaticamente ao abrir, se estiver ativo
  useEffect(() => {
    if (useBiometrics) {
      handleBiometrics();
    }
  }, []);

  const handleBiometrics = async () => {
    try {
      const result = await NativeBiometric.isAvailable();
      if (result.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason: "Acesse sua conta com segurança",
          title: "Finanças Pro Invest",
          subtitle: "Use sua digital ou rosto",
          description: "Confirme sua identidade para entrar.",
        });
        onSuccess();
      }
    } catch (e) {
      console.log("Biometria não disponível ou cancelada.");
    }
  };

  const handleKeyPress = (num: string) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);

      // Valida automaticamente ao digitar o 4º dígito
      if (newPin.length === 4) {
        if (newPin === storedPin) {
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500); // Limpa após erro
        }
      }
    }
  };

  const handleDelete = () => setPin(pin.slice(0, -1));

  return (
    <div className="fixed inset-0 z-[10002] bg-surface-primary dark:bg-slate-950 flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
      
      {/* Topo: Logo e Status */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 rounded-3xl flex items-center justify-center mx-auto mb-4 border border-emerald-200 dark:border-emerald-800 shadow-sm">
            <Lock className={error ? "text-red-500 animate-bounce" : "text-emerald-500"} size={40} />
        </div>
        <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">App Bloqueado</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-bold uppercase tracking-widest">
            {error ? 'PIN Incorreto' : 'Digite seu código de acesso'}
        </p>
      </div>

      {/* Visualização dos Dígitos (Bolinhas) */}
      <div className="flex gap-6 mb-16">
        {[1, 2, 3, 4].map((i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              pin.length >= i 
              ? 'bg-emerald-600 border-emerald-600 scale-125 shadow-sm' 
              : 'border-slate-300 dark:border-slate-700 bg-transparent'
            } ${error ? 'border-red-500 bg-red-500' : ''}`}
          />
        ))}
      </div>

      {/* Teclado Numérico */}
      <div className="grid grid-cols-3 gap-6 max-w-[300px]">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button 
            key={num}
            onClick={() => handleKeyPress(num)}
            className="w-16 h-16 rounded-full bg-surface-secondary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center"
          >
            {num}
          </button>
        ))}
        
        {/* Botão Biometria ou Vazio */}
        <button 
          onClick={handleBiometrics}
          className="w-16 h-16 rounded-full flex items-center justify-center text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 active:scale-90 transition-all"
        >
          {useBiometrics && <Fingerprint size={32} />}
        </button>

        <button 
          onClick={() => handleKeyPress('0')}
          className="w-16 h-16 rounded-full bg-surface-secondary dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-90 transition-all flex items-center justify-center"
        >
          0
        </button>

        <button 
          onClick={handleDelete}
          className="w-16 h-16 rounded-full flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:scale-90 transition-all"
        >
          <Delete size={28} />
        </button>
      </div>

      {/* Rodapé Informativo */}
      <div className="mt-20">
         <p className="text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-[0.3em]">Finanças Pro Invest Security</p>
      </div>

    </div>
  );
};

export default SecurityLock;