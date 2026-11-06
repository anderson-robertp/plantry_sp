import { describe, expect, it } from "@jest/globals";
import { decodeEntities, extractRecipe, isoMinutes } from "./recipePage.js";

const page = (json: unknown, extra = "") =>
  `<html><head><script type="application/ld+json">${JSON.stringify(json)}</script>${extra}</head><body></body></html>`;

const recipe = {
  "@type": "Recipe",
  name: "Chili &amp; Beans",
  recipeYield: ["6", "6 servings"],
  recipeIngredient: ["1 can pork and beans", "2 cups water", "Salt, to taste"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Heat the beans." },
    { "@type": "HowToSection", itemListElement: [{ "@type": "HowToStep", text: "Add water &amp; simmer." }] },
  ],
  prepTime: "PT15M",
  cookTime: "PT1H30M",
  recipeCategory: "Dinner",
  keywords: "easy, Beans, dinner",
  image: { "@type": "ImageObject", url: "https://example.com/a.jpg" },
};

describe("extractRecipe", () => {
  it("reads a plain Recipe block", () => {
    const r = extractRecipe(page(recipe));
    expect(r).toMatchObject({
      name: "Chili & Beans",
      servings: 6,
      servingsGuessed: false,
      ingredientLines: ["1 can pork and beans", "2 cups water", "Salt, to taste"],
      steps: ["Heat the beans.", "Add water & simmer."],
      prepTimeMinutes: 15,
      cookTimeMinutes: 90,
      imageUrl: "https://example.com/a.jpg",
    });
    expect(r?.tags).toEqual(["dinner", "easy", "beans"]);
  });

  it("finds a Recipe inside @graph and typed arrays", () => {
    const r = extractRecipe(page({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }, { ...recipe, "@type": ["Recipe", "Thing"] }] }));
    expect(r?.name).toBe("Chili & Beans");
  });

  it("splits instructions given as one string", () => {
    const r = extractRecipe(page({ ...recipe, recipeInstructions: "Mix.\nBake.<br>Serve." }));
    expect(r?.steps).toEqual(["Mix.", "Bake.", "Serve."]);
  });

  it("guesses servings when the page doesn't say", () => {
    const { recipeYield: _drop, ...rest } = recipe;
    const r = extractRecipe(page(rest));
    expect(r).toMatchObject({ servings: 4, servingsGuessed: true });
  });

  it("skips broken blocks and returns null when there is no recipe", () => {
    expect(extractRecipe(`<script type="application/ld+json">{oops</script>` + page(recipe))?.name).toBe("Chili & Beans");
    expect(extractRecipe(page({ "@type": "Article", name: "Hi" }))).toBeNull();
    expect(extractRecipe("<html></html>")).toBeNull();
    expect(extractRecipe(page({ "@type": "Recipe", name: "No ingredients" }))).toBeNull();
  });
});

describe("helpers", () => {
  it("parses ISO durations", () => {
    expect(isoMinutes("PT45M")).toBe(45);
    expect(isoMinutes("PT2H")).toBe(120);
    expect(isoMinutes("nonsense")).toBeUndefined();
  });
  it("decodes entities", () => {
    expect(decodeEntities("Mom&#39;s &amp; Dad&#x27;s &frac12; cup")).toBe("Mom's & Dad's ½ cup");
  });
});
