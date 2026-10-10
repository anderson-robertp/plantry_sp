import { escapeRegExp } from "./text.js";
import { describe, expect, it } from "@jest/globals";

describe("escapeRegExp", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegExp("a.b*c")).toBe("a\\.b\\*c");
    expect(escapeRegExp("(x)[y]{z}")).toBe("\\(x\\)\\[y\\]\\{z\\}");
  });

  it("makes tricky input match literally", () => {
    for (const s of ["(a+)+$", "a|b", "^start", "back\\slash", "1+1=2?"]) {
      expect(new RegExp(escapeRegExp(s)).test(`xx ${s} yy`)).toBe(true);
    }
    expect(new RegExp(escapeRegExp("a.c")).test("abc")).toBe(false);
  });

  it("leaves plain text alone", () => {
    expect(escapeRegExp("chicken soup")).toBe("chicken soup");
  });
});
