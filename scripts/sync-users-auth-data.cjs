const admin = require('../functions/node_modules/firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

const db = admin.firestore();
const auth = admin.auth();

async function runSync() {
  console.log('[Sync] Iniciando sincronização soberana de usuários e tiers...');
  
  const usersSnap = await db.collection('users').get();
  console.log(`[Sync] Total de usuários no Firestore: ${usersSnap.docs.length}`);

  let updatedCount = 0;

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const data = docSnap.data();
    const updates = {};

    // 1. Busca dados no Firebase Auth
    let authUser = null;
    try {
      authUser = await auth.getUser(uid);
    } catch (err) {
      console.warn(`[Sync] Usuário ${uid} não encontrado no Firebase Auth:`, err.message);
    }

    if (authUser) {
      if (!data.email && authUser.email) {
        updates.email = authUser.email.toLowerCase().trim();
      }
      if (!data.displayName && authUser.displayName) {
        updates.displayName = authUser.displayName;
      }
    }

    // 2. Sincronização do Administrador (ADMIN_EMAIL)
    const currentEmail = (data.email || authUser?.email || '').toLowerCase().trim();
    const adminEmail = (process.env.ADMIN_EMAIL || 'leolimacr@hotmail.com').toLowerCase().trim();
    if (currentEmail === adminEmail) {
      updates.tier = 'premium';
      updates.plan = 'premium';
      updates.isAdmin = true;
      updates.role = 'admin';
      if (!data.displayName && !updates.displayName) {
        updates.displayName = 'Administrador Soberano';
      }
    }

    // 3. Checa se o usuário tem billing/main ativo
    try {
      const billingMainSnap = await db.collection('users').doc(uid).collection('billing').doc('main').get();
      if (billingMainSnap.exists) {
        const bData = billingMainSnap.data();
        if (bData?.status === 'active') {
          if (bData.tier === 'premium' && data.tier !== 'premium') {
            updates.tier = 'premium';
            updates.plan = 'premium';
          } else if (bData.tier === 'pro' && data.tier !== 'pro' && data.tier !== 'premium') {
            updates.tier = 'pro';
            updates.plan = 'pro';
          }
        }
      }
    } catch (e) {
      console.warn(`[Sync] Erro ao checar billing/main de ${uid}:`, e.message);
    }

    // 4. Checa se tem assinatura legada com planId ou plan
    if (!updates.tier && data.subscription) {
      const subPlan = data.subscription.plan || data.subscription.planId;
      if (typeof subPlan === 'string') {
        if (subPlan.includes('premium')) {
          updates.tier = 'premium';
          updates.plan = 'premium';
        } else if (subPlan.includes('pro')) {
          updates.tier = 'pro';
          updates.plan = 'pro';
        }
      }
    }

    if (Object.keys(updates).length > 0) {
      console.log(`[Sync] Atualizando ${uid} (${currentEmail || 'sem e-mail'}):`, updates);
      await db.collection('users').doc(uid).set(updates, { merge: true });
      updatedCount++;
    }
  }

  console.log(`[Sync] Finalizado! Total de usuários atualizados: ${updatedCount}`);
}

runSync()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Sync] Falha na sincronização:', err);
    process.exit(1);
  });
