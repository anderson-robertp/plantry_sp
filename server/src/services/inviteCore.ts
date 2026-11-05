import { AppError, NotFoundError } from "../utils/errors.js";
import {
  canRemoveMember,
  expiryFrom,
  formatCode,
  generateInvite,
  inviteState,
  lookupHash,
  MAX_HOUSEHOLD_MEMBERS,
  MAX_PENDING_INVITES,
  type Role,
} from "../utils/invites.js";

export interface InviteRecord {
  id: string;
  householdId: string;
  createdBy: string;
  tokenHash: string;
  codeHash: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date | null | undefined;
  acceptedAt?: Date | null | undefined;
  acceptedBy?: string | null | undefined;
}

export interface MemberView {
  userId: string;
  role: Role;
  name: string;
  email: string;
  joinedAt?: Date | undefined;
}

/**
 * The storage steps the invite rules need. An interface so the rules can be tested without a
 * database; services/invites.ts supplies the Mongoose version.
 */
export interface InviteStore {
  getMembership(userId: string, householdId: string): Promise<{ role: Role } | null>;
  countMembers(householdId: string): Promise<number>;
  countPendingInvites(householdId: string, now: Date): Promise<number>;
  insertInvite(rec: Omit<InviteRecord, "id">): Promise<InviteRecord>;
  findInviteByHash(hash: string): Promise<InviteRecord | null>;
  listPendingInvites(householdId: string, now: Date): Promise<InviteRecord[]>;
  /** True if an unused, unrevoked invite of that household was revoked. */
  revokeInvite(householdId: string, inviteId: string, now: Date): Promise<boolean>;
  /** Atomically mark the invite used, but only if it is still pending. False if someone else got there first. */
  claimInvite(inviteId: string, userId: string, now: Date): Promise<boolean>;
  /** Undo a claim (the join failed after it). */
  releaseInvite(inviteId: string): Promise<void>;
  addMember(userId: string, householdId: string): Promise<"added" | "duplicate">;
  removeMember(userId: string, householdId: string): Promise<void>;
  listMembers(householdId: string): Promise<MemberView[]>;
  getHousehold(householdId: string): Promise<{ id: string; name: string } | null>;
}

const notFound = () => new NotFoundError("Household not found");

