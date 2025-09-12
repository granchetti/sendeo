import { CognitoJwtVerifier } from "aws-jwt-verify";
import { SimpleJwksCache } from "aws-jwt-verify/jwk";
import type { Jwks } from "aws-jwt-verify/jwk";

let verifier:
  | ReturnType<typeof CognitoJwtVerifier.create>
  | undefined;
let jwksCache: SimpleJwksCache | undefined;

function getEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} env var is required`);
  return v;
}

function getVerifier() {
  if (!verifier) {
    const userPoolId = getEnv("COGNITO_USER_POOL_ID");
    const clientId = getEnv("COGNITO_CLIENT_ID");
    jwksCache ||= new SimpleJwksCache();
    verifier = CognitoJwtVerifier.create(
      {
        userPoolId,
        tokenUse: "id",
        clientId,
      },
      { jwksCache }
    );
  }
  return verifier;
}

export async function verifyJwt(token: string) {
  return getVerifier().verify(token);
}

// Test helper to allow preloading JWKS and avoid network during tests
export function primeJwksForTesting(jwks: Jwks) {
  getVerifier().cacheJwks(jwks);
}

// Test helper to reset the verifier between test suites if needed
export function __resetVerifierForTests() {
  verifier = undefined;
  jwksCache = undefined;
}
