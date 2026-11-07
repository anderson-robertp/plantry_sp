import { describe, expect, it } from "@jest/globals";
import { weightChangeProblem } from "./weights.js";

describe("weightChangeProblem", () => {
  it("allows adding a weight that isn't there yet", () => {
    expect(weightChangeProblem({}, { gramsPerMl: 0.5 })).toBeNull();
    expect(weightChangeProblem({ gramsPerMl: null, gramsPerPiece: undefined }, { gramsPerMl: 0.5, gramsPerPiece: 40 })).toBeNull();
    expect(weightChangeProblem({ gramsPerMl: 0.5 }, { gramsPerPiece: 40 })).toBeNull();
  });

  it("refuses to change a weight that is already set", () => {
    expect(weightChangeProblem({ gramsPerMl: 0.5 }, { gramsPerMl: 0.6 })).toMatch(/cup weight/);
    expect(weightChangeProblem({ gramsPerPiece: 40 }, { gramsPerPiece: 41 })).toMatch(/piece weight/);
    expect(weightChangeProblem({ gramsPerMl: 0.5, gramsPerPiece: 40 }, { gramsPerPiece: 50 })).toMatch(/piece weight/);
  });

  it("does nothing when no weight is being sent", () => {
    expect(weightChangeProblem({ gramsPerMl: 0.5 }, {})).toBeNull();
  });
});
