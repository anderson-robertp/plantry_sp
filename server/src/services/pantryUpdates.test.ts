import { describe, expect, it } from "@jest/globals";
import { consumePipeline, restorePipeline } from "./pantryUpdates.js";

/**
 * A tiny evaluator for exactly the aggregation operators the pipelines use, so the arithmetic can
 * be tested without a database. (It checks the logic of the expressions; MongoDB runs them.)
 */
type Doc = { quantity: number; baseQuantity: number };
function ev(expr: unknown, doc: Doc): number | boolean {
  if (typeof expr === "number") return expr;
  if (typeof expr === "string") {
    if (!expr.startsWith("$")) throw new Error(`unsupported string ${expr}`);
    const v = (doc as Record<string, number | undefined>)[expr.slice(1)];
    if (v === undefined) throw new Error(`missing field ${expr}`);
    return v;
  }
  const [op, args] = Object.entries(expr as Record<string, unknown[]>)[0] as [string, unknown[]];
  const n = (i: number) => ev(args[i], doc) as number;
  switch (op) {
    case "$add": return args.reduce<number>((a, _, i) => a + n(i), 0);
    case "$subtract": return n(0) - n(1);
    case "$multiply": return n(0) * n(1);
    case "$divide": return n(0) / n(1);
    case "$max": return Math.max(...args.map((_, i) => n(i)));
    case "$gt": return n(0) > n(1);
    case "$cond": return ev(args[0], doc) ? ev(args[1], doc) : ev(args[2], doc);
    default: throw new Error(`unsupported operator ${op}`);
  }
}
function apply(pipeline: { $set: Record<string, unknown> }[], doc: Doc): Doc {
  const out = { ...doc };
  for (const [field, expr] of Object.entries(pipeline[0]!.$set)) out[field as keyof Doc] = ev(expr, doc) as number; // all read the OLD doc
  return out;
}

describe("consumePipeline", () => {
  it("removes base units and scales the entered quantity by the same ratio", () => {
    // 2 cups = 473.176 ml-equivalent grams; take a quarter of it
    const row = { quantity: 2, baseQuantity: 1000 };
    const out = apply(consumePipeline(250), row);
    expect(out.baseQuantity).toBe(750);
    expect(out.quantity).toBeCloseTo(1.5, 10);
  });

  it("taking everything leaves exactly zero in both fields", () => {
    const out = apply(consumePipeline(1000), { quantity: 2, baseQuantity: 1000 });
    expect(out).toEqual({ quantity: 0, baseQuantity: 0 });
  });

  it("taking more than is there floors at zero instead of going negative", () => {
    const out = apply(consumePipeline(5000), { quantity: 2, baseQuantity: 1000 });
    expect(out.baseQuantity).toBe(0);
    expect(out.quantity).toBe(0);
  });

  it("a row already at zero stays put without dividing by zero", () => {
    const out = apply(consumePipeline(10), { quantity: 0, baseQuantity: 0 });
    expect(out).toEqual({ quantity: 0, baseQuantity: 0 });
  });

  it("the ratio between quantity and baseQuantity is preserved", () => {
    const row = { quantity: 6, baseQuantity: 300 }; // 50 base units per entered unit
    const out = apply(consumePipeline(120), row);
    expect(out.baseQuantity / out.quantity).toBeCloseTo(50, 10);
  });
});

describe("restorePipeline", () => {
  it("adds both amounts back", () => {
    const out = apply(restorePipeline(250, 0.5), { quantity: 1.5, baseQuantity: 750 });
    expect(out).toEqual({ quantity: 2, baseQuantity: 1000 });
  });

  it("consume then restore returns the original row", () => {
    const row = { quantity: 2, baseQuantity: 1000 };
    const after = apply(consumePipeline(250), row);
    const back = apply(restorePipeline(250, 0.5), after);
    expect(back.baseQuantity).toBe(1000);
    expect(back.quantity).toBeCloseTo(2, 10);
  });
});
