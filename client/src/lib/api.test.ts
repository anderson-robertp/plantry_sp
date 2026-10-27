import { describe, expect, it } from "vitest";
import { ApiError, createApi, fieldErrors, messageOf } from "./api";

function fakeFetch(handler: (url: string, init: RequestInit) => { status: number; body?: unknown } | Error) {
  const calls: { url: string; init: RequestInit }[] = [];
  const impl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const out = handler(url, init);
    if (out instanceof Error) throw out;
    const text = out.body === undefined ? "" : typeof out.body === "string" ? out.body : JSON.stringify(out.body);
    return { ok: out.status >= 200 && out.status < 300, status: out.status, text: async () => text } as Response;
  }) as unknown as typeof fetch;
  return { impl, calls };
}

function make(f: ReturnType<typeof fakeFetch>, token: string | null = "tok") {
  let unauthorized = 0;
  const api = createApi({ baseUrl: "https://api.test/", getToken: () => token, onUnauthorized: () => unauthorized++, fetchImpl: f.impl });
  return { api, unauthorized: () => unauthorized };
}

describe("createApi", () => {
  it("sends the token and a JSON body, and builds the URL without double slashes", async () => {
    const f = fakeFetch(() => ({ status: 201, body: { ok: true } }));
    const { api } = make(f);
    expect(await api.post("/api/x", { a: 1 })).toEqual({ ok: true });
    const call = f.calls[0]!;
    expect(call.url).toBe("https://api.test/api/x");
    expect(call.init.method).toBe("POST");
    expect(call.init.body).toBe('{"a":1}');
    expect(call.init.headers).toMatchObject({ Authorization: "Bearer tok", "Content-Type": "application/json" });
  });

  it("skips the Authorization header when signed out and sends no body on GET", async () => {
    const f = fakeFetch(() => ({ status: 200, body: [] }));
    const { api } = make(f, null);
    await api.get("/api/x");
    const call = f.calls[0]!;
    expect(call.init.headers).toEqual({});
    expect(call.init.body).toBeUndefined();
  });

  it("adds query parameters, dropping empty and undefined ones", async () => {
    const f = fakeFetch(() => ({ status: 200, body: {} }));
    const { api } = make(f);
    await api.get("/api/x", { search: "to ma", limit: 8, today: undefined, empty: "", flag: false });
    expect(f.calls[0]!.url).toBe("https://api.test/api/x?search=to+ma&limit=8&flag=false");
  });

  it("returns undefined for 204 and for an empty body", async () => {
    const f = fakeFetch(() => ({ status: 204 }));
    expect(await make(f).api.del("/api/x/1")).toBeUndefined();
  });

  it("turns the API's error format into an ApiError with field issues", async () => {
    const f = fakeFetch(() => ({
      status: 422,
      body: { error: { code: "validation_error", message: "Invalid", issues: [{ path: ["ingredients", 0, "quantity"], message: "Too small" }, { path: ["name"], message: "Required" }] } },
    }));
    const err = await make(f).api.post("/api/x", {}).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    const e = err as ApiError;
    expect([e.status, e.code, e.message]).toEqual([422, "validation_error", "Invalid"]);
    expect(fieldErrors(e)).toEqual({ "ingredients.0.quantity": "Too small", name: "Required" });
  });

  it("copes with an error that isn't JSON", async () => {
    const f = fakeFetch(() => ({ status: 502, body: "<html>Bad gateway</html>" }));
    const e = (await make(f).api.get("/api/x").catch((x: unknown) => x)) as ApiError;
    expect([e.status, e.code]).toEqual([502, "error"]);
    expect(messageOf(e)).toMatch(/our side/);
  });

  it("reports a network failure as status 0", async () => {
    const f = fakeFetch(() => new Error("offline"));
    const e = (await make(f).api.get("/api/x").catch((x: unknown) => x)) as ApiError;
    expect(e.status).toBe(0);
    expect(messageOf(e)).toMatch(/Can't reach the server/);
  });

  it("signs out on a 401 from a normal call but not from login or register", async () => {
    const f = fakeFetch(() => ({ status: 401, body: { error: { code: "unauthenticated", message: "Authentication required" } } }));
    const m = make(f);
    await m.api.get("/api/households").catch(() => undefined);
    expect(m.unauthorized()).toBe(1);
    await m.api.post("/api/auth/login", {}).catch(() => undefined);
    await m.api.post("/api/auth/register", {}).catch(() => undefined);
    expect(m.unauthorized()).toBe(1);
  });
});

describe("fieldErrors and messageOf", () => {
  it("keep the first message per field and ignore other errors", () => {
    const e = new ApiError(422, "validation_error", "x", [{ path: ["a"], message: "first" }, { path: ["a"], message: "second" }, { path: [], message: "root" }]);
    expect(fieldErrors(e)).toEqual({ a: "first" });
    expect(fieldErrors(new Error("x"))).toEqual({});
  });
  it("shows the server's message for client errors", () => {
    expect(messageOf(new ApiError(409, "email_taken", "A user with that email already exists"))).toBe("A user with that email already exists");
  });
});
