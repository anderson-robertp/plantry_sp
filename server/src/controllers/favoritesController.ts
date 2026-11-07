import type { NextFunction, Request, RequestHandler, Response } from "express";
import { listFavorites, setFavorite } from "../services/favorites.js";
import { AppError } from "../utils/errors.js";
import { favoriteParams } from "../validation/favorites.js";

function userIdOf(req: Request): string {
  if (!req.userId) throw new AppError("Authentication required", 401, "unauthenticated");
  return req.userId;
}

const handler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };

export const listFavoritesController = handler(async (req, res) => {
  const { householdId } = favoriteParams.pick({ householdId: true }).parse(req.params);
  res.json(await listFavorites(userIdOf(req), householdId));
});

export const addFavoriteController = handler(async (req, res) => {
  const { householdId, recipeId } = favoriteParams.parse(req.params);
  res.json(await setFavorite(userIdOf(req), householdId, recipeId, true));
});

export const removeFavoriteController = handler(async (req, res) => {
  const { householdId, recipeId } = favoriteParams.parse(req.params);
  res.json(await setFavorite(userIdOf(req), householdId, recipeId, false));
});
