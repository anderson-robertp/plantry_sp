import type { NextFunction, Request, RequestHandler, Response } from "express";
import { getHouseholdSettings, getPreferences, updateHouseholdSettings, updatePreferences } from "../services/settings.js";
import { AppError } from "../utils/errors.js";
import { householdParams } from "../validation/invite.js";
import { updateHouseholdSettingsInput, updatePreferencesInput } from "../validation/settings.js";

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

export const getPreferencesController = handler(async (req, res) => {
  res.json(await getPreferences(userIdOf(req)));
});

export const updatePreferencesController = handler(async (req, res) => {
  res.json(await updatePreferences(userIdOf(req), updatePreferencesInput.parse(req.body)));
});

export const getHouseholdSettingsController = handler(async (req, res) => {
  const { householdId } = householdParams.parse(req.params);
  res.json(await getHouseholdSettings(userIdOf(req), householdId));
});

export const updateHouseholdSettingsController = handler(async (req, res) => {
  const { householdId } = householdParams.parse(req.params);
  res.json(await updateHouseholdSettings(userIdOf(req), householdId, updateHouseholdSettingsInput.parse(req.body)));
});
