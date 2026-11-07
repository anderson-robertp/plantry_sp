import { Types } from "mongoose";
import { Recipe } from "../models/recipe.js";
import { RecipeFavorite } from "../models/recipeFavorite.js";
import { NotFoundError } from "../utils/errors.js";
import { summarizeFavorites } from "../utils/favorites.js";

/** Membership is checked by the route guard; these functions trust the household id. */
export async function listFavorites(userId: string, householdId: string) {
  const rows = await RecipeFavorite.find({ householdId: new Types.ObjectId(householdId) })
    .select("userId recipeId")
    .lean();
  return summarizeFavorites(
    rows.map((r) => ({ userId: String(r.userId), recipeId: String(r.recipeId) })),
    userId
  );
}

/** Idempotent: hearting twice, or un-hearting something never hearted, is fine. */
export async function setFavorite(userId: string, householdId: string, recipeId: string, favorite: boolean) {
  if (!favorite) {
    await RecipeFavorite.deleteOne({ userId: new Types.ObjectId(userId), recipeId: new Types.ObjectId(recipeId) });
    return { favorite: false };
  }
  const exists = await Recipe.exists({ _id: new Types.ObjectId(recipeId), householdId: new Types.ObjectId(householdId) });
  if (!exists) throw new NotFoundError("Recipe not found");
  await RecipeFavorite.updateOne(
    { userId: new Types.ObjectId(userId), recipeId: new Types.ObjectId(recipeId) },
    { $setOnInsert: { householdId: new Types.ObjectId(householdId) } },
    { upsert: true }
  );
  return { favorite: true };
}
