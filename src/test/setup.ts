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
  collection: vi.fn(),
  doc: vi.fn(),
  onSnapshot: vi.fn(() => () => {}),
  getDocs: vi.fn(),
}));
