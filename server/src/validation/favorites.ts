import { z } from "zod";

const objectId = z.string().regex(/^[a-f0-9]{24}$/i, "Not a valid id");

export const favoriteParams = z.object({ householdId: objectId, recipeId: objectId });
