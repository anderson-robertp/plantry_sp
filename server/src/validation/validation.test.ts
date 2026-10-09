import { idParams } from "./common.js";
import { createPantryItemInput, updatePantryItemInput } from "./pantry.js";
import { createRecipeInput, updateRecipeInput } from "./recipe.js";
import { describe, expect, it } from "@jest/globals";

const ID = "A1".repeat(12); // uppercase hex on purpose
const ID_LOWER = ID.toLowerCase();

const validLine = { ingredientId: ID, quantity: 2, unit: "cups" };
const validRecipe = { name: "Pancakes", servings: 4, ingredients: [validLine] };

describe("recipe input", () => {
  it("normalizes units and ids", () => {
    const out = createRecipeInput.parse({
      ...validRecipe,
      ingredients: [{ ...validLine, unit: "Tbsp." }],
    });
    expect(out.ingredients[0]?.unit).toBe("tbsp");
    expect(out.ingredients[0]?.ingredientId).toBe(ID_LOWER);
  });

  it("rejects unknown units", () => {
    const res = createRecipeInput.safeParse({
      ...validRecipe,
      ingredients: [{ ...validLine, unit: "handful" }],
    });
    expect(res.success).toBe(false);
  });

  it("strips a client-supplied baseQuantity", () => {
    const out = createRecipeInput.parse({
      ...validRecipe,
      ingredients: [{ ...validLine, baseQuantity: 999999 }],
    });
    expect(out.ingredients[0]).not.toHaveProperty("baseQuantity");
  });

  it("rejects negative quantities, bad ids, and empty ingredient lists", () => {
    expect(
      createRecipeInput.safeParse({
        ...validRecipe,
        ingredients: [{ ...validLine, quantity: -1 }],
      }).success
    ).toBe(false);
    expect(
      createRecipeInput.safeParse({
        ...validRecipe,
        ingredients: [{ ...validLine, ingredientId: "nope" }],
      }).success
    ).toBe(false);
    expect(createRecipeInput.safeParse({ ...validRecipe, ingredients: [] }).success).toBe(false);
  });

  it("trims and lowercases tags", () => {
    const out = createRecipeInput.parse({ ...validRecipe, tags: ["  Vegan ", "QUICK"] });
    expect(out.tags).toEqual(["vegan", "quick"]);
  });

  it("does not invent defaults for steps/tags/optional", () => {
    const out = createRecipeInput.parse(validRecipe);
    expect(out.steps).toBeUndefined();
    expect(out.tags).toBeUndefined();
    expect(out.ingredients[0]?.optional).toBeUndefined();
  });
});

describe("recipe update input", () => {
  it("rejects an empty update", () => {
    expect(updateRecipeInput.safeParse({}).success).toBe(false);
  });

  it("accepts a partial update without adding defaults", () => {
    const out = updateRecipeInput.parse({ name: "Better pancakes" });
    expect(out).toEqual({ name: "Better pancakes" });
  });

  it("still validates ingredient lines when they are sent", () => {
    expect(
      updateRecipeInput.safeParse({ ingredients: [{ ...validLine, unit: "handful" }] }).success
    ).toBe(false);
    const ok = updateRecipeInput.parse({ ingredients: [validLine] });
    expect(ok.ingredients?.[0]?.unit).toBe("cup");
  });
});

describe("pantry input", () => {
  const base = { ingredientId: ID, quantity: 1, unit: "Pounds" };

  it("normalizes unit and coerces the expiry date", () => {
    const out = createPantryItemInput.parse({ ...base, expirationDate: "2026-10-20" });
    expect(out.unit).toBe("lb");
    expect(out.expirationDate).toBeInstanceOf(Date);
    expect(out.ingredientId).toBe(ID_LOWER);
  });

  it("rejects bad locations, bad dates, and negative quantities", () => {
    expect(createPantryItemInput.safeParse({ ...base, location: "garage" }).success).toBe(false);
    expect(createPantryItemInput.safeParse({ ...base, expirationDate: "soon" }).success).toBe(
      false
    );
    expect(createPantryItemInput.safeParse({ ...base, quantity: -5 }).success).toBe(false);
  });

  it("accepts known locations", () => {
    for (const location of ["pantry", "fridge", "freezer"]) {
      expect(createPantryItemInput.safeParse({ ...base, location }).success).toBe(true);
    }
  });

  it("update: rejects empty, ignores ingredientId, allows partial", () => {
    expect(updatePantryItemInput.safeParse({}).success).toBe(false);
    const out = updatePantryItemInput.parse({ quantity: 3, ingredientId: ID });
    expect(out).toEqual({ quantity: 3 });
    expect(updatePantryItemInput.parse({ unit: "kg" })).toEqual({ unit: "kg" });
  });
});

describe("idParams", () => {
  it("accepts and lowercases an ObjectId string", () => {
    expect(idParams.parse({ id: ID })).toEqual({ id: ID_LOWER });
  });

  it("rejects anything else", () => {
    expect(idParams.safeParse({ id: "123" }).success).toBe(false);
    expect(idParams.safeParse({}).success).toBe(false);
  });
});
