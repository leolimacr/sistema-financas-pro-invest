"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getGenAI = void 0;
const generative_ai_1 = require("@google/generative-ai");
let genAI = null;
const getGenAI = () => {
    if (!genAI) {
        const key = process.env.GEMINI_API_KEY;
        if (!key) {
            throw new Error("⚠️ GEMINI_API_KEY ausente nas variáveis de ambiente (.env)");
        }
        genAI = new generative_ai_1.GoogleGenerativeAI(key);
        console.log("✅ Instância do Gemini inicializada com sucesso (Lazy Init).");
    }
    return genAI;
};
exports.getGenAI = getGenAI;
//# sourceMappingURL=clients.js.map