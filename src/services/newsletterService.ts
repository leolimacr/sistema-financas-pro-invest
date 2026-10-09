
import { ref, push, serverTimestamp } from 'firebase/database';
import { database, authReadyPromise } from '../firebase';

/**
 * Salva um e-mail na lista de newsletter do Firebase.
 * @param email O e-mail do usuário.
 * @param source A origem da inscrição (ex: 'hub_conhecimento', 'footer').
 */
export const subscribeToNewsletter = async (email: string, source: string = 'general') => {
  try {
    // Garante que o Auth do Firebase está inicializado (login anônimo ou real)
    await authReadyPromise;

    const subscribersRef = ref(database, 'newsletter/subscribers');
    
    await push(subscribersRef, {
      email,
      source,
      createdAt: serverTimestamp(),
      userAgent: window.navigator.userAgent 
    });

    return true;
  } catch (error) {
    console.error("Erro ao inscrever na newsletter:", error);
    throw error; // Repassa o erro para a UI tratar
  }
};
