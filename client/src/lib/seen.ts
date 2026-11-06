/** "Has this person seen this tip or tour?" Remembered per person on this device. */

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

const PREFIX = "plantry.seen.";

function store(): Store | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function hasSeen(userId: string, key: string, s: Store | null = store()): boolean {
  try {
    return s?.getItem(`${PREFIX}${userId}.${key}`) === "1";
  } catch {
    return false;
  }
}

export function markSeen(userId: string, key: string, s: Store | null = store()): void {
  try {
    s?.setItem(`${PREFIX}${userId}.${key}`, "1");
  } catch {
    /* storage blocked: the tip may show again next visit, which is harmless */
  }
}

export function clearSeen(userId: string, keyPrefix = "", s: Store | null = store()): void {
  if (!s) return;
  try {
    const start = `${PREFIX}${userId}.${keyPrefix}`;
    const doomed: string[] = [];
    for (let i = 0; i < s.length; i++) {
      const k = s.key(i);
      if (k && k.startsWith(start)) doomed.push(k);
    }
    doomed.forEach((k) => s.removeItem(k));
  } catch {
    /* ignore */
  }
}
