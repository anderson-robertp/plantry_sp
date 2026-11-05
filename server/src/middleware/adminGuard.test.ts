import { describe, expect, it } from "@jest/globals";
import type { Request, Response } from "express";
import { AppError } from "../utils/errors.js";
import { createRequireAdmin } from "./adminGuard.js";

const run = async (mw: ReturnType<typeof createRequireAdmin>, userId?: string) => {
  let seen: unknown = "not called";
  await mw({ userId } as Request, {} as Response, (err?: unknown) => {
    seen = err;
  });
  return seen;
};

describe("requireAdmin", () => {
  const admins = () => ["boss@example.com"];

  it("lets an admin through", async () => {
    const mw = createRequireAdmin({ emailOf: async () => "Boss@Example.com", admins });
    expect(await run(mw, "u1")).toBeUndefined();
  });

  it("refuses everyone else with 403", async () => {
    const mw = createRequireAdmin({ emailOf: async () => "other@example.com", admins });
    const err = await run(mw, "u1");
    expect(err).toBeInstanceOf(AppError);
    expect((err as AppError).status).toBe(403);
  });

  it("refuses when the account can't be found or the lookup fails", async () => {
    const gone = createRequireAdmin({ emailOf: async () => null, admins });
    expect((await run(gone, "u1") as AppError).status).toBe(403);
    const broken = createRequireAdmin({ emailOf: async () => { throw new Error("db down"); }, admins });
    expect((await run(broken, "u1") as AppError).status).toBe(403);
  });

  it("is a 401 when nobody is signed in", async () => {
    const mw = createRequireAdmin({ emailOf: async () => "boss@example.com", admins });
    expect((await run(mw) as AppError).status).toBe(401);
  });

  it("nobody is an admin while the list is empty", async () => {
    const mw = createRequireAdmin({ emailOf: async () => "boss@example.com", admins: () => [] });
    expect((await run(mw, "u1") as AppError).status).toBe(403);
  });

  it("notices a change to the list without restarting", async () => {
    let list: string[] = [];
    const mw = createRequireAdmin({ emailOf: async () => "boss@example.com", admins: () => list });
    expect((await run(mw, "u1") as AppError).status).toBe(403);
    list = ["boss@example.com"];
    expect(await run(mw, "u1")).toBeUndefined();
  });
});