export function createInviteService(store: InviteStore, clock: () => Date = () => new Date()) {
  /** The signed-in user's role in the household, or a 404 if they aren't in it (so ids can't be probed). */
  async function roleIn(userId: string, householdId: string): Promise<Role> {
    const m = await store.getMembership(userId, householdId);
    if (!m) throw notFound();
    return m.role;
  }

  async function requireOwner(userId: string, householdId: string): Promise<void> {
    if ((await roleIn(userId, householdId)) !== "owner") {
      throw new AppError("Only the owner can do that.", 403, "forbidden");
    }
  }

  /** The pending invite behind a pasted link token or code, or the reason it can't be used. */
  async function findUsable(secret: string): Promise<InviteRecord> {
    const hash = lookupHash(secret);
    const invite = hash ? await store.findInviteByHash(hash) : null;
    if (!invite) throw new AppError("That invite link or code isn't valid.", 404, "invite_invalid");
    switch (inviteState(invite, clock())) {
      case "pending":
        return invite;
      case "expired":
        throw new AppError("That invite has expired. Ask for a new one.", 410, "invite_expired");
      case "revoked":
        throw new AppError("That invite was cancelled. Ask for a new one.", 410, "invite_revoked");
      case "accepted":
        throw new AppError("That invite has already been used.", 410, "invite_used");
    }
  }

  return {
    /** Owner makes an invite. The token and code are returned once and never stored. */
    async createInvite(userId: string, householdId: string) {
      await requireOwner(userId, householdId);
      const now = clock();
      if ((await store.countPendingInvites(householdId, now)) >= MAX_PENDING_INVITES) {
        throw new AppError(
          `You already have ${MAX_PENDING_INVITES} open invites. Cancel one first.`,
          409,
          "pending_limit",
          { limit: MAX_PENDING_INVITES }
        );
      }
      const secrets = generateInvite();
      const record = await store.insertInvite({
        householdId,
        createdBy: userId,
        tokenHash: secrets.tokenHash,
        codeHash: secrets.codeHash,
        createdAt: now,
        expiresAt: expiryFrom(now),
      });
      return {
        invite: { id: record.id, createdAt: record.createdAt, expiresAt: record.expiresAt },
        token: secrets.token,
        code: formatCode(secrets.code),
      };
    },

    async listInvites(userId: string, householdId: string) {
      await requireOwner(userId, householdId);
      const pending = await store.listPendingInvites(householdId, clock());
      return pending.map((i) => ({ id: i.id, createdAt: i.createdAt, expiresAt: i.expiresAt }));
    },

    async revokeInvite(userId: string, householdId: string, inviteId: string) {
      await requireOwner(userId, householdId);
      if (!(await store.revokeInvite(householdId, inviteId, clock()))) throw new NotFoundError("Invite not found");
    },

    /** What someone is about to join, shown before they confirm. Uses nothing up. */
    async previewInvite(userId: string, secret: string) {
      const invite = await findUsable(secret);
      const [household, memberCount, membership] = await Promise.all([
        store.getHousehold(invite.householdId),
        store.countMembers(invite.householdId),
        store.getMembership(userId, invite.householdId),
      ]);
      if (!household) throw new AppError("That invite link or code isn't valid.", 404, "invite_invalid");
      return {
        householdName: household.name,
        memberCount,
        alreadyMember: membership !== null,
        full: memberCount >= MAX_HOUSEHOLD_MEMBERS,
        expiresAt: invite.expiresAt,
      };
    },

    /** Join the household behind an invite. Each invite works once. */
    async acceptInvite(userId: string, secret: string) {
      const invite = await findUsable(secret);
      const householdId = invite.householdId;

      // Checked before using the invite up, so a failed attempt leaves it usable.
      if (await store.getMembership(userId, householdId)) {
        throw new AppError("You are already in that household.", 409, "already_member");
      }
      if ((await store.countMembers(householdId)) >= MAX_HOUSEHOLD_MEMBERS) {
        throw new AppError(`That household is full (${MAX_HOUSEHOLD_MEMBERS} people).`, 409, "household_full");
      }

      if (!(await store.claimInvite(invite.id, userId, clock()))) {
        throw new AppError("That invite has already been used.", 410, "invite_used");
      }

      let added: "added" | "duplicate";
      try {
        added = await store.addMember(userId, householdId);
      } catch (error) {
        await store.releaseInvite(invite.id).catch(() => undefined);
        throw error;
      }
      if (added === "duplicate") {
        await store.releaseInvite(invite.id).catch(() => undefined);
        throw new AppError("You are already in that household.", 409, "already_member");
      }

      // Two people accepting at once could both pass the size check above: count again, and the
      // one that pushed it over leaves and gets their invite back.
      if ((await store.countMembers(householdId)) > MAX_HOUSEHOLD_MEMBERS) {
        await store.removeMember(userId, householdId).catch(() => undefined);
        await store.releaseInvite(invite.id).catch(() => undefined);
        throw new AppError(`That household is full (${MAX_HOUSEHOLD_MEMBERS} people).`, 409, "household_full");
      }

      const household = await store.getHousehold(householdId);
      return { householdId, householdName: household?.name ?? "" };
    },

    /** Everyone can see who is in the household; only the owner sees their email addresses. */
    async listMembers(userId: string, householdId: string) {
      const role = await roleIn(userId, householdId);
      const members = await store.listMembers(householdId);
      return members.map((m) => ({
        userId: m.userId,
        name: m.name,
        role: m.role,
        joinedAt: m.joinedAt,
        you: m.userId === userId,
        ...(role === "owner" ? { email: m.email } : {}),
      }));
    },

    async removeMember(actorId: string, householdId: string, targetId: string) {
      const actorRole = await roleIn(actorId, householdId);
      const target = await store.getMembership(targetId, householdId);
      if (!target) throw new NotFoundError("Member not found");
      const decision = canRemoveMember({ userId: actorId, role: actorRole }, { userId: targetId, role: target.role });
      if (!decision.ok) throw new AppError(decision.message, decision.status, decision.code);
      await store.removeMember(targetId, householdId);
    },
  };
}

export type InviteService = ReturnType<typeof createInviteService>;
