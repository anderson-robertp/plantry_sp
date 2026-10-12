import { escapeRegExp, normalizeName } from "./text.js";
import { describe, expect, it } from "@jest/globals";

describe("normalizeName", () => {
  it("lowercases, trims, collapses spaces and strips accents", () => {
    expect(normalizeName("  Jalape\u00f1o   Pepper ")).toBe("jalapeno pepper");
    expect(normalizeName("CR\u00c8ME Fra\u00eeche")).toBe("creme fraiche");
  });
  it("is idempotent and leaves plain names alone", () => {
    expect(normalizeName(normalizeName("  Olive  Oil "))).toBe("olive oil");
    expect(normalizeName("flour")).toBe("flour");
  });
});

describe("escapeRegExp", () => {
  it("escapes regex metacharacters", () => {
    expect(escapeRegExp("a.b (x)")).toBe("a\\.b \\(x\\)");
  });
});
