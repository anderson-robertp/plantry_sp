import { describe, expect, it } from "@jest/globals";
import { packageInput } from "../validation/ingredient.js";
import { packageFitsType, packageSizeInBase } from "../utils/packages.js";
import { CATALOG_PACKAGES, withPackages } from "./catalogPackages.js";
import { GLOBAL_INGREDIENTS } from "./globalIngredients.js";
import { buildPackageOps, buildSeedOps, toDocument } from "./seedOps.js";

const byName = new Map(GLOBAL_INGREDIENTS.map((i) => [i.name, i]));

describe("catalog package sizes", () => {
  it("only name ingredients that are in the catalog (guards against typos)", () => {
    const unknown = Object.keys(CATALOG_PACKAGES).filter((n) => !byName.has(n));
    expect(unknown).toEqual([]);
  });

  it("pass the same validation the API applies", () => {
    for (const [name, p] of Object.entries(CATALOG_PACKAGES)) {
      const res = packageInput.safeParse(p);
      if (!res.success) throw new Error(`${name}: ${res.error.issues[0]?.message}`);
    }
  });

  it("use the same kind of unit as the ingredient", () => {
    for (const [name, p] of Object.entries(CATALOG_PACKAGES)) {
      const ing = byName.get(name);
      if (!ing || !packageFitsType(p, ing.baseUnitType)) throw new Error(`${name}: ${p.unit} does not fit`);
    }
  });

  it("are plausible sizes (a shelf item holds between a few grams and about 5 kg)", () => {
    for (const [name, p] of Object.entries(CATALOG_PACKAGES)) {
      const ing = byName.get(name);
      if (!ing) continue;
      const base = packageSizeInBase(p);
      if (ing.baseUnitType === "count") {
        expect(base >= 3 && base <= 30).toBe(true);
      } else {
        // ml or g
        if (!(base >= 15 && base <= 5000)) throw new Error(`${name}: ${base} is out of range`);
      }
    }
  });

  it("labels are lowercase single words", () => {
    for (const p of Object.values(CATALOG_PACKAGES)) expect(p.label).toMatch(/^[a-z]+$/);
  });

  it("cover most of the catalog", () => {
    expect(Object.keys(CATALOG_PACKAGES).length / GLOBAL_INGREDIENTS.length).toBeGreaterThan(0.7);
  });
});

describe("seeding packages", () => {
  const items = withPackages();

  it("attaches the package to the stored document", () => {
    const beans = items.find((i) => i.name === "Black beans");
    expect(beans && toDocument(beans).package).toEqual({ label: "can", size: 15, unit: "oz" });
    const water = items.find((i) => i.name === "Water");
    expect(water && "package" in toDocument(water)).toBe(false);
  });

  it("new entries are inserted with their package", () => {
    const ops = buildSeedOps(items);
    const flour = ops.find((o) => o.updateOne.filter.normalizedName === "all-purpose flour");
    expect(JSON.stringify(flour?.updateOne.update)).toContain('"package":{"label":"bag","size":5,"unit":"lb"}');
  });

  it("fills in packages only where none is set, creating nothing", () => {
    const ops = buildPackageOps(items);
    expect(ops.length).toBe(Object.keys(CATALOG_PACKAGES).length);
    for (const op of ops) {
      expect(op.updateOne.filter.package).toEqual({ $exists: false });
      expect(op.updateOne.filter.householdId).toEqual({ $exists: false });
      expect("upsert" in op.updateOne).toBe(false);
    }
  });
});
