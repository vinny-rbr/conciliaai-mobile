let _handler: (() => void) | null = null;

export function registerTokenExpiredHandler(fn: () => void) {
  _handler = fn;
}

export function emitTokenExpired() {
  _handler?.();
}
