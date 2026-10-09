"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.AsaasClient = void 0;
exports.getAsaas = getAsaas;
const logger = __importStar(require("firebase-functions/logger"));
const asaasConfig_1 = require("../config/asaasConfig");
class AsaasClient {
    constructor(apiKey, isProd = false) {
        this.apiKey = apiKey || process.env.ASAAS_API_KEY || '';
        this.baseUrl = (0, asaasConfig_1.getAsaasBaseUrl)(isProd);
    }
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            'access_token': this.apiKey,
            ...(options.headers || {}),
        };
        const res = await fetch(url, {
            ...options,
            headers,
        });
        if (!res.ok) {
            const errorBody = await res.text();
            logger.error(`[AsaasClient] Erro HTTP ${res.status} em ${endpoint}: ${errorBody}`);
            throw new Error(`Asaas API error [${res.status}]: ${errorBody}`);
        }
        return res.json();
    }
    async findCustomer(externalReference, cpfCnpj) {
        if (!this.apiKey)
            return null;
        try {
            const res = await this.request(`/customers?externalReference=${encodeURIComponent(externalReference)}`);
            if (res.data && res.data.length > 0) {
                return res.data[0];
            }
            if (cpfCnpj) {
                const cleanedCpf = cpfCnpj.replace(/\D/g, '');
                const resCpf = await this.request(`/customers?cpfCnpj=${encodeURIComponent(cleanedCpf)}`);
                if (resCpf.data && resCpf.data.length > 0) {
                    return resCpf.data[0];
                }
            }
            return null;
        }
        catch (err) {
            logger.warn('[AsaasClient] Falha ao buscar cliente:', err);
            return null;
        }
    }
    async createOrGetCustomer(input) {
        const existing = await this.findCustomer(input.externalReference, input.cpfCnpj);
        if (existing) {
            return { id: existing.id };
        }
        const payload = {
            name: input.name.trim(),
            cpfCnpj: input.cpfCnpj.replace(/\D/g, ''),
            email: input.email.trim().toLowerCase(),
            mobilePhone: input.phone ? input.phone.replace(/\D/g, '') : undefined,
            externalReference: input.externalReference,
            notificationDisabled: false,
        };
        const res = await this.request('/customers', {
            method: 'POST',
            body: JSON.stringify(payload),
        });
        return res;
    }
    async createSubscription(input) {
        const res = await this.request('/subscriptions', {
            method: 'POST',
            body: JSON.stringify(input),
        });
        return res;
    }
    async getSubscriptionPayments(subscriptionId) {
        const res = await this.request(`/subscriptions/${subscriptionId}/payments`);
        return res.data || [];
    }
    async getPaymentPixQrCode(paymentId) {
        const res = await this.request(`/payments/${paymentId}/pixQrCode`);
        return res;
    }
    async getSubscription(subscriptionId) {
        return this.request(`/subscriptions/${subscriptionId}`);
    }
    async getPayment(paymentId) {
        return this.request(`/payments/${paymentId}`);
    }
}
exports.AsaasClient = AsaasClient;
let clientInstance = null;
function getAsaas(apiKey, isProd = false) {
    if (apiKey) {
        return new AsaasClient(apiKey, isProd);
    }
    if (!clientInstance) {
        clientInstance = new AsaasClient(process.env.ASAAS_API_KEY, isProd);
    }
    return clientInstance;
}
//# sourceMappingURL=getAsaas.js.map