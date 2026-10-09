import { omitUndefined } from "./object.js";
import { describe, expect, it } from "@jest/globals";

describe("omitUndefined", () => {
  it("drops keys whose value is undefined", () => {
    const out = omitUndefined({ a: 1, b: undefined, c: "x" });
    expect(out).toEqual({ a: 1, c: "x" });
    expect(Object.keys(out)).toEqual(["a", "c"]);
  });

  it("keeps null, 0, false and empty string", () => {
    const input = { a: null, b: 0, c: false, d: "" };
    expect(omitUndefined(input)).toEqual(input);
  });

  it("does not mutate the input", () => {
    const input = { a: 1, b: undefined };
    omitUndefined(input);
    expect("b" in input).toBe(true);
  });

  it("returns an empty object for an empty object", () => {
    expect(omitUndefined({})).toEqual({});
  });
});
