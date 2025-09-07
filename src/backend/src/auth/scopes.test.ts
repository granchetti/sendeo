import { hasScope, Scope } from "./scopes";

describe("hasScope", () => {
  it("returns true when required group is present in cognito:groups", () => {
    const claims = { ["cognito:groups"]: [Scope.ROUTES, "admin"] };
    expect(hasScope(claims, Scope.ROUTES)).toBe(true);
  });

  it("returns false when required group is missing", () => {
    const claims = { ["cognito:groups"]: ["admin"] };
    expect(hasScope(claims, Scope.PROFILE)).toBe(false);
  });
});
