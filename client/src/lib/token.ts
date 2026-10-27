const TOKEN_KEY = "plantry.token";
const HOUSEHOLD_KEY = "plantry.household";

// Storage can be missing or blocked (private windows), so every access is guarded.
function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export const tokenStore = {
  get: () => read(TOKEN_KEY),
  set: (t: string | null) => write(TOKEN_KEY, t),
};

export const householdStore = {
  get: () => read(HOUSEHOLD_KEY),
  set: (id: string | null) => write(HOUSEHOLD_KEY, id),
};
