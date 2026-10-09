"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStripe = getStripe;
const stripe_1 = __importDefault(require("stripe"));
let stripeInstance = null;
function getStripe() {
    if (stripeInstance)
        return stripeInstance;
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
        throw new Error('Missing STRIPE_SECRET_KEY environment variable');
    }
    stripeInstance = new stripe_1.default(key, {
        apiVersion: '2026-01-28.clover',
        typescript: true,
    });
    return stripeInstance;
}
//# sourceMappingURL=getStripe.js.map