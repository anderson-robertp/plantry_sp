import { describe, expect, it } from "@jest/globals";
import { parseIngredientLine } from "./ingredientLine.js";

const p = (s: string) => {
  const r = parseIngredientLine(s);
  return { q: r.quantity, u: r.unit, n: r.name, notes: r.notes, opt: r.optional };
};

describe("parseIngredientLine", () => {
  it("reads whole, mixed and unicode fractions", () => {
    expect(p("2 cups flour")).toMatchObject({ q: 2, u: "cup", n: "flour" });
    expect(p("1 1/2 cups sugar")).toMatchObject({ q: 1.5, u: "cup", n: "sugar" });
    expect(p("1½ cups sugar")).toMatchObject({ q: 1.5, u: "cup" });
    expect(p("½ tsp salt")).toMatchObject({ q: 0.5, u: "tsp", n: "salt" });
    expect(p("1 ¼ cups milk")).toMatchObject({ q: 1.25, u: "cup", n: "milk" });
    expect(p("0.5 kg beef")).toMatchObject({ q: 0.5, u: "kg", n: "beef" });
  });

  it("takes the smaller number of a range", () => {
    expect(p("2-3 tbsp olive oil")).toMatchObject({ q: 2, u: "tbsp", n: "olive oil" });
    expect(p("1 to 2 cups stock")).toMatchObject({ q: 1, u: "cup", n: "stock" });
  });

  it("handles long unit words and fluid ounces", () => {
    expect(p("3 tablespoons butter")).toMatchObject({ q: 3, u: "tbsp", n: "butter" });
    expect(p("8 fl oz cream")).toMatchObject({ q: 8, u: "fl_oz", n: "cream" });
    expect(p("1 pound ground beef")).toMatchObject({ q: 1, u: "lb", n: "ground beef" });
  });

  it("treats counted things as pieces and drops size words", () => {
    expect(p("2 large eggs")).toMatchObject({ q: 2, u: "piece", n: "eggs", notes: "large" });
    expect(p("3 cloves garlic, minced")).toMatchObject({ q: 3, u: "piece", n: "garlic", notes: "minced" });
  });

  it("treats cans and bunches as pieces and keeps the can size as a note", () => {
    expect(p("2 (14.5 oz) cans diced tomatoes")).toMatchObject({ q: 29, u: "oz", n: "diced tomatoes", notes: "14.5 oz can" });
    expect(p("1 can pork and beans (15 oz)")).toMatchObject({ q: 15, u: "oz", n: "pork and beans" });
    expect(parseIngredientLine("1 can pork and beans").countWord).toBe("can");
    expect(parseIngredientLine("2 jars salsa").countWord).toBe("jar");
    expect(parseIngredientLine("2 boxes pasta").countWord).toBe("box");
    expect(p("1 bunch cilantro")).toMatchObject({ q: 1, u: "piece", n: "cilantro" });
    expect(p("1 can pork and beans")).toMatchObject({ q: 1, u: "piece", n: "pork and beans" });
  });

  it("turns sticks of butter into cups", () => {
    expect(p("2 sticks butter")).toMatchObject({ q: 1, u: "cup", n: "butter" });
  });

  it("moves preparation after a comma into notes and flags optional", () => {
    expect(p("1 onion, finely chopped")).toMatchObject({ q: 1, u: "piece", n: "onion", notes: "finely chopped" });
    expect(p("1/4 cup parsley (optional)")).toMatchObject({ q: 0.25, u: "cup", n: "parsley", opt: true });
    expect(p("1 cup milk (240 ml)")).toMatchObject({ q: 1, u: "cup", n: "milk", notes: "(240 ml)" });
  });

  it("leaves the amount empty when there isn't one", () => {
    expect(p("Salt, to taste")).toMatchObject({ q: null, u: null, n: "Salt", notes: "to taste" });
    expect(p("fresh basil")).toMatchObject({ q: null, n: "fresh basil" });
  });

  it("understands a pinch", () => {
    expect(p("a pinch of salt")).toMatchObject({ q: 1, u: "pinch", n: "salt" });
    expect(p("1 pinch cayenne")).toMatchObject({ q: 1, u: "pinch", n: "cayenne" });
  });

  it("handles 'a' and 'an' and stray html", () => {
    expect(p("a lemon")).toMatchObject({ q: 1, u: "piece", n: "lemon" });
    expect(p("<b>2</b> cups rice")).toMatchObject({ q: 2, u: "cup", n: "rice" });
  });

  it("keeps the original line", () => {
    expect(parseIngredientLine("  2 cups   flour ").originalText).toBe("2 cups flour");
  });
});
