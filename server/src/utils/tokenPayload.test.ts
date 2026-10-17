import { describe, expect, it } from "@jest/globals";
import { userIdFromPayload } from "./tokenPayload.js";

describe("userIdFromPayload", () => {
  it("accepts a payload whose sub is an ObjectId string", () => {
    expect(userIdFromPayload({ sub: "64b7f0c2a1b2c3d4e5f60718", iat: 1 })).toBe("64b7f0c2a1b2c3d4e5f60718");
  });
  it("rejects strings, missing or odd subs", () => {
    for (const bad of ["token", null, undefined, {}, { sub: 5 }, { sub: "abc" }, { sub: { $ne: 1 } }, { userId: "64b7f0c2a1b2c3d4e5f60718" }]) {
      expect(userIdFromPayload(bad)).toBeNull();
    }
  });
});
