import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Capacitor
vi.mock('@capacitor/core', () => ({
  Capacitor: {
    isNativePlatform: vi.fn(() => false),
    getPlatform: vi.fn(() => 'web'),
  },
  registerPlugin: vi.fn(() => ({
    isPinSupported: vi.fn(async () => ({ supported: false })),
    pinAgendaShortcut: vi.fn(async () => ({ success: false })),
  })),
}));

// Mock Firebase Auth
vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => ({
    onAuthStateChanged: vi.fn(() => () => {}),
  })),
  onAuthStateChanged: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
}));

// Mock Firestore
vi.mock('firebase/firestore', () => ({
  getFirestore: vi.fn(),
  collection: vi.fn((_db, path, ...segments) => ({ path, segments })),
  doc: vi.fn((_db, path, ...segments) => ({ path, id: segments[segments.length - 1] || 'mock-id' })),
  onSnapshot: vi.fn(() => () => {}),
  getDocs: vi.fn(async () => ({ forEach: vi.fn(), docs: [] })),
  setDoc: vi.fn(async () => {}),
  updateDoc: vi.fn(async () => {}),
  deleteDoc: vi.fn(async () => {}),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    commit: vi.fn(async () => {}),
  })),
  query: vi.fn((q) => q),
  orderBy: vi.fn(),
  where: vi.fn(),
}));
