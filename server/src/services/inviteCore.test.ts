import { describe, expect, it } from "@jest/globals";
import { AppError } from "../utils/errors.js";
import { MAX_HOUSEHOLD_MEMBERS, MAX_PENDING_INVITES, type Role } from "../utils/invites.js";
import { createInviteService, type InviteRecord, type InviteStore, type MemberView } from "./inviteCore.js";

/** An in-memory store, so the rules run without a database. */
function fakeStore() {
  const members: (MemberView & { householdId: string })[] = [];
  const invites: InviteRecord[] = [];
  let nextId = 1;
  const store: InviteStore = {
    getMembership: async (userId, householdId) => {
      const m = members.find((x) => x.userId === userId && x.householdId === householdId);
      return m ? { role: m.role } : null;
    },
    countMembers: async (hh) => members.filter((m) => m.householdId === hh).length,
    countPendingInvites: async (hh, now) =>
      invites.filter((i) => i.householdId === hh && !i.acceptedAt && !i.revokedAt && i.expiresAt > now).length,
    insertInvite: async (rec) => {
      const inv = { ...rec, id: `inv${nextId++}` };
      invites.push(inv);
      return inv;
    },
    findInviteByHash: async (hash) => invites.find((i) => i.tokenHash === hash || i.codeHash === hash) ?? null,
    listPendingInvites: async (hh, now) =>
      invites.filter((i) => i.householdId === hh && !i.acceptedAt && !i.revokedAt && i.expiresAt > now),
    revokeInvite: async (hh, id, now) => {
      const inv = invites.find((i) => i.id === id && i.householdId === hh && !i.acceptedAt && !i.revokedAt);
      if (!inv) return false;
      inv.revokedAt = now;
      return true;
    },
    claimInvite: async (id, userId, now) => {
      const inv = invites.find((i) => i.id === id);
      if (!inv || inv.acceptedAt || inv.revokedAt || inv.expiresAt <= now) return false;
      inv.acceptedAt = now;
      inv.acceptedBy = userId;
      return true;
    },
    releaseInvite: async (id) => {
      const inv = invites.find((i) => i.id === id);
      if (inv) {
        inv.acceptedAt = null;
        inv.acceptedBy = null;
      }
    },
    addMember: async (userId, hh) => {
      if (members.some((m) => m.userId === userId && m.householdId === hh)) return "duplicate";
      members.push({ userId, householdId: hh, role: "member", name: userId, email: `${userId}@x.test` });
      return "added";
    },
    removeMember: async (userId, hh) => {
      const i = members.findIndex((m) => m.userId === userId && m.householdId === hh);
      if (i >= 0) members.splice(i, 1);
    },
    listMembers: async (hh) => members.filter((m) => m.householdId === hh),
    getHousehold: async (id) => (id === "h1" ? { id, name: "The Smiths" } : null),
  };
  const addOwner = (userId: string, hh = "h1") =>
    members.push({ userId, householdId: hh, role: "owner" as Role, name: userId, email: `${userId}@x.test` });
  return { store, members, invites, addOwner };
}

const codeOf = (e: unknown) => (e as AppError).code;
const statusOf = (e: unknown) => (e as AppError).status;
const fails = async (p: Promise<unknown>) => {
  try {
    await p;
  } catch (e) {
    return e as AppError;
  }
  throw new Error("expected it to fail");
};

describe("creating and listing invites", () => {
  it("lets the owner make one, and returns the secrets only then", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    expect(made.token).toHaveLength(43);
    expect(made.code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    const listed = await svc.listInvites("owner", "h1");
    expect(listed).toHaveLength(1);
    expect(JSON.stringify(listed)).not.toContain(made.token);
  });

  it("refuses members, and hides the household from outsiders", async () => {
    const { store, addOwner, members } = fakeStore();
    addOwner("owner");
    members.push({ userId: "mem", householdId: "h1", role: "member", name: "mem", email: "m@x" });
    const svc = createInviteService(store);
    expect(statusOf(await fails(svc.createInvite("mem", "h1")))).toBe(403);
    expect(statusOf(await fails(svc.createInvite("stranger", "h1")))).toBe(404);
    expect(statusOf(await fails(svc.listInvites("mem", "h1")))).toBe(403);
  });

  it("caps open invites", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    for (let i = 0; i < MAX_PENDING_INVITES; i++) await svc.createInvite("owner", "h1");
    expect(codeOf(await fails(svc.createInvite("owner", "h1")))).toBe("pending_limit");
  });

  it("can cancel an invite, after which it no longer works", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    await svc.revokeInvite("owner", "h1", made.invite.id);
    expect(codeOf(await fails(svc.acceptInvite("newbie", made.token)))).toBe("invite_revoked");
    expect(statusOf(await fails(svc.revokeInvite("owner", "h1", "nope")))).toBe(404);
  });
});

