import type { NextFunction, Request, RequestHandler, Response } from "express";
import { inviteService } from "../services/invites.js";
import { AppError } from "../utils/errors.js";
import { householdParams, inviteParams, inviteSecretInput, memberParams } from "../validation/invite.js";

function userIdOf(req: Request): string {
  if (!req.userId) throw new AppError("Authentication required", 401, "unauthenticated");
  return req.userId;
}

/** Every handler is the same shape: parse, call the service, send errors to the error handler. */
const handler =
  (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      await fn(req, res);
    } catch (error) {
      next(error);
    }
  };

export const createInviteController = handler(async (req, res) => {
  const { householdId } = householdParams.parse(req.params);
  res.status(201).json(await inviteService.createInvite(userIdOf(req), householdId));
});

export const listInvitesController = handler(async (req, res) => {
  const { householdId } = householdParams.parse(req.params);
  res.json({ items: await inviteService.listInvites(userIdOf(req), householdId) });
});

export const revokeInviteController = handler(async (req, res) => {
  const { householdId, inviteId } = inviteParams.parse(req.params);
  await inviteService.revokeInvite(userIdOf(req), householdId, inviteId);
  res.status(204).end();
});

export const listMembersController = handler(async (req, res) => {
  const { householdId } = householdParams.parse(req.params);
  res.json({ items: await inviteService.listMembers(userIdOf(req), householdId) });
});

export const removeMemberController = handler(async (req, res) => {
  const { householdId, userId } = memberParams.parse(req.params);
  await inviteService.removeMember(userIdOf(req), householdId, userId);
  res.status(204).end();
});

export const previewInviteController = handler(async (req, res) => {
  const { secret } = inviteSecretInput.parse(req.body);
  res.json(await inviteService.previewInvite(userIdOf(req), secret));
});

export const acceptInviteController = handler(async (req, res) => {
  const { secret } = inviteSecretInput.parse(req.body);
  res.status(201).json(await inviteService.acceptInvite(userIdOf(req), secret));
});
