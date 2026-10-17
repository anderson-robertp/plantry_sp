import { describe, expect, it } from "@jest/globals";
import { customItemDoc, customPatchOps, generatedPatchOps, patchOps } from "./shoppingPatch.js";

describe("customItemDoc", () => {
  it("defaults the category and leaves unset fields out", () => {
    expect(customItemDoc({ name: "Candles" })).toEqual({ name: "Candles", category: "other", checked: false });
  });
  it("keeps what was given", () => {
    expect(customItemDoc({ name: "Milk", quantity: 2, unit: "l", category: "dairy", note: "oat" })).toEqual({
      name: "Milk", category: "dairy", checked: false, quantity: 2, unit: "l", note: "oat",
    });
  });
});

describe("patchOps", () => {
  it("sets values, unsets nulls, skips undefined, and prefixes the paths", () => {
    expect(patchOps("a.$.", { x: 1, y: null, z: undefined, w: false })).toEqual({
      $set: { "a.$.x": 1, "a.$.w": false },
      $unset: { "a.$.y": "" },
    });
  });
  it("omits an operator with nothing in it", () => {
    expect(patchOps("p.", { x: 1 })).toEqual({ $set: { "p.x": 1 } });
    expect(patchOps("p.", { x: null })).toEqual({ $unset: { "p.x": "" } });
    expect(patchOps("p.", {})).toEqual({});
  });
});

describe("customPatchOps", () => {
  it("clearing the quantity clears the unit too", () => {
    expect(customPatchOps({ quantity: null })).toEqual({ $unset: { "extraItems.$.quantity": "", "extraItems.$.unit": "" } });
  });
  it("changing quantity and unit sets both", () => {
    expect(customPatchOps({ quantity: 3, unit: "kg" })).toEqual({ $set: { "extraItems.$.quantity": 3, "extraItems.$.unit": "kg" } });
  });
  it("checking an item sets only checked", () => {
    expect(customPatchOps({ checked: true })).toEqual({ $set: { "extraItems.$.checked": true } });
  });
});

describe("generatedPatchOps", () => {
  it("a new quantity changes the displayed amount to buy and flags the item adjusted", () => {
    expect(generatedPatchOps({ quantity: 2, unit: "lb" })).toEqual({
      $set: { "items.$.display.toBuy": 2, "items.$.display.unit": "lb", "items.$.adjusted": true },
    });
  });
  it("a check mark alone doesn't flag it adjusted", () => {
    expect(generatedPatchOps({ checked: true })).toEqual({ $set: { "items.$.checked": true } });
  });
  it("a null note removes it", () => {
    expect(generatedPatchOps({ note: null })).toEqual({ $unset: { "items.$.note": "" } });
  });
});
