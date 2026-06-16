// Module-level callback: set by GruposScreen when inside a group detail.
// CustomTabBar reads this to decide what the FAB does.
let _action: (() => void) | null = null;

export function setGroupFabAction(fn: (() => void) | null): void {
  _action = fn;
}

export function getGroupFabAction(): (() => void) | null {
  return _action;
}
