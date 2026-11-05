import { Types } from "mongoose";
import { Household } from "../models/household.js";
import { HouseholdInvite, type IHouseholdInvite } from "../models/householdInvite.js";
import { HouseholdMember } from "../models/householdMember.js";
import User from "../models/user.js";
import type { Role } from "../utils/invites.js";
import { createInviteService, type InviteRecord, type InviteStore, type MemberView } from "./inviteCore.js";

const oid = (id: string) => new Types.ObjectId(id);

const toRecord = (d: IHouseholdInvite): InviteRecord => ({
  id: String(d._id),
  householdId: String(d.householdId),
  createdBy: String(d.createdBy),
  tokenHash: d.tokenHash,
  codeHash: d.codeHash,
  createdAt: d.createdAt,
  expiresAt: d.expiresAt,
  revokedAt: d.revokedAt ?? null,
  acceptedAt: d.acceptedAt ?? null,
  acceptedBy: d.acceptedBy ? String(d.acceptedBy) : null,
});

/** `null` matches a field that is missing, so these mean "not accepted, not revoked, not expired". */
const pending = (now: Date) => ({ acceptedAt: null, revokedAt: null, expiresAt: { $gt: now } });

const store: InviteStore = {
  getMembership: async (userId, householdId) => {
    const m = await HouseholdMember.findOne({ userId: oid(userId), householdId: oid(householdId) }).lean();
    return m ? { role: (m as unknown as { role: Role }).role } : null;
  },

  countMembers: (householdId) => HouseholdMember.countDocuments({ householdId: oid(householdId) }),

  countPendingInvites: (householdId, now) => HouseholdInvite.countDocuments({ householdId: oid(householdId), ...pending(now) }),

  insertInvite: async (rec) =>
    toRecord(
      await HouseholdInvite.create({
        householdId: oid(rec.householdId),
        createdBy: oid(rec.createdBy),
        tokenHash: rec.tokenHash,
        codeHash: rec.codeHash,
        expiresAt: rec.expiresAt,
      })
    ),

  findInviteByHash: async (hash) => {
    const d = await HouseholdInvite.findOne({ $or: [{ tokenHash: hash }, { codeHash: hash }] });
    return d ? toRecord(d) : null;
  },

  listPendingInvites: async (householdId, now) =>
    (await HouseholdInvite.find({ householdId: oid(householdId), ...pending(now) }).sort({ createdAt: -1 })).map(toRecord),

  revokeInvite: async (householdId, inviteId, now) => {
    const res = await HouseholdInvite.updateOne(
      { _id: oid(inviteId), householdId: oid(householdId), acceptedAt: null, revokedAt: null },
      { $set: { revokedAt: now } }
    );
    return res.matchedCount > 0;
  },

  // One atomic step: only the first of two simultaneous acceptances gets the invite.
  claimInvite: async (inviteId, userId, now) => {
    const d = await HouseholdInvite.findOneAndUpdate(
      { _id: oid(inviteId), ...pending(now) },
      { $set: { acceptedAt: now, acceptedBy: oid(userId) } },
      { returnDocument: "after" }
    );
    return d !== null;
  },

  releaseInvite: async (inviteId) => {
    await HouseholdInvite.updateOne({ _id: oid(inviteId) }, { $unset: { acceptedAt: "", acceptedBy: "" } });
  },

  addMember: async (userId, householdId) => {
    try {
      await HouseholdMember.create({ userId: oid(userId), householdId: oid(householdId), role: "member" });
      return "added";
    } catch (error) {
      if ((error as { code?: number }).code === 11000) return "duplicate";
      throw error;
    }
  },

  removeMember: async (userId, householdId) => {
    await HouseholdMember.deleteOne({ userId: oid(userId), householdId: oid(householdId) });
  },

  listMembers: async (householdId) => {
    const rows = (await HouseholdMember.find({ householdId: oid(householdId) }).lean()) as unknown as {
      userId: Types.ObjectId;
      role: Role;
      createdAt?: Date;
    }[];
    const users = (await User.find({ _id: { $in: rows.map((r) => r.userId) } })
      .select("username email")
      .lean()) as unknown as { _id: Types.ObjectId; username: string; email: string }[];
    const byId = new Map(users.map((u) => [String(u._id), u]));
    const members: MemberView[] = rows.map((r) => {
      const u = byId.get(String(r.userId));
      return { userId: String(r.userId), role: r.role, name: u?.username ?? "Unknown", email: u?.email ?? "", joinedAt: r.createdAt };
    });
    // the owner first, then by who joined first
    return members.sort((a, b) => Number(b.role === "owner") - Number(a.role === "owner") || (a.joinedAt?.getTime() ?? 0) - (b.joinedAt?.getTime() ?? 0));
  },

  getHousehold: async (householdId) => {
    const h = (await Household.findById(oid(householdId)).lean()) as unknown as { _id: Types.ObjectId; name: string } | null;
    return h ? { id: String(h._id), name: h.name } : null;
  },
};

export const inviteService = createInviteService(store);
