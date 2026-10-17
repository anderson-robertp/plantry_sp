import { describe, expect, it } from "@jest/globals";
import { loginInput, registerInput } from "./auth.js";

const ok = { name: "  Sam ", email: "  Sam@Example.COM ", password: "correct horse" };

describe("registerInput", () => {
  it("trims the name, trims and lowercases the email, leaves the password exactly as typed", () => {
    expect(registerInput.parse({ ...ok, password: " spaced pass " })).toEqual({
      name: "Sam",
      email: "sam@example.com",
      password: " spaced pass ",
    });
  });

  it("rejects missing fields, blank names, bad emails and non-strings", () => {
    for (const bad of [
      {},
      { ...ok, name: "   " },
      { ...ok, name: "x".repeat(51) },
      { ...ok, email: "not-an-email" },
      { ...ok, email: "a@b" },
      { ...ok, email: { $ne: null } },
      { ...ok, password: ["a"] },
      { ...ok, name: 5 },
    ]) {
      expect(registerInput.safeParse(bad).success).toBe(false);
    }
  });

  it("requires at least 8 characters", () => {
    expect(registerInput.safeParse({ ...ok, password: "1234567" }).success).toBe(false);
    expect(registerInput.safeParse({ ...ok, password: "12345678" }).success).toBe(true);
  });

  it("refuses passwords over 72 bytes, counting multi-byte characters", () => {
    expect(registerInput.safeParse({ ...ok, password: "a".repeat(72) }).success).toBe(true);
    expect(registerInput.safeParse({ ...ok, password: "a".repeat(73) }).success).toBe(false);
    expect(registerInput.safeParse({ ...ok, password: "é".repeat(37) }).success).toBe(false); // 74 bytes
  });

  it("strips unknown keys, so nobody can set their own id or role", () => {
    expect(Object.keys(registerInput.parse({ ...ok, role: "admin", _id: "x" })).sort()).toEqual(["email", "name", "password"]);
  });
});

describe("loginInput", () => {
  it("normalizes the email and keeps the password untouched", () => {
    expect(loginInput.parse({ email: " A@B.com ", password: " pw " })).toEqual({ email: "a@b.com", password: " pw " });
  });

  it("rejects empty or object values (no query-operator tricks)", () => {
    for (const bad of [{}, { email: "a@b.com" }, { email: "a@b.com", password: "" }, { email: { $gt: "" }, password: "x" }, { email: "a@b.com", password: { $ne: 1 } }]) {
      expect(loginInput.safeParse(bad).success).toBe(false);
    }
  });

  it("does not apply the new-password strength rules to existing accounts", () => {
    expect(loginInput.safeParse({ email: "a@b.com", password: "short" }).success).toBe(true);
  });
});
