import { describe, it, expect, vi, beforeEach } from 'vitest';

const connectFirestoreEmulator = vi.fn();
const connectAuthEmulator = vi.fn();
const connectDatabaseEmulator = vi.fn();

vi.mock('firebase/app', () => ({ initializeApp: vi.fn(() => ({})) }));
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({ onAuthStateChanged: vi.fn() })),
  connectAuthEmulator,
}));
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(() => ({})),
  connectFirestoreEmulator,
}));
vi.mock('firebase/database', () => ({
  getDatabase: vi.fn(() => ({})),
  connectDatabaseEmulator,
}));
vi.mock('firebase/functions', () => ({ getFunctions: vi.fn(() => ({})) }));
vi.mock('firebase/storage', () => ({ getStorage: vi.fn(() => ({})) }));

describe('firebase - chaveamento do emulador (smoke)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('com VITE_USE_EMULATOR=true conecta Firestore, Auth e RTDB no localhost', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', 'true');
    await import('../firebase');

    expect(connectFirestoreEmulator).toHaveBeenCalledTimes(1);
    expect(connectFirestoreEmulator.mock.calls[0].slice(1)).toEqual(['localhost', 8080]);
    expect(connectAuthEmulator).toHaveBeenCalledTimes(1);
    expect(connectDatabaseEmulator).toHaveBeenCalledTimes(1);
    expect(connectDatabaseEmulator.mock.calls[0].slice(1)).toEqual(['localhost', 9000]);
    vi.unstubAllEnvs();
  });

  it('sem a flag, nenhuma conexão de emulador é feita (produção intacta por padrão)', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', '');
    await import('../firebase');

    expect(connectFirestoreEmulator).not.toHaveBeenCalled();
    expect(connectAuthEmulator).not.toHaveBeenCalled();
    expect(connectDatabaseEmulator).not.toHaveBeenCalled();
    vi.unstubAllEnvs();
  });
});
