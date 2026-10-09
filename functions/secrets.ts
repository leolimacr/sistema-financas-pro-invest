import { defineSecret } from 'firebase-functions/params';

export const BRAPI_TOKEN = defineSecret('BRAPI_TOKEN');
export const DEEPSEEK_API_KEY = defineSecret('DEEPSEEK_API_KEY');
export const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
export const GROQ_API_KEY = defineSecret('GROQ_API_KEY');
export const MISTRAL_API_KEY = defineSecret('MISTRAL_API_KEY');
export const OPENROUTER_API_KEY = defineSecret('OPENROUTER_API_KEY');
export const STRIPE_SECRET_KEY = defineSecret('STRIPE_SECRET_KEY');
export const STRIPE_WEBHOOK_SECRET = defineSecret('STRIPE_WEBHOOK_SECRET');
export const TAVILY_API_KEY = defineSecret('TAVILY_API_KEY');
export const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
