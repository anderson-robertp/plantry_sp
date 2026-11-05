import { describe, expect, it } from "@jest/globals";
import { isAdminEmail, parseAdminEmails } from "./admin.js";

describe("parseAdminEmails", () => {
  it("splits, trims, lowercases and drops blanks and repeats", () => {
    expect(parseAdminEmails(" Me@Example.com, partner@example.com ,, me@example.com ")).toEqual([
      "me@example.com",
      "partner@example.com",
    ]);
  });

  it("is empty when the variable is missing or blank", () => {
    expect(parseAdminEmails(undefined)).toEqual([]);
    expect(parseAdminEmails("")).toEqual([]);
    expect(parseAdminEmails(" , ")).toEqual([]);
  });
});

describe("isAdminEmail", () => {
  const admins = ["me@example.com"];

  it("matches regardless of case and spaces", () => {
    expect(isAdminEmail("ME@example.com ", admins)).toBe(true);
  });

  it("rejects other emails, blanks and missing values", () => {
    expect(isAdminEmail("you@example.com", admins)).toBe(false);
    expect(isAdminEmail("", admins)).toBe(false);
    expect(isAdminEmail(null, admins)).toBe(false);
    expect(isAdminEmail(undefined, admins)).toBe(false);
  });

  it("nobody is an admin when the list is empty", () => {
    expect(isAdminEmail("me@example.com", [])).toBe(false);
  });
});
