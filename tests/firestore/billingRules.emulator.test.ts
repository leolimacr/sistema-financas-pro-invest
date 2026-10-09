import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  type Firestore,
} from 'firebase/firestore';

const OWNER_UID = 'owner-e7-test';
const OTHER_UID = 'other-e7-test';
const USER_DOC = `users/${OWNER_UID}`;
const BILLING_MAIN = `users/${OWNER_UID}/billing/main`;
const BILLING_CREATE_ATTEMPT = `users/${OWNER_UID}/billing/create-attempt`;
const SECONDARY_GET = `users/${OWNER_UID}/billing/secondary-get`;
const SECONDARY_UPDATE = `users/${OWNER_UID}/billing/secondary-update`;
const SECONDARY_DELETE = `users/${OWNER_UID}/billing/secondary-delete`;
const SECONDARY_CREATE = `users/${OWNER_UID}/billing/secondary-create`; // inexistente de propósito
const AGENDA_CREATE_ATTEMPT = `users/${OWNER_UID}/agenda/create-attempt`; // inexistente de propósito
const AGENDA_UPDATE_FIXTURE = `users/${OWNER_UID}/agenda/update-fixture`;
const AGENDA_DELETE_FIXTURE = `users/${OWNER_UID}/agenda/delete-fixture`;
const AGENDA_NEXUS_DOC = `users/${OWNER_UID}/agenda/_nexus`;
const AGENDA_NEXUS_SESSION = `users/${OWNER_UID}/agenda/_nexus/sessions/s-1`;

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const rules = readFileSync(resolve(root, 'firestore.rules'), 'utf8');
  testEnv = await initializeTestEnvironment({
    projectId: 'demo-e7-rules',
    firestore: {
      rules,
      host: 'localhost',
      port: 8080,
    },
  });
  // Fixtures SOMENTE com rules desabilitadas; UIDs e dados fictícios.
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, USER_DOC), { nickname: 'Owner Fixture' });
    await setDoc(doc(db, BILLING_MAIN), { tier: 'free', status: null });
    await setDoc(doc(db, SECONDARY_GET), { note: 'get fixture' });
    await setDoc(doc(db, SECONDARY_UPDATE), { note: 'update fixture' });
    await setDoc(doc(db, SECONDARY_DELETE), { note: 'delete fixture' });
    await setDoc(doc(db, AGENDA_UPDATE_FIXTURE), {
      title: 'update fixture',
      date: Timestamp.fromDate(new Date(2026, 7, 5)),
      time: '10:00',
      completed: false,
    });
    await setDoc(doc(db, AGENDA_DELETE_FIXTURE), {
      title: 'delete fixture',
      date: Timestamp.fromDate(new Date(2026, 7, 12)),
      time: '11:00',
      completed: false,
    });
    await setDoc(doc(db, AGENDA_NEXUS_DOC), { placeholder: true });
    await setDoc(doc(db, AGENDA_NEXUS_SESSION), { status: 'fixture' });
    // BILLING_CREATE_ATTEMPT, SECONDARY_CREATE e AGENDA_CREATE_ATTEMPT
    // propositalmente NÃO criados.
  });
});

afterAll(async () => {
  if (testEnv) await testEnv.cleanup();
});

const ownerDb = () => testEnv.authenticatedContext(OWNER_UID).firestore();
const otherDb = () => testEnv.authenticatedContext(OTHER_UID).firestore();

describe('billing/main — Rules no Emulator (E7-01, assertivo)', () => {
  it('dono: get no próprio doc e no billing/main', async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), USER_DOC)));
    await assertSucceeds(getDoc(doc(ownerDb(), BILLING_MAIN)));
  });

  it('dono: update/delete em billing/main negados', async () => {
    const db = ownerDb();
    await assertFails(updateDoc(doc(db, BILLING_MAIN), { tier: 'premium' }));
    await assertFails(deleteDoc(doc(db, BILLING_MAIN)));
  });

  it('dono: create em billing/create-attempt (inexistente) negado', async () => {
    await assertFails(
      setDoc(doc(ownerDb(), BILLING_CREATE_ATTEMPT), { tier: 'premium' })
    );
  });

  it('outro UID: get/create/update/delete negados nos dois caminhos', async () => {
    const db = otherDb();
    await assertFails(getDoc(doc(db, USER_DOC)));
    await assertFails(getDoc(doc(db, BILLING_MAIN)));
    await assertFails(setDoc(doc(db, BILLING_CREATE_ATTEMPT), { tier: 'premium' }));
    await assertFails(updateDoc(doc(db, BILLING_MAIN), { tier: 'premium' }));
    await assertFails(deleteDoc(doc(db, BILLING_MAIN)));
  });
});

