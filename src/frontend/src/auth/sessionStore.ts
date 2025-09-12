let idToken: string | null = null;
let refreshToken: string | null = null;

export function setSession(id: string, refresh: string) {
  idToken = id;
  refreshToken = refresh;
}

export function clearSession() {
  idToken = null;
  refreshToken = null;
}

export function getIdToken() {
  return idToken;
}

export function getRefreshToken() {
  return refreshToken;
}
