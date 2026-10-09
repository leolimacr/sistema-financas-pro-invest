import { Capacitor, registerPlugin } from '@capacitor/core';

export interface AgendaShortcutPluginInterface {
  isPinSupported(): Promise<{ supported: boolean }>;
  pinAgendaShortcut(): Promise<{ success: boolean; requested?: boolean }>;
}

function getNativePlugin(): AgendaShortcutPluginInterface | null {
  try {
    if (typeof registerPlugin === 'function') {
      return registerPlugin<AgendaShortcutPluginInterface>('AgendaShortcut');
    }
  } catch {
    // ignore
  }
  return null;
}

export const AgendaShortcutService = {
  isNativeAndroid(): boolean {
    try {
      return Capacitor?.isNativePlatform?.() && Capacitor?.getPlatform?.() === 'android';
    } catch {
      return false;
    }
  },

  async isPinSupported(): Promise<boolean> {
    if (!this.isNativeAndroid()) return false;
    try {
      const plugin = getNativePlugin();
      const res = await plugin?.isPinSupported();
      return !!res?.supported;
    } catch {
      return false;
    }
  },

  async requestPinShortcut(): Promise<{ success: boolean; message?: string }> {
    if (!this.isNativeAndroid()) {
      return {
        success: false,
        message: 'A criação direta de atalho nativo está disponível no aplicativo Android.',
      };
    }

    try {
      const plugin = getNativePlugin();
      const res = await plugin?.pinAgendaShortcut();
      if (res?.success) {
        return { success: true };
      }
      return {
        success: false,
        message: 'Não foi possível solicitar a criação do atalho.',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao criar atalho.',
      };
    }
  },
};
