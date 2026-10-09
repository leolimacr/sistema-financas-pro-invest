// functions/src/clients.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
// Adicionaremos os imports do OpenRouter, Mistral, Stripe, etc., no próximo passo.

// 1. O container vai guardar essa variável na memória (Warm Start)
// Inicialmente, ela é nula para não quebrar o Cold Start.
let genAI: GoogleGenerativeAI | null = null;

// 2. O "Gerenciador de Instância" (Padrão Singleton / Lazy Init)
export const getGenAI = (): GoogleGenerativeAI => {
  // Se a instância já existe na memória do container, reaproveitamos (economiza tempo e CPU)
  if (!genAI) {
    const key = process.env.GEMINI_API_KEY;
    
    // Se a chave não existir, o erro só acontece AQUI, na hora que a função tenta usar, 
    // não derrubando o container inteiro na inicialização.
    if (!key) {
      throw new Error("⚠️ GEMINI_API_KEY ausente nas variáveis de ambiente (.env)");
    }
    
    genAI = new GoogleGenerativeAI(key);
    console.log("✅ Instância do Gemini inicializada com sucesso (Lazy Init).");
  }
  
  return genAI;
};