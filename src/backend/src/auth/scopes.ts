export enum Scope {
  ROUTES = "routes",
  PROFILE = "profile",
  FAVOURITES = "favourites",
}

export function hasScope(claims: any, required: Scope): boolean {
  if (!claims) return false;
  const raw = (claims.scope ?? claims.scopes) as string | string[] | undefined;
  const groups = claims["cognito:groups"] as string | string[] | undefined;
  if (!raw && !groups) return false;
  const scopes = Array.isArray(raw) ? raw : raw?.split(/\s+/) ?? [];
  const groupList = Array.isArray(groups) ? groups : groups ? [groups] : [];
  return scopes.includes(required) || groupList.includes(required);
}
