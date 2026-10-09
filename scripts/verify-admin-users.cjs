const admin = require('../functions/node_modules/firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const { resolveAdminUserTier } = require('../functions/lib/adminUsers');

async function verify() {
  const usersSnap = await db.collection('users').get();
  console.log(`Total users in DB: ${usersSnap.docs.length}`);

  let summary = {
    totalUsers: 0,
    byTier: { free: 0, pro: 0, premium: 0 },
    activeUsers: 0,
    inactiveUsers: 0,
    abandonedCount: 0,
  };

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const uid = doc.id;

    let billingMainData = null;
    const bSnap = await db.collection('users').doc(uid).collection('billing').doc('main').get();
    if (bSnap.exists) {
      billingMainData = bSnap.data();
    }

    const res = resolveAdminUserTier({
      email: data.email,
      directTier: data.tier,
      directPlan: data.plan,
      subscription: data.subscription,
      billingMain: billingMainData,
    });

    summary.totalUsers++;
    summary.byTier[res.tier]++;

    console.log(`- ${uid.padEnd(28)} | ${(data.displayName || 'Sem nome').padEnd(25)} | ${(data.email || 'Sem e-mail').padEnd(26)} | Tier: ${res.tier.toUpperCase().padEnd(7)} | Plano: ${res.planName}`);
  }

  console.log('\n--- RESUMO DE MÉTRICAS SOBERANAS ---');
  console.log(JSON.stringify(summary, null, 2));
}

verify().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
