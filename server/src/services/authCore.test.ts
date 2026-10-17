import { describe, expect, it } from "@jest/globals";
import { createAuthService, type AuthDeps, type UserRecord } from "./authCore.js";

function setup(opts: { users?: UserRecord[]; createThrows?: unknown } = {}) {
  const users = [...(opts.users ?? [])];
  const calls = { compare: [] as [string, string][], hashed: [] as string[], signed: [] as string[], dummy: 0 };
  const deps: AuthDeps = {
    findByEmail: async (e) => users.find((u) => u.email === e) ?? null,
    findById: async (id) => users.find((u) => u.id === id) ?? null,
    create: async (d) => {
      if (opts.createThrows) throw opts.createThrows;
      const u = { id: `u${users.length + 1}`, ...d };
      users.push(u);
      return u;
    },
    hash: async (p) => { calls.hashed.push(p); return `hash(${p})`; },
    compare: async (p, h) => { calls.compare.push([p, h]); return h === `hash(${p})`; },
    signToken: (id) => { calls.signed.push(id); return `token-for-${id}`; },
    isDuplicateKey: (e) => (e as { code?: number })?.code === 11000,
    dummyHash: async () => { calls.dummy++; return "hash(dummy-never-matches)"; },
  };
  return { svc: createAuthService(deps), users, calls };
}

const sam: UserRecord = { id: "u1", username: "Sam", email: "sam@example.com", passwordHash: "hash(secret-pass)" };
const fail = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return e as { status: number; code: string; message: string }; }
  throw new Error("expected a rejection");
};

describe("registerUser", () => {
  it("hashes the password, stores the hash, and returns a token and a public user", async () => {
    const { svc, users, calls } = setup();
    const out = await svc.registerUser("Sam", "sam@example.com", "secret-pass");
    expect(out).toEqual({ token: "token-for-u1", user: { id: "u1", name: "Sam", email: "sam@example.com" } });
    expect(users[0]?.passwordHash).toBe("hash(secret-pass)");
    expect(calls.hashed).toEqual(["secret-pass"]);
  });

  it("never puts the password or its hash in the result", async () => {
    const { svc } = setup();
    const json = JSON.stringify(await svc.registerUser("Sam", "sam@example.com", "secret-pass"));
    expect(json).not.toContain("secret-pass");
    expect(json).not.toContain("hash(");
  });

  it("an existing email is a 409 and nothing is created or hashed", async () => {
    const { svc, users, calls } = setup({ users: [sam] });
    const err = await fail(svc.registerUser("Other", "sam@example.com", "another-pass"));
    expect(err.status).toBe(409);
    expect(err.code).toBe("email_taken");
    expect(users).toHaveLength(1);
    expect(calls.hashed).toEqual([]);
  });

  it("a duplicate-key error from a simultaneous sign-up is also a 409", async () => {
    const { svc } = setup({ createThrows: { code: 11000 } });
    expect((await fail(svc.registerUser("Sam", "sam@example.com", "secret-pass"))).code).toBe("email_taken");
  });

  it("any other storage error is passed through unchanged", async () => {
    const boom = new Error("db down");
    const { svc } = setup({ createThrows: boom });
    await expect(svc.registerUser("Sam", "sam@example.com", "secret-pass")).rejects.toBe(boom);
  });
});

describe("loginUser", () => {
  it("returns a token and a public user for the right password", async () => {
    const { svc, calls } = setup({ users: [sam] });
    const out = await svc.loginUser("sam@example.com", "secret-pass");
    expect(out).toEqual({ token: "token-for-u1", user: { id: "u1", name: "Sam", email: "sam@example.com" } });
    expect(calls.signed).toEqual(["u1"]);
  });

  it("a wrong password is a 401 with no token", async () => {
    const { svc, calls } = setup({ users: [sam] });
    const err = await fail(svc.loginUser("sam@example.com", "wrong"));
    expect(err.status).toBe(401);
    expect(err.code).toBe("invalid_credentials");
    expect(calls.signed).toEqual([]);
  });

  it("an unknown email gives the identical error as a wrong password", async () => {
    const { svc } = setup({ users: [sam] });
    const unknown = await fail(svc.loginUser("nobody@example.com", "whatever"));
    const wrong = await fail(svc.loginUser("sam@example.com", "wrong"));
    expect(unknown).toEqual(wrong);
  });

  it("an unknown email still does a password comparison (against the dummy hash), so timing matches", async () => {
    const { svc, calls } = setup({ users: [sam] });
    await fail(svc.loginUser("nobody@example.com", "whatever"));
    expect(calls.compare).toEqual([["whatever", "hash(dummy-never-matches)"]]);
    expect(calls.dummy).toBe(1);
  });

  it("the dummy hash is not built when the user exists", async () => {
    const { svc, calls } = setup({ users: [sam] });
    await svc.loginUser("sam@example.com", "secret-pass");
    expect(calls.dummy).toBe(0);
  });
});

describe("getUserById", () => {
  it("returns the public shape without the hash", async () => {
    const { svc } = setup({ users: [sam] });
    const user = await svc.getUserById("u1");
    expect(user).toEqual({ id: "u1", name: "Sam", email: "sam@example.com" });
    expect("passwordHash" in user).toBe(false);
  });

  it("a token for a deleted account is a 401", async () => {
    const { svc } = setup();
    const err = await fail(svc.getUserById("ghost"));
    expect(err.status).toBe(401);
    expect(err.code).toBe("unauthenticated");
  });
});
