// Tiny event bus for triggering a subtle cart-icon pulse when items are added.
// Avoids toasts, snackbars, or floating banners that block the UI.

const target = typeof window !== 'undefined' ? new EventTarget() : null;
const EVENT = 'cart-pulse';

export const emitCartPulse = () => {
  target?.dispatchEvent(new Event(EVENT));
};

export const onCartPulse = (handler: () => void): (() => void) => {
  if (!target) return () => {};
  target.addEventListener(EVENT, handler);
  return () => target.removeEventListener(EVENT, handler);
};
