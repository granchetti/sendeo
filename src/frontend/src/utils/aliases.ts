const ALIASES_KEY = 'sendeo:routeAliases';

export function loadAliases(): Record<string, string> {
  try {
    const raw = localStorage.getItem(ALIASES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveAliases(obj: Record<string, string>) {
  try {
    localStorage.setItem(ALIASES_KEY, JSON.stringify(obj));
  } catch {
    /* ignore */
  }
}

export { ALIASES_KEY };
