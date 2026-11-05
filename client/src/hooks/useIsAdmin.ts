import { useAuth } from "../auth/AuthContext";
import { api } from "../lib/client";
import { useAsync } from "./useAsync";

/**
 * Whether the signed-in user is an admin (their email is in the server's ADMIN_EMAILS). False
 * while loading and on any error, so the Admin tab never shows by accident. The server checks
 * again on every admin request; this only decides what to show.
 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const { user } = useAuth();
  const { data, loading } = useAsync(
    () => (user ? api.get<{ isAdmin: boolean }>("/api/admin/status") : Promise.resolve({ isAdmin: false })),
    [user?.id]
  );
  return { isAdmin: data?.isAdmin === true, loading };
}
