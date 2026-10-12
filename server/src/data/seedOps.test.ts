import { GLOBAL_INGREDIENTS } from "./globalIngredients.js";
import { buildSeedOps, toDocument } from "./seedOps.js";
import { describe, expect, it } from "@jest/globals";

describe("toDocument", () => {
  it("sets normalizedName, clean aliases and an explicit staple flag", () => {
    const doc = toDocument({
      name: "Jalapeño", category: "produce", baseUnitType: "count", defaultUnit: "piece",
      gramsPerPiece: 14, aliases: ["Jalapeno", "JALAPEÑO", "Chile Pepper", "chile  pepper"],
    });
    expect(doc.normalizedName).toBe("jalapeno");
    expect(doc.aliases).toEqual(["chile pepper"]); // own name dropped, duplicates merged
    expect(doc.isStaple).toBe(false);
    expect(doc.gramsPerPiece).toBe(14);
  });

  it("omits numbers it wasn't given instead of writing undefined", () => {
    const doc = toDocument({ name: "Pasta", category: "grains", baseUnitType: "mass", defaultUnit: "lb" });
    expect("gramsPerMl" in doc).toBe(false);
    expect("gramsPerPiece" in doc).toBe(false);
  });
});

describe("buildSeedOps", () => {
  it("makes one upsert per entry, matched on the shared catalog only", () => {
    const ops = buildSeedOps(GLOBAL_INGREDIENTS);
    expect(ops).toHaveLength(GLOBAL_INGREDIENTS.length);
    const first = ops[0]!.updateOne;
    expect(first.upsert).toBe(true);
    expect(first.filter).toEqual({ normalizedName: "yellow onion", householdId: { $exists: false } });
  });

  it("inserts only by default, so hand-corrected values survive a re-run", () => {
    const { update } = buildSeedOps(GLOBAL_INGREDIENTS)[0]!.updateOne;
    expect(Object.keys(update)).toEqual(["$setOnInsert"]);
  });

  it("overwrites with update: true", () => {
    const { update } = buildSeedOps(GLOBAL_INGREDIENTS, { update: true })[0]!.updateOne;
    expect(Object.keys(update)).toEqual(["$set"]);
  });

  it("never writes a householdId", () => {
    for (const op of buildSeedOps(GLOBAL_INGREDIENTS, { update: true })) {
      const body = Object.values(op.updateOne.update)[0] as Record<string, unknown>;
      expect("householdId" in body).toBe(false);
    }
  });
});
