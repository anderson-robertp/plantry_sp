import { Types } from "mongoose";
import { Ingredient } from "../models/ingredient.js";
import { AppError } from "../utils/errors.js";
import { extractRecipe } from "../utils/recipePage.js";
import { fetchHtml } from "../utils/safeFetch.js";
import { buildPreview, type CatalogIngredient, type ImportPreview } from "./recipeImportCore.js";

/** Fetches a recipe page and prepares it for review. Nothing is saved; the person saves it as a normal recipe. */
export async function previewRecipeImport(householdId: string, url: string): Promise<ImportPreview> {
  const { html, finalUrl } = await fetchHtml(url);
  const page = extractRecipe(html);
  if (!page) {
    throw new AppError(
      "We couldn't find a recipe on that page. Some sites don't share their recipes in a way we can read; you can still add it by hand.",
      422,
      "no_recipe_found"
    );
  }

  const docs = await Ingredient.find({ householdId: { $in: [null, new Types.ObjectId(householdId)] } })
    .select("name normalizedName aliases householdId category baseUnitType gramsPerMl gramsPerPiece package")
    .lean();

  const ingredients: CatalogIngredient[] = docs.map((d) => ({
    _id: String(d._id),
    name: d.name,
    normalizedName: d.normalizedName,
    aliases: d.aliases ?? [],
    householdId: d.householdId ? String(d.householdId) : null,
    category: d.category,
    baseUnitType: d.baseUnitType,
    gramsPerMl: d.gramsPerMl,
    gramsPerPiece: d.gramsPerPiece,
    package: d.package ?? null,
  }));

  return buildPreview(page, finalUrl, ingredients);
}
