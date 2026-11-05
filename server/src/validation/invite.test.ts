import { describe, expect, it } from "@jest/globals";
import { inviteParams, inviteSecretInput, memberParams } from "./invite.js";

const ID = "Ab".repeat(12);

describe("inviteSecretInput", () => {
  it("accepts a pasted link token or a code, trimmed", () => {
    expect(inviteSecretInput.parse({ secret: "  K7QM-2XWD " }).secret).toBe("K7QM-2XWD");
  });

  it("rejects an empty value or an enormous one", () => {
    expect(inviteSecretInput.safeParse({ secret: "   " }).success).toBe(false);
    expect(inviteSecretInput.safeParse({ secret: "x".repeat(501) }).success).toBe(false);
    expect(inviteSecretInput.safeParse({}).success).toBe(false);
  });
});

describe("params", () => {
  it("need real ids, lowercased", () => {
    expect(inviteParams.parse({ householdId: ID, inviteId: ID }).inviteId).toBe(ID.toLowerCase());
    expect(memberParams.safeParse({ householdId: ID, userId: "nope" }).success).toBe(false);
  });
});
