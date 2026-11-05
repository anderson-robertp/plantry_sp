import { Router } from "express";
import {
  acceptInviteController,
  createInviteController,
  listInvitesController,
  listMembersController,
  previewInviteController,
  removeMemberController,
  revokeInviteController,
} from "../controllers/inviteController.js";
import { authenticate } from "../middleware/authenticate.js";
import { inviteLimiter } from "../middleware/inviteLimiter.js";

/** Mount at /api/households, next to the other household routes. */
export const householdInviteRoutes = Router();
householdInviteRoutes.post("/:householdId/invites", authenticate, createInviteController);
householdInviteRoutes.get("/:householdId/invites", authenticate, listInvitesController);
householdInviteRoutes.delete("/:householdId/invites/:inviteId", authenticate, revokeInviteController);
householdInviteRoutes.get("/:householdId/members", authenticate, listMembersController);
householdInviteRoutes.delete("/:householdId/members/:userId", authenticate, removeMemberController);

/** Mount at /api/invites. Joining isn't scoped to a household, because you aren't in it yet. */
export const inviteLookupRoutes = Router();
inviteLookupRoutes.post("/preview", authenticate, inviteLimiter, previewInviteController);
inviteLookupRoutes.post("/accept", authenticate, inviteLimiter, acceptInviteController);
