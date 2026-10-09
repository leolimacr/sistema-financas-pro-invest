import { useState, useEffect } from 'react';

export const useOnboarding = (launchCount: number) => {
  const [step, setStep] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const completed = (() => {
      const current = localStorage.getItem('financas-pro-invest_onboarding_op_completed');
      if (current) return current;
      const legacy = localStorage.getItem('fpi_onboarding_op_completed');
      if (legacy) {
        try { localStorage.setItem('financas-pro-invest_onboarding_op_completed', legacy); localStorage.removeItem('fpi_onboarding_op_completed'); } catch {}
        return legacy;
      }
      return null;
    })();
    // Só ativa se nunca foi completado e não tem lançamentos (usuário novo real)
    if (!completed && launchCount === 0) {
      setIsActive(true);
      setStep(1);
    }
  }, [launchCount]);

  const nextStep = () => {
    if (step < 4) {
      setStep(s => s + 1);
    }
  };

  const skip = () => {
    setIsActive(false);
    setStep(0);
    localStorage.setItem('financas-pro-invest_onboarding_op_completed', 'true');
    try { localStorage.removeItem('fpi_onboarding_op_completed'); } catch {}
  };

  const finish = () => {
    setIsActive(false);
    setStep(0);
    localStorage.setItem('financas-pro-invest_onboarding_op_completed', 'true');
    try { localStorage.removeItem('fpi_onboarding_op_completed'); } catch {}
  };

  return {
    step,
    isActive,
    nextStep,
    skip,
    finish,
  };
};
