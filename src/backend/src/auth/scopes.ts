export enum Scope {
  ROUTES = "routes",
  PROFILE = "profile",
  FAVOURITES = "favourites",
}

export function hasScope(claims: any, required: Scope): boolean {
  if (!claims) return false;
  const raw = (claims.scope ?? claims.scopes) as string | string[] | undefined;
  if (!raw) return false;
  const scopes = Array.isArray(raw) ? raw : raw.split(/\s+/);
  return scopes.includes(required);
}
