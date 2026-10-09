import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SettingsPage from '../SettingsPage';

const routerMocks = vi.hoisted(() => ({
  navigate: vi.fn(),
}));

const securityMocks = vi.hoisted(() => ({
  activeModal: null as string | null,
  setActiveModal: vi.fn(),
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => routerMocks.navigate,
}));

vi.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { uid: 'u1', email: 'teste@exemplo.com' },
    logout: vi.fn(),
  }),
}));

vi.mock('../../firebase', () => ({
  auth: {},
  functions: {},
}));

vi.mock('firebase/functions', () => ({
  httpsCallable: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  deleteUser: vi.fn(),
}));

vi.mock('@capacitor/browser', () => ({
  Browser: { open: vi.fn() },
}));

vi.mock('../../hooks/useFirebase', () => ({
  useFirebase: () => ({
    userMeta: null,
    saveFinancialProfile: vi.fn(),
    wipeUserData: vi.fn(),
  }),
}));

vi.mock('../../hooks/useEntitlement', () => ({
  useEntitlement: () => ({
    effectiveTier: 'free',
    billingStatus: 'expired',
    loading: false,
  }),
}));

vi.mock('../../hooks/useSettingsState', () => ({
  useSettingsState: () => ({
    nickname: 'Teste',
    tempNickname: '',
    setTempNickname: vi.fn(),
    isEditingNickname: false,
    setIsEditingNickname: vi.fn(),
    handleSaveNickname: vi.fn(),
    isEditingProfile: false,
    setIsEditingProfile: vi.fn(),
    profileForm: {
      monthlyIncome: 0,
      emergencyReserveTarget: 0,
      emergencyReserveCurrent: 0,
      marcoZero: 0,
    },
    setProfileProfileForm: vi.fn(),
    isSavingProfile: false,
    handleSaveProfile: vi.fn(),
  }),
}));

vi.mock('../../hooks/usePresencePreferences', () => ({
  usePresencePreferences: () => ({
    presencePrefs: {
      pushEnabled: true,
      emailEnabled: false,
      topics: { debts: true, wealth: true, routine: true, nexus: true },
      intensity: 'balanced',
    },
    savingPresence: false,
    savePresencePrefs: vi.fn(),
    toggleTopic: vi.fn(),
  }),
}));

vi.mock('../../hooks/useSecuritySettings', () => ({
  useSecuritySettings: () => ({
    activeModal: securityMocks.activeModal,
    setActiveModal: securityMocks.setActiveModal,
    hasPin: false,
    alwaysAsk: false,
    useBiometrics: false,
    handleToggleAlwaysAsk: vi.fn(),
    handleToggleBiometrics: vi.fn(),
    startupHome: 'home',
    savingStartupHome: false,
    handleStartupHomeChange: vi.fn(),
    pinInput: '',
    setPinInput: vi.fn(),
    handlePinKeyPress: vi.fn(),
    handleSavePin: vi.fn(),
    handleClearCache: vi.fn(),
  }),
}));

vi.mock('../../theme/fpiVoiceGuide', () => ({
  FPI_COPY: { settingsRoutine: 'Rotina' },
}));

vi.mock('../../services/personaService', () => ({
  seedPersonaFromIntent: vi.fn(() => ({})),
}));

vi.mock('../tools/nexus/CommandCalibration', () => ({
  default: () => <div data-testid="command-calibration" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  securityMocks.activeModal = null;
});

describe('SettingsPage (Etapa 6 — E6-08 sem seção falsa)', () => {
  it('não renderiza "Horário de Disponibilidade"', () => {
    render(<SettingsPage onBack={vi.fn()} />);
    expect(screen.queryByText('Horário de Disponibilidade')).not.toBeInTheDocument();
    expect(screen.queryByText('Em quais horários o Nexus pode te notificar?')).not.toBeInTheDocument();
  });
});

describe('SettingsPage (Etapa 6 — E6-07 rotas internas)', () => {
  it('Termos de Uso navega para /termos (sem site externo)', () => {
    securityMocks.activeModal = 'termos';
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<SettingsPage onBack={vi.fn()} />);
    fireEvent.click(screen.getByText('Termos de Uso'));
    expect(routerMocks.navigate).toHaveBeenCalledWith('/termos');
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });

  it('Política de Privacidade navega para /privacidade (sem site externo)', () => {
    securityMocks.activeModal = 'termos';
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    render(<SettingsPage onBack={vi.fn()} />);
    fireEvent.click(screen.getByText('Política de Privacidade'));
    expect(routerMocks.navigate).toHaveBeenCalledWith('/privacidade');
    expect(openSpy).not.toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
