import { describe, expect, it } from "@jest/globals";
import { createHouseholdWithinLimit, type OwnershipStore } from "./householdLimits.js";

interface H { _id: string; name: string }

/** In-memory store. `counts` overrides what countOwned reports, call by call, to simulate races. */
function fakeStore(opts: { counts?: number[]; addOwnerFails?: boolean; removeFails?: boolean } = {}) {
  const log = { households: [] as H[], owners: [] as [string, string][], removed: [] as string[], countCalls: 0 };
  const store: OwnershipStore<H> = {
    countOwned: async () => {
      const i = log.countCalls++;
      return opts.counts ? (opts.counts[i] ?? opts.counts[opts.counts.length - 1] ?? 0) : log.owners.length;
    },
    createHousehold: async (name) => {
      const h = { _id: `h${log.households.length + 1}`, name };
      log.households.push(h);
      return h;
    },
    addOwner: async (id, userId) => {
      if (opts.addOwnerFails) throw new Error("insert failed");
      log.owners.push([id, userId]);
    },
    remove: async (id) => {
      log.removed.push(id);
      if (opts.removeFails) throw new Error("cleanup failed");
    },
  };
  return { store, log };
}

const fail = async (p: Promise<unknown>) => {
  try { await p; } catch (e) { return e as { status?: number; code?: string; message: string; details?: unknown }; }
  throw new Error("expected a rejection");
};

describe("createHouseholdWithinLimit", () => {
  it("creates the first household on a limit of 1", async () => {
    const { store, log } = fakeStore();
    const h = await createHouseholdWithinLimit(store, "Home", "u1", 1);
    expect(h.name).toBe("Home");
    expect(log.owners).toEqual([["h1", "u1"]]);
    expect(log.removed).toEqual([]);
  });

  it("refuses a second household at the limit, before creating anything", async () => {
    const { store, log } = fakeStore({ counts: [1] });
    const err = await fail(createHouseholdWithinLimit(store, "Second", "u1", 1));
    expect(err.status).toBe(403);
    expect(err.code).toBe("plan_limit_reached");
    expect(err.message).toBe("Your plan allows 1 household. Upgrade to create more.");
    expect(err.details).toEqual({ limit: 1, current: 1 });
    expect(log.households).toHaveLength(0);
  });

  it("pluralizes and allows up to the limit on a bigger plan", async () => {
    const { store } = fakeStore({ counts: [4, 5] });
    await expect(createHouseholdWithinLimit(store, "Fifth", "u1", 5)).resolves.toBeDefined();

    const { store: full } = fakeStore({ counts: [5] });
    const err = await fail(createHouseholdWithinLimit(full, "Sixth", "u1", 5));
    expect(err.message).toBe("Your plan allows 5 households. Upgrade to create more.");
  });

  it("a race: both requests pass the first check, the recount catches it and undoes the create", async () => {
    // before = 0 (passes), after = 2 (the other request also created one)
    const { store, log } = fakeStore({ counts: [0, 2] });
    const err = await fail(createHouseholdWithinLimit(store, "Racer", "u1", 1));
    expect(err.code).toBe("plan_limit_reached");
    expect(err.details).toEqual({ limit: 1, current: 1 });
    expect(log.removed).toEqual(["h1"]);
  });

  it("removes the household when adding the owner fails, and rethrows the original error", async () => {
    const { store, log } = fakeStore({ addOwnerFails: true });
    const err = await fail(createHouseholdWithinLimit(store, "Home", "u1", 1));
    expect(err.message).toBe("insert failed");
    expect(log.removed).toEqual(["h1"]);
  });

  it("a failed cleanup does not hide the real error", async () => {
    const { store } = fakeStore({ addOwnerFails: true, removeFails: true });
    const err = await fail(createHouseholdWithinLimit(store, "Home", "u1", 1));
    expect(err.message).toBe("insert failed");
  });

  it("limit 0 blocks everything", async () => {
    const { store, log } = fakeStore();
    const err = await fail(createHouseholdWithinLimit(store, "Home", "u1", 0));
    expect(err.code).toBe("plan_limit_reached");
    expect(log.households).toHaveLength(0);
  });
});
