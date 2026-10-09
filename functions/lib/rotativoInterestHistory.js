"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildJurosRotativoId = buildJurosRotativoId;
exports.prepareScheduledInterestRecord = prepareScheduledInterestRecord;
const firestore_1 = require("firebase-admin/firestore");
const COLLECTION = 'jurosRotativos';
function buildJurosRotativoId(debtId, competence, source) {
    return `${debtId}_${competence}_${source}`;
}
function prepareScheduledInterestRecord(db, uid, params) {
    const id = buildJurosRotativoId(params.debtId, params.competence, 'scheduled_interest');
    const ref = db.collection('users').doc(uid).collection(COLLECTION).doc(id);
    return {
        ref,
        data: {
            debtId: params.debtId,
            debtName: params.debtName,
            competence: params.competence,
            appliedAt: firestore_1.Timestamp.now(),
            source: 'scheduled_interest',
            principal: params.principal,
            taxaMensal: params.taxaMensal,
            interestAmount: params.interestAmount,
            newBalance: params.newBalance,
            monthsLost: params.monthsLost,
            reverted: false,
            revertedAt: null,
        },
    };
}
//# sourceMappingURL=rotativoInterestHistory.js.map