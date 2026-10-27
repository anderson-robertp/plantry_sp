/** One problem the API found with a field, as sent in a 422 response. */
export interface ApiIssue {
  path: (string | number)[];
  message: string;
}

/** Every failed request becomes one of these, so screens handle errors one way. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues: ApiIssue[];

  constructor(status: number, code: string, message: string, issues: ApiIssue[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = issues;
  }
}

/** Field name to message, for showing errors under inputs. Nested paths join with dots ("ingredients.0.quantity"). */
export function fieldErrors(error: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (error instanceof ApiError) {
    for (const issue of error.issues) {
      const key = issue.path.join(".");
      if (key && !(key in out)) out[key] = issue.message;
    }
  }
  return out;
}

/** A sentence safe to show a person. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "Can't reach the server. Check your connection and try again.";
    if (error.status >= 500) return "Something went wrong on our side. Try again in a moment.";
    return error.message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

export type Query = Record<string, string | number | boolean | undefined>;

export interface ApiOptions {
  baseUrl: string;
  getToken: () => string | null;
  /** Called when the server says the sign-in is no longer valid. */
  onUnauthorized: () => void;
  fetchImpl?: typeof fetch;
}

export function createApi(opts: ApiOptions) {
  const doFetch = opts.fetchImpl ?? ((...args: Parameters<typeof fetch>) => fetch(...args));

  function url(path: string, query?: Query): string {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query ?? {})) {
      if (v !== undefined && v !== "") qs.set(k, String(v));
    }
    const s = qs.toString();
    return `${opts.baseUrl.replace(/\/$/, "")}${path}${s ? `?${s}` : ""}`;
  }

  async function request<T>(method: string, path: string, body?: unknown, query?: Query): Promise<T> {
    const token = opts.getToken();
    let res: Response;
    try {
      res = await doFetch(url(path, query), {
        method,
        headers: {
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
    } catch {
      throw new ApiError(0, "network", "Can't reach the server.");
    }

    const text = await res.text();
    let data: unknown;
    try {
      data = text ? JSON.parse(text) : undefined;
    } catch {
      data = undefined;
    }

    if (!res.ok) {
      const e = (data as { error?: { code?: string; message?: string; issues?: ApiIssue[] } } | undefined)?.error;
      // a rejected token on any call except sign-in itself means the session is over
      if (res.status === 401 && !path.startsWith("/api/auth/login") && !path.startsWith("/api/auth/register")) {
        opts.onUnauthorized();
      }
      throw new ApiError(
        res.status,
        e?.code ?? "error",
        e?.message ?? `Request failed (${res.status})`,
        Array.isArray(e?.issues) ? e.issues : []
      );
    }
    return data as T;
  }

  return {
    get: <T>(path: string, query?: Query) => request<T>("GET", path, undefined, query),
    post: <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {}),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
    del: <T>(path: string) => request<T>("DELETE", path),
  };
}

export type Api = ReturnType<typeof createApi>;