describe('billing/secondary-* — menor privilégio (negado ao cliente)', () => {
  it('dono: get/create/update/delete em secondary-* negados', async () => {
    const db = ownerDb();
    await assertFails(getDoc(doc(db, SECONDARY_GET)));
    await assertFails(setDoc(doc(db, SECONDARY_CREATE), { note: 'x' }));
    await assertFails(updateDoc(doc(db, SECONDARY_UPDATE), { note: 'x' }));
    await assertFails(deleteDoc(doc(db, SECONDARY_DELETE)));
  });

  it('outro UID: get/create/update/delete em secondary-* negados', async () => {
    const db = otherDb();
    await assertFails(getDoc(doc(db, SECONDARY_GET)));
    await assertFails(setDoc(doc(db, SECONDARY_CREATE), { note: 'x' }));
    await assertFails(updateDoc(doc(db, SECONDARY_UPDATE), { note: 'x' }));
    await assertFails(deleteDoc(doc(db, SECONDARY_DELETE)));
  });
});

// Ordem intencional: leitura e outro UID primeiro; CUD do dono depois
// (o delete do dono remove a fixture); _nexus por último.
describe('agenda — listagem real e _nexus (Etapa 7.x)', () => {
  // Espelha fetchMonthCommitments: mesmos wheres, mesmos orderBys, getDocs.
  const monthQuery = (db: Firestore) =>
    query(
      collection(db, 'users', OWNER_UID, 'agenda'),
      where('date', '>=', Timestamp.fromDate(new Date(2026, 7, 1))),
      where('date', '<', Timestamp.fromDate(new Date(2026, 8, 1))),
      orderBy('date', 'asc'),
      orderBy('time', 'asc')
    );

  it('dono: list por query de mês permitida', async () => {
    await assertSucceeds(getDocs(monthQuery(ownerDb())));
  });

  it('dono: get de compromisso normal permitido', async () => {
    await assertSucceeds(getDoc(doc(ownerDb(), AGENDA_UPDATE_FIXTURE)));
  });

  it('outro UID: get/list/create/update/delete em agenda negados', async () => {
    const db = otherDb();
    await assertFails(getDoc(doc(db, AGENDA_UPDATE_FIXTURE)));
    await assertFails(getDocs(monthQuery(db)));
    await assertFails(setDoc(doc(db, AGENDA_CREATE_ATTEMPT), { title: 'x' }));
    await assertFails(updateDoc(doc(db, AGENDA_UPDATE_FIXTURE), { title: 'x' }));
    await assertFails(deleteDoc(doc(db, AGENDA_DELETE_FIXTURE)));
  });

  it('dono: create/update/delete de compromisso normal permitidos', async () => {
    const db = ownerDb();
    await assertSucceeds(
      setDoc(doc(db, AGENDA_CREATE_ATTEMPT), {
        title: 'x',
        date: Timestamp.fromDate(new Date(2026, 7, 20)),
        time: '12:00',
        completed: false,
      })
    );
    await assertSucceeds(updateDoc(doc(db, AGENDA_UPDATE_FIXTURE), { title: 'y' }));
    await assertSucceeds(deleteDoc(doc(db, AGENDA_DELETE_FIXTURE)));
  });

  it('dono: create/update/delete em agenda/_nexus negados', async () => {
    const db = ownerDb();
    await assertFails(setDoc(doc(db, AGENDA_NEXUS_DOC), { placeholder: true }));
    await assertFails(updateDoc(doc(db, AGENDA_NEXUS_DOC), { placeholder: true }));
    await assertFails(deleteDoc(doc(db, AGENDA_NEXUS_DOC)));
  });

  it('dono: create/update/delete abaixo de agenda/_nexus/** negados', async () => {
    const db = ownerDb();
    await assertFails(setDoc(doc(db, AGENDA_NEXUS_SESSION), { status: 'x' }));
    await assertFails(updateDoc(doc(db, AGENDA_NEXUS_SESSION), { status: 'x' }));
    await assertFails(deleteDoc(doc(db, AGENDA_NEXUS_SESSION)));
  });
});
