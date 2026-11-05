import { createHash, randomBytes } from "node:crypto";

/** How long an invite works. */
export const INVITE_TTL_DAYS = 7;
/** People in one household, owner included. */
export const MAX_HOUSEHOLD_MEMBERS = 6;
/** Unused invites a household can hold at once, so the list can't grow without limit. */
export const MAX_PENDING_INVITES = 10;

/** No 0/O or 1/I/L, so a code read aloud or typed from a screenshot isn't misread. */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 8;

export interface NewInvite {
  /** The long secret that goes in the link. Shown once; only its hash is stored. */
  token: string;
  /** The short alternative to the link, e.g. "K7QM2XWD". Shown once; only its hash is stored. */
  code: string;
  tokenHash: string;
  codeHash: string;
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

/** Random code with no modulo bias: bytes that would skew the spread are skipped. */
function randomCode(): string {
  const limit = 256 - (256 % CODE_ALPHABET.length);
  let out = "";
  while (out.length < CODE_LENGTH) {
    for (const byte of randomBytes(16)) {
      if (byte < limit && out.length < CODE_LENGTH) out += CODE_ALPHABET[byte % CODE_ALPHABET.length];
    }
  }
  return out;
}

export function generateInvite(): NewInvite {
  const token = randomBytes(32).toString("base64url");
  const code = randomCode();
  return { token, code, tokenHash: hashSecret(token), codeHash: hashSecret(code) };
}

/** "k7qm-2xwd" -> "K7QM2XWD". Returns null if it can't be a code. */
export function normalizeCode(input: string): string | null {
  const cleaned = input.replace(/[\s-]/g, "").toUpperCase();
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) if (!CODE_ALPHABET.includes(ch)) return null;
  return cleaned;
}

/** "K7QM2XWD" -> "K7QM-2XWD", for showing. */
export const formatCode = (code: string): string => `${code.slice(0, 4)}-${code.slice(4)}`;

/** What someone typed or pasted: the link's token or the short code. Null if it is neither. */
export function lookupHash(input: string): string | null {
  const trimmed = input.trim();
  if (/^[A-Za-z0-9_-]{40,60}$/.test(trimmed)) return hashSecret(trimmed);
  const code = normalizeCode(trimmed);
  return code ? hashSecret(code) : null;
}

export interface InviteLike {
  expiresAt: Date;
  revokedAt?: Date | null | undefined;
  acceptedAt?: Date | null | undefined;
}

export type InviteState = "pending" | "accepted" | "revoked" | "expired";

export function inviteState(invite: InviteLike, now: Date): InviteState {
  if (invite.acceptedAt) return "accepted";
  if (invite.revokedAt) return "revoked";
  if (invite.expiresAt.getTime() <= now.getTime()) return "expired";
  return "pending";
}

export function expiryFrom(now: Date): Date {
  return new Date(now.getTime() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}

export type Role = "owner" | "member";

export type RemoveDecision = { ok: true } | { ok: false; status: number; code: string; message: string };

/**
 * Who may take someone out of a household. Owners remove other members. A member may leave.
 * An owner can't be removed or leave (there is no way to hand over ownership yet), so a household
 * is never left without one.
 */
export function canRemoveMember(
  actor: { userId: string; role: Role },
  target: { userId: string; role: Role }
): RemoveDecision {
  if (target.role === "owner") {
    return { ok: false, status: 409, code: "owner_cannot_leave", message: "The owner can't be removed or leave the household." };
  }
  if (actor.userId === target.userId) return { ok: true };
  if (actor.role === "owner") return { ok: true };
  return { ok: false, status: 403, code: "forbidden", message: "Only the owner can remove other members." };
}
