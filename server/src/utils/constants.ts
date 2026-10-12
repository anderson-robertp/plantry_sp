/** Shared by the Mongoose models and the zod schemas so they can't drift apart. */
export const LOCATIONS = ["pantry", "fridge", "freezer"] as const;
export type Location = (typeof LOCATIONS)[number];
export const LOCATION_SET = new Set(LOCATIONS);
export const INGREDIENT_CATEGORIES = [
  "produce",
  "meat",
  "seafood",
  "bakery",
  "dairy",
  "frozen",
  "canned",
  "grains",
  "baking",
  "condiments",
  "spices",
  "beverages",
  "snacks",
  "other",
] as const;
export type IngredientCategory = (typeof INGREDIENT_CATEGORIES)[number];
export const INGREDIENT_CATEGORY_SET = new Set(INGREDIENT_CATEGORIES);
