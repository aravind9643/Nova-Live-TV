// Tiny haptic helper. Vibration is Android-only (iOS Safari ignores it), and
// it must never throw or be felt as noise — so keep pulses short and rare.

const canVibrate = () =>
  typeof navigator !== 'undefined' &&
  typeof navigator.vibrate === 'function' &&
  !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

export function tap(ms = 10) {
  if (canVibrate()) {
    try { navigator.vibrate(ms); } catch { /* ignore */ }
  }
}
