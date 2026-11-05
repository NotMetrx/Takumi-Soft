import { describe, expect, it, vi } from 'vitest';
import { LabStore } from '../../src/lib/interaction/lab_store.svelte';

describe('Protocolo de Bioseguridad y Equipamiento EPP (ISO 7010 / SGA)', () => {
  it('inicia sin EPP por defecto y detecta estado no completamente protegido', () => {
    const store = new LabStore();
    expect(store.safetyCoatEquipped).toBe(false);
    expect(store.safetyGogglesEquipped).toBe(false);
    expect(store.safetyGlovesType).toBe('none');
    expect(store.isFullyProtected).toBe(false);
  });

  it('permite alternar bata, gafas y tipo de guantes reactivamente', () => {
    const store = new LabStore();
    store.toggleSafetyCoat();
    expect(store.safetyCoatEquipped).toBe(true);

    store.toggleSafetyGoggles();
    expect(store.safetyGogglesEquipped).toBe(true);

    store.setSafetyGloves('nitrile_blue');
    expect(store.safetyGlovesType).toBe('nitrile_blue');
    expect(store.isFullyProtected).toBe(true);
    expect(store.safetyAlert?.type).toBe('success');

    store.setSafetyGloves('none');
    expect(store.isFullyProtected).toBe(false);
  });

  it('equipAllPPE activa todo el equipo reglamentario de inmediato', () => {
    const store = new LabStore();
    store.equipAllPPE();
    expect(store.safetyCoatEquipped).toBe(true);
    expect(store.safetyGogglesEquipped).toBe(true);
    expect(store.safetyGlovesType).toBe('nitrile_blue');
    expect(store.isFullyProtected).toBe(true);
    expect(store.safetyAlert?.title).toContain('EPP Completo');

    store.clearSafetyPPE();
    expect(store.safetyCoatEquipped).toBe(false);
    expect(store.safetyGogglesEquipped).toBe(false);
    expect(store.safetyGlovesType).toBe('none');
    expect(store.isFullyProtected).toBe(false);
  });

  it('emite alerta didáctica al manipular ácidos sin EPP y respeta modo estricto', () => {
    const store = new LabStore();
    expect(store.safetyStrictMode).toBe(false);

    // En modo educativo libre (por defecto), emite la advertencia pero no bloquea
    const poured = store.pour('hcl', 2.0);
    expect(poured).toBe(true);
    expect(store.safetyAlert?.type).toBe('warning');
    expect(store.safetyAlert?.title).toContain('SGA');

    // Al activar modo estricto, bloquea las manipulaciones sin EPP
    store.safetyStrictMode = true;
    const blockedPour = store.pour('hcl', 2.0);
    expect(blockedPour).toBe(false);

    // Al equipar EPP, permite la manipulación aún en modo estricto
    store.equipAllPPE();
    const allowedPour = store.pour('hcl', 2.0);
    expect(allowedPour).toBe(true);
  });

  it('activa protocolos de emergencia para ducha, lavaojos y extintor', () => {
    const store = new LabStore();
    store.triggerEmergencyShower();
    expect(store.safetyAlert?.title).toContain('DUCHA');

    store.triggerEmergencyEyewash();
    expect(store.safetyAlert?.title).toContain('LAVAOJOS');

    store.triggerFireExtinguisher();
    expect(store.safetyAlert?.title).toContain('EXTINTOR');
  });

  it('controla el modo paseo libre en primera persona y anclaje a estaciones', () => {
    const store = new LabStore();
    expect(store.isFirstPersonWalking).toBe(false);

    store.toggleFirstPersonWalk(true);
    expect(store.isFirstPersonWalking).toBe(true);
    expect(store.isMicroscopeActive).toBe(false);

    // Al aproximarse y entrar a una estación desde el paseo
    store.enterStationFromWalk('biologia');
    expect(store.isFirstPersonWalking).toBe(false);
    expect(store.activeStation).toBe('biologia');
  });

  it('auto-descarta las notificaciones flotantes tras un máximo de 5 segundos', () => {
    vi.useFakeTimers();
    try {
      const store = new LabStore();

      // Al activar el modo paseo se emite la notificación
      store.toggleFirstPersonWalk(true);
      expect(store.safetyAlert).not.toBeNull();
      expect(store.safetyAlert?.title).toContain('Modo Paseo');

      // Avanzar 2 segundos: la notificación sigue activa
      vi.advanceTimersByTime(2000);
      expect(store.safetyAlert).not.toBeNull();

      // Avanzar otros 3 segundos (total 5 seg): la notificación desaparece sola
      vi.advanceTimersByTime(3000);
      expect(store.safetyAlert).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
