import { describe, expect, it } from "@jest/globals";
import { matchIngredient, singular, type MatchCandidate } from "./ingredientMatch.js";

const c = (id: string, name: string, aliases: string[] = [], isHousehold = false): MatchCandidate => ({
  id,
  name,
  normalizedName: name.toLowerCase(),
  aliases,
  isHousehold,
});

const list = [
  c("egg", "Egg"),
  c("tom", "Tomato"),
  c("dt", "Diced tomatoes"),
  c("salt", "Salt"),
  c("flour", "All-purpose flour", ["plain flour"]),
  c("gar", "Garlic"),
  c("scal", "Green onion", ["scallion"]),
  c("beef", "Ground beef"),
  c("beans", "Pork and beans", [], true),
  c("bean", "Black beans"),
  c("oil", "Olive oil"),
  c("ev", "Vegetable oil"),
];

describe("singular", () => {
  it("handles common endings", () => {
    expect(["eggs", "tomatoes", "berries", "boxes", "glass", "hummus"].map(singular)).toEqual(["egg", "tomato", "berry", "box", "glass", "hummus"]);
  });
});

describe("matchIngredient", () => {
  it("matches exactly through plurals, noise words and aliases", () => {
    expect(matchIngredient("eggs", list).best).toEqual({ id: "egg", confidence: "exact" });
    expect(matchIngredient("fresh garlic", list).best?.id).toBe("gar");
    expect(matchIngredient("plain flour", list).best).toEqual({ id: "flour", confidence: "exact" });
    expect(matchIngredient("scallions", list).best?.id).toBe("scal");
    expect(matchIngredient("diced tomatoes", list).best).toEqual({ id: "dt", confidence: "exact" });
  });

  it("matches loosely when the line adds words", () => {
    expect(matchIngredient("kosher salt", list).best).toEqual({ id: "salt", confidence: "close" });
    expect(matchIngredient("pork and beans", list).best?.id).toBe("beans");
  });

  it("doesn't guess between equally good candidates", () => {
    const r = matchIngredient("oil", list);
    expect(r.best).toBeNull();
    expect(r.suggestions).toEqual(expect.arrayContaining(["oil", "ev"]));
  });

  it("returns nothing for unknown ingredients or empty input", () => {
    expect(matchIngredient("saffron", list)).toEqual({ best: null, suggestions: [] });
    expect(matchIngredient("   ", list)).toEqual({ best: null, suggestions: [] });
  });

  it("prefers a household ingredient over a shared one with the same name", () => {
    const both = [c("g1", "Honey"), c("h1", "Honey", [], true)];
    expect(matchIngredient("honey", both).best?.id).toBe("h1");
  });
});

describe("matchIngredient head word", () => {
  it("won't treat chicken broth as chicken", () => {
    const r = matchIngredient("chicken broth", [c("ch", "Chicken"), c("sa", "Salt")]);
    expect(r.best).toBeNull();
  });
});
