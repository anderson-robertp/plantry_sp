import { describe, expect, it } from "@jest/globals";
import {
  canRemoveMember,
  expiryFrom,
  formatCode,
  generateInvite,
  hashSecret,
  inviteState,
  lookupHash,
  normalizeCode,
} from "./invites.js";

describe("generateInvite", () => {
  it("makes a long token and a short code, and stores only their hashes", () => {
    const inv = generateInvite();
    expect(inv.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(inv.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(inv.tokenHash).toBe(hashSecret(inv.token));
    expect(inv.codeHash).toBe(hashSecret(inv.code));
    expect(inv.tokenHash).not.toContain(inv.token);
  });

  it("is different every time", () => {
    const tokens = new Set(Array.from({ length: 200 }, () => generateInvite().token));
    const codes = new Set(Array.from({ length: 200 }, () => generateInvite().code));
    expect(tokens.size).toBe(200);
    expect(codes.size).toBeGreaterThan(195);
  });

  it("never uses the easily confused characters", () => {
    for (let i = 0; i < 300; i++) expect(generateInvite().code).not.toMatch(/[01OIL]/);
  });
});

describe("normalizeCode", () => {
  it("accepts any case, with spaces or a dash", () => {
    expect(normalizeCode("k7qm-2xwd")).toBe("K7QM2XWD");
    expect(normalizeCode(" K7QM 2XWD ")).toBe("K7QM2XWD");
  });

  it("rejects the wrong length or characters that are never used", () => {
    expect(normalizeCode("K7QM2XW")).toBeNull();
    expect(normalizeCode("K7QM2XWDD")).toBeNull();
    expect(normalizeCode("K7QM2XW0")).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });

  it("formats a code for display", () => {
    expect(formatCode("K7QM2XWD")).toBe("K7QM-2XWD");
  });
});

describe("lookupHash", () => {
  it("finds an invite from either its token or its code, however it was typed", () => {
    const inv = generateInvite();
    expect(lookupHash(inv.token)).toBe(inv.tokenHash);
    expect(lookupHash(`  ${inv.token}  `)).toBe(inv.tokenHash);
    expect(lookupHash(inv.code.toLowerCase())).toBe(inv.codeHash);
    expect(lookupHash(formatCode(inv.code))).toBe(inv.codeHash);
  });

  it("is null for anything else", () => {
    expect(lookupHash("hello")).toBeNull();
    expect(lookupHash("")).toBeNull();
    expect(lookupHash("https://example.com/join/abc")).toBeNull();
  });
});

describe("inviteState", () => {
  const now = new Date("2026-11-05T12:00:00Z");
  const future = new Date("2026-11-06T12:00:00Z");
  const past = new Date("2026-11-04T12:00:00Z");

  it("is pending until something ends it", () => {
    expect(inviteState({ expiresAt: future }, now)).toBe("pending");
  });

  it("expires at the stated moment", () => {
    expect(inviteState({ expiresAt: now }, now)).toBe("expired");
    expect(inviteState({ expiresAt: past }, now)).toBe("expired");
  });

  it("accepted wins over revoked wins over expired", () => {
    expect(inviteState({ expiresAt: past, revokedAt: past, acceptedAt: past }, now)).toBe("accepted");
    expect(inviteState({ expiresAt: past, revokedAt: past }, now)).toBe("revoked");
  });

  it("expiryFrom is seven days out", () => {
    expect(expiryFrom(now).toISOString()).toBe("2026-11-12T12:00:00.000Z");
  });
});

describe("canRemoveMember", () => {
  const owner = { userId: "o", role: "owner" as const };
  const alice = { userId: "a", role: "member" as const };
  const bob = { userId: "b", role: "member" as const };

  it("lets the owner remove a member", () => {
    expect(canRemoveMember(owner, alice)).toEqual({ ok: true });
  });

  it("lets a member leave", () => {
    expect(canRemoveMember(alice, alice)).toEqual({ ok: true });
  });

  it("does not let a member remove someone else", () => {
    const res = canRemoveMember(alice, bob);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.status).toBe(403);
  });

  it("never removes the owner, even by themselves", () => {
    for (const actor of [owner, alice]) {
      const res = canRemoveMember(actor, owner);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.code).toBe("owner_cannot_leave");
    }
  });
});