describe("accepting an invite", () => {
  it("joins with the link token as a member", async () => {
    const { store, addOwner, members } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    const res = await svc.acceptInvite("newbie", made.token);
    expect(res).toEqual({ householdId: "h1", householdName: "The Smiths" });
    expect(members.find((m) => m.userId === "newbie")?.role).toBe("member");
  });

  it("joins with the short code, typed in any case", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    await svc.acceptInvite("newbie", made.code.toLowerCase());
    expect((await svc.listMembers("owner", "h1")).map((m) => m.userId)).toContain("newbie");
  });

  it("works once only", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    await svc.acceptInvite("one", made.token);
    expect(codeOf(await fails(svc.acceptInvite("two", made.token)))).toBe("invite_used");
    expect(codeOf(await fails(svc.acceptInvite("two", made.code)))).toBe("invite_used");
  });

  it("rejects unknown secrets and garbage the same way", async () => {
    const { store } = fakeStore();
    const svc = createInviteService(store);
    expect(codeOf(await fails(svc.acceptInvite("u", "A".repeat(43))))).toBe("invite_invalid");
    expect(codeOf(await fails(svc.acceptInvite("u", "hello")))).toBe("invite_invalid");
    expect(statusOf(await fails(svc.acceptInvite("u", "")))).toBe(404);
  });

  it("rejects an expired invite", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    let now = new Date("2026-11-05T12:00:00Z");
    const svc = createInviteService(store, () => now);
    const made = await svc.createInvite("owner", "h1");
    now = new Date("2026-11-13T12:00:00Z"); // eight days later
    const err = await fails(svc.acceptInvite("newbie", made.token));
    expect(codeOf(err)).toBe("invite_expired");
    expect(statusOf(err)).toBe(410);
  });

  it("does not use up the invite when you are already a member", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    expect(codeOf(await fails(svc.acceptInvite("owner", made.token)))).toBe("already_member");
    await svc.acceptInvite("newbie", made.token); // still works for someone else
  });

  it("stops at six people, and the invite stays usable", async () => {
    const { store, addOwner, invites } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    for (let i = 1; i < MAX_HOUSEHOLD_MEMBERS; i++) await svc.acceptInvite(`m${i}`, (await svc.createInvite("owner", "h1")).token);
    expect((await svc.listMembers("owner", "h1")).length).toBe(MAX_HOUSEHOLD_MEMBERS);
    const made = await svc.createInvite("owner", "h1");
    expect(codeOf(await fails(svc.acceptInvite("seventh", made.token)))).toBe("household_full");
    expect(invites.find((i) => i.id === made.invite.id)?.acceptedAt).toBeFalsy();
  });

  it("backs out cleanly if two people race past the size check", async () => {
    const { store, addOwner, members, invites } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    for (let i = 1; i < MAX_HOUSEHOLD_MEMBERS - 1; i++) await svc.acceptInvite(`m${i}`, (await svc.createInvite("owner", "h1")).token);
    const made = await svc.createInvite("owner", "h1");
    // someone else slips in after the size check but before the recount
    let injected = false;
    const real = store.addMember;
    store.addMember = async (u, h) => {
      const res = await real(u, h);
      if (!injected) {
        injected = true;
        members.push({ userId: "sneak", householdId: h, role: "member", name: "sneak", email: "s@x" });
      }
      return res;
    };
    expect(codeOf(await fails(svc.acceptInvite("late", made.token)))).toBe("household_full");
    expect(members.some((m) => m.userId === "late")).toBe(false);
    expect(invites.find((i) => i.id === made.invite.id)?.acceptedAt).toBeFalsy();
  });

  it("previews without using the invite up", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    const made = await svc.createInvite("owner", "h1");
    const p = await svc.previewInvite("newbie", made.code);
    expect(p).toMatchObject({ householdName: "The Smiths", memberCount: 1, alreadyMember: false, full: false });
    expect((await svc.previewInvite("owner", made.token)).alreadyMember).toBe(true);
    await svc.acceptInvite("newbie", made.token);
  });
});

describe("members", () => {
  it("shows emails to the owner only", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    await svc.acceptInvite("newbie", (await svc.createInvite("owner", "h1")).token);
    const asOwner = await svc.listMembers("owner", "h1");
    const asMember = await svc.listMembers("newbie", "h1");
    expect(asOwner.every((m) => typeof m.email === "string")).toBe(true);
    expect(asMember.some((m) => "email" in m)).toBe(false);
    expect(asMember.find((m) => m.userId === "newbie")?.you).toBe(true);
  });

  it("hides the list from outsiders", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    expect(statusOf(await fails(createInviteService(store).listMembers("stranger", "h1")))).toBe(404);
  });

  it("lets the owner remove a member and a member leave, but never the owner", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    await svc.acceptInvite("a", (await svc.createInvite("owner", "h1")).token);
    await svc.acceptInvite("b", (await svc.createInvite("owner", "h1")).token);
    await svc.removeMember("owner", "h1", "a");
    await svc.removeMember("b", "h1", "b"); // leaves
    expect((await svc.listMembers("owner", "h1")).map((m) => m.userId)).toEqual(["owner"]);
    expect(codeOf(await fails(svc.removeMember("owner", "h1", "owner")))).toBe("owner_cannot_leave");
  });

  it("does not let a member remove another member", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    const svc = createInviteService(store);
    await svc.acceptInvite("a", (await svc.createInvite("owner", "h1")).token);
    await svc.acceptInvite("b", (await svc.createInvite("owner", "h1")).token);
    expect(statusOf(await fails(svc.removeMember("a", "h1", "b")))).toBe(403);
  });

  it("is a 404 for someone who isn't a member", async () => {
    const { store, addOwner } = fakeStore();
    addOwner("owner");
    expect(statusOf(await fails(createInviteService(store).removeMember("owner", "h1", "ghost")))).toBe(404);
  });
});
