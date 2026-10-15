import { describe, expect, it } from "@jest/globals";
import { planConsumption, type PantryBatch } from "./planConsumption.js";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const batch = (id: string, ingredientId: string, baseQuantity: number, extra: Partial<PantryBatch> = {}): PantryBatch => ({
  id, ingredientId, baseQuantity, ...extra,
});
const NOW = d("2026-10-15");

describe("planConsumption: basics", () => {
  it("takes from a single batch and leaves the rest", () => {
    const out = planConsumption([{ ingredientId: "flour", baseQuantity: 250 }], [batch("b1", "flour", 1000)]);
    expect(out.takes).toEqual([{ batchId: "b1", ingredientId: "flour", take: 250 }]);
    expect(out.shortfalls).toEqual([]);
  });

  it("takes exactly a whole batch", () => {
    const out = planConsumption([{ ingredientId: "egg", baseQuantity: 6 }], [batch("b1", "egg", 6)]);
    expect(out.takes).toEqual([{ batchId: "b1", ingredientId: "egg", take: 6 }]);
    expect(out.shortfalls).toEqual([]);
  });

  it("spans batches and ignores other ingredients", () => {
    const out = planConsumption(
      [{ ingredientId: "flour", baseQuantity: 300 }],
      [batch("a", "flour", 200), batch("m", "milk", 999), batch("b", "flour", 500)]
    );
    expect(out.takes.map((t) => [t.batchId, t.take])).toEqual([["a", 200], ["b", 100]]);
  });

  it("handles several ingredients, in the order the needs were given", () => {
    const out = planConsumption(
      [{ ingredientId: "milk", baseQuantity: 100 }, { ingredientId: "flour", baseQuantity: 50 }],
      [batch("f", "flour", 500), batch("m", "milk", 500)]
    );
    expect(out.takes.map((t) => t.ingredientId)).toEqual(["milk", "flour"]);
  });

  it("merges repeated needs for one ingredient", () => {
    const out = planConsumption(
      [{ ingredientId: "flour", baseQuantity: 100 }, { ingredientId: "flour", baseQuantity: 150 }],
      [batch("b", "flour", 1000)]
    );
    expect(out.takes).toEqual([{ batchId: "b", ingredientId: "flour", take: 250 }]);
  });
});

describe("planConsumption: which batch first", () => {
  it("soonest-expiring first, then no-expiry, then already-expired", () => {
    const batches = [
      batch("none", "x", 10),
      batch("expired", "x", 10, { expirationDate: d("2026-10-01") }),
      batch("late", "x", 10, { expirationDate: d("2026-12-01") }),
      batch("soon", "x", 10, { expirationDate: d("2026-10-16") }),
    ];
    const out = planConsumption([{ ingredientId: "x", baseQuantity: 40 }], batches, { asOf: NOW });
    expect(out.takes.map((t) => t.batchId)).toEqual(["soon", "late", "none", "expired"]);
  });

  it("a batch expiring today still counts as fresh", () => {
    const out = planConsumption(
      [{ ingredientId: "x", baseQuantity: 5 }],
      [batch("old", "x", 10, { expirationDate: d("2026-10-14") }), batch("today", "x", 10, { expirationDate: d("2026-10-15") })],
      { asOf: NOW }
    );
    expect(out.takes[0]?.batchId).toBe("today");
  });

  it("without asOf nothing counts as expired", () => {
    const out = planConsumption(
      [{ ingredientId: "x", baseQuantity: 5 }],
      [batch("a", "x", 10, { expirationDate: d("2020-01-01") }), batch("b", "x", 10, { expirationDate: d("2026-01-01") })]
    );
    expect(out.takes[0]?.batchId).toBe("a");
  });

  it("ties go to the older batch, then to the id", () => {
    const out = planConsumption(
      [{ ingredientId: "x", baseQuantity: 5 }],
      [batch("new", "x", 10, { createdAt: d("2026-10-10") }), batch("old", "x", 10, { createdAt: d("2026-10-01") })]
    );
    expect(out.takes[0]?.batchId).toBe("old");
    const same = planConsumption([{ ingredientId: "x", baseQuantity: 5 }], [batch("b", "x", 10), batch("a", "x", 10)]);
    expect(same.takes[0]?.batchId).toBe("a");
  });
});

describe("planConsumption: not enough in the pantry", () => {
  it("takes everything there is and reports the gap", () => {
    const out = planConsumption([{ ingredientId: "flour", baseQuantity: 500 }], [batch("b", "flour", 200)]);
    expect(out.takes).toEqual([{ batchId: "b", ingredientId: "flour", take: 200 }]);
    expect(out.shortfalls).toEqual([{ ingredientId: "flour", missing: 300 }]);
  });

  it("an ingredient with no batches is all shortfall", () => {
    const out = planConsumption([{ ingredientId: "butter", baseQuantity: 57 }], []);
    expect(out.takes).toEqual([]);
    expect(out.shortfalls).toEqual([{ ingredientId: "butter", missing: 57 }]);
  });

  it("reports only the short ingredients", () => {
    const out = planConsumption(
      [{ ingredientId: "flour", baseQuantity: 100 }, { ingredientId: "milk", baseQuantity: 100 }],
      [batch("f", "flour", 500), batch("m", "milk", 40)]
    );
    expect(out.shortfalls).toEqual([{ ingredientId: "milk", missing: 60 }]);
  });
});

describe("planConsumption: bad input and numeric safety", () => {
  it("ignores zero, negative and non-finite needs and batches", () => {
    const out = planConsumption(
      [
        { ingredientId: "a", baseQuantity: 0 },
        { ingredientId: "b", baseQuantity: -5 },
        { ingredientId: "c", baseQuantity: Number.NaN },
        { ingredientId: "d", baseQuantity: 10 },
      ],
      [batch("bad1", "d", 0), batch("bad2", "d", -3), batch("bad3", "d", Number.NaN), batch("ok", "d", 10)]
    );
    expect(out.takes).toEqual([{ batchId: "ok", ingredientId: "d", take: 10 }]);
    expect(out.shortfalls).toEqual([]);
  });

  it("float noise is not a shortfall (0.1 + 0.2 against 0.3)", () => {
    const out = planConsumption(
      [{ ingredientId: "x", baseQuantity: 0.1 }, { ingredientId: "x", baseQuantity: 0.2 }],
      [batch("b", "x", 0.3)]
    );
    expect(out.shortfalls).toEqual([]);
  });

  it("never produces a negative or -0 take", () => {
    const out = planConsumption([{ ingredientId: "x", baseQuantity: 1e-9 }], [batch("b", "x", 5)]);
    for (const t of out.takes) expect(Object.is(t.take, -0) || t.take <= 0).toBe(false);
  });

  it("does not modify its inputs", () => {
    const needs = [{ ingredientId: "x", baseQuantity: 5 }];
    const batches = [batch("b", "x", 10)];
    const before = JSON.stringify([needs, batches]);
    planConsumption(needs, batches);
    expect(JSON.stringify([needs, batches])).toBe(before);
  });
});
