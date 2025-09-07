export enum Scope {
  ROUTES = "routes",
  PROFILE = "profile",
  FAVOURITES = "favourites",
}

export function hasGroup(claims: any, required: Scope): boolean {
  if (!claims) return false;
  const raw =
    (claims["cognito:groups"] ?? claims.scope ?? claims.scopes) as
      | string
      | string[]
      | undefined;
  if (!raw) return false;
  const groups = Array.isArray(raw) ? raw : raw.split(/\s+/);
  return groups.includes(required);
}

// backward compatibility
export function hasScope(claims: any, required: Scope): boolean {
  return hasGroup(claims, required);
}
