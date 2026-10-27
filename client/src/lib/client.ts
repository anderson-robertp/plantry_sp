import { createApi } from "./api";
import { tokenStore } from "./token";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;

/** Set VITE_API_URL to your API. Empty means same origin (useful behind a dev proxy). */
export const API_URL = env?.VITE_API_URL ?? "";

let unauthorizedHandler: () => void = () => {};
/** The auth provider registers itself here so a 401 anywhere signs the user out. */
export function setUnauthorizedHandler(fn: () => void): void {
  unauthorizedHandler = fn;
}

export const api = createApi({
  baseUrl: API_URL,
  getToken: tokenStore.get,
  onUnauthorized: () => unauthorizedHandler(),
});
