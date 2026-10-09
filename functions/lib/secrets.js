"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RESEND_API_KEY = exports.TAVILY_API_KEY = exports.STRIPE_WEBHOOK_SECRET = exports.STRIPE_SECRET_KEY = exports.OPENROUTER_API_KEY = exports.MISTRAL_API_KEY = exports.GROQ_API_KEY = exports.GEMINI_API_KEY = exports.DEEPSEEK_API_KEY = exports.BRAPI_TOKEN = void 0;
const params_1 = require("firebase-functions/params");
exports.BRAPI_TOKEN = (0, params_1.defineSecret)('BRAPI_TOKEN');
exports.DEEPSEEK_API_KEY = (0, params_1.defineSecret)('DEEPSEEK_API_KEY');
exports.GEMINI_API_KEY = (0, params_1.defineSecret)('GEMINI_API_KEY');
exports.GROQ_API_KEY = (0, params_1.defineSecret)('GROQ_API_KEY');
exports.MISTRAL_API_KEY = (0, params_1.defineSecret)('MISTRAL_API_KEY');
exports.OPENROUTER_API_KEY = (0, params_1.defineSecret)('OPENROUTER_API_KEY');
exports.STRIPE_SECRET_KEY = (0, params_1.defineSecret)('STRIPE_SECRET_KEY');
exports.STRIPE_WEBHOOK_SECRET = (0, params_1.defineSecret)('STRIPE_WEBHOOK_SECRET');
exports.TAVILY_API_KEY = (0, params_1.defineSecret)('TAVILY_API_KEY');
exports.RESEND_API_KEY = (0, params_1.defineSecret)('RESEND_API_KEY');
//# sourceMappingURL=secrets.js.map