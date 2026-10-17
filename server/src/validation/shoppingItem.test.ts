import { describe, expect, it } from "@jest/globals";
import { createCustomItemInput, customItemParams, updateCustomItemInput, updateGeneratedItemInput } from "./shoppingItem.js";

const id = "64b7f0c2a1b2c3d4e5f60718";

describe("createCustomItemInput", () => {
  it("needs only a name; trims it", () => {
    expect(createCustomItemInput.parse({ name: "  Paper towels " })).toEqual({ name: "Paper towels" });
  });
  it("accepts quantity, a unit in any spelling, category and note", () => {
    expect(createCustomItemInput.parse({ name: "Milk", quantity: 2, unit: "Cups", category: "dairy", note: "oat" })).toEqual({
      name: "Milk", quantity: 2, unit: "cup", category: "dairy", note: "oat",
    });
  });
  it("rejects blank names, bad quantities, unknown units/categories, and a unit without a quantity", () => {
    for (const bad of [{}, { name: "  " }, { name: "x", quantity: 0 }, { name: "x", quantity: -1 }, { name: "x", quantity: "2" }, { name: "x", quantity: 1, unit: "bushel" }, { name: "x", category: "bakery" }, { name: "x", unit: "g" }, { name: "x".repeat(101) }]) {
      expect(createCustomItemInput.safeParse(bad).success).toBe(false);
    }
  });
  it("ignores unknown keys such as checked", () => {
    expect("checked" in createCustomItemInput.parse({ name: "x", checked: true })).toBe(false);
  });
});

describe("updateCustomItemInput", () => {
  it("accepts any single field, and null to clear quantity, unit or note", () => {
    for (const ok of [{ name: "y" }, { checked: true }, { quantity: null }, { unit: null }, { note: null }, { category: "snacks" }]) {
      expect(updateCustomItemInput.safeParse(ok).success).toBe(true);
    }
  });
  it("rejects an empty patch, a null name, and bad values", () => {
    for (const bad of [{}, { name: null }, { name: "" }, { checked: "yes" }, { quantity: 0 }]) {
      expect(updateCustomItemInput.safeParse(bad).success).toBe(false);
    }
  });
});

describe("updateGeneratedItemInput", () => {
  it("accepts a check mark, a note, or quantity with unit", () => {
    for (const ok of [{ checked: false }, { note: "organic" }, { note: null }, { quantity: 2, unit: "lb" }]) {
      expect(updateGeneratedItemInput.safeParse(ok).success).toBe(true);
    }
  });
  it("needs at least one field, and quantity and unit together", () => {
    for (const bad of [{}, { quantity: 2 }, { unit: "lb" }, { quantity: 0, unit: "lb" }]) {
      expect(updateGeneratedItemInput.safeParse(bad).success).toBe(false);
    }
  });
});

describe("customItemParams", () => {
  it("requires two ObjectIds", () => {
    expect(customItemParams.safeParse({ planId: id, itemId: id }).success).toBe(true);
    expect(customItemParams.safeParse({ planId: id, itemId: "nope" }).success).toBe(false);
  });
});
