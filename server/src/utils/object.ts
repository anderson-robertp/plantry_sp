/**
 * Return a copy of `obj` without keys whose value is `undefined`.
 *
 * Why: with `exactOptionalPropertyTypes`, Mongoose's `create()` / `$set` types
 * reject `{ description: undefined }` (zod's optional fields produce exactly
 * that shape). Passing input through this helper drops those keys, and the
 * return type removes `undefined` from each property so the types line up.
 */
export function omitUndefined<T extends object>(obj: T): { [K in keyof T]: Exclude<T[K], undefined> } {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as { [K in keyof T]: Exclude<T[K], undefined> };
}
