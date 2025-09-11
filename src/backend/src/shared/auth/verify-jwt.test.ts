import { createSign, generateKeyPairSync } from "crypto";

const userPoolId = "us-east-1_testpool";
const clientId = "testclient";
process.env.COGNITO_USER_POOL_ID = userPoolId;
process.env.COGNITO_CLIENT_ID = clientId;

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk: any = publicKey.export({ format: "jwk" });
jwk.kid = "test-key";
jwk.use = "sig";
jwk.alg = "RS256";

const jwks = { keys: [jwk] };

const { verifyJwt, primeJwksForTesting, __resetVerifierForTests } = require("./verify-jwt");

function signToken(payload: any, expiresInSeconds: number) {
  const header = { alg: "RS256", kid: jwk.kid };
  const now = Math.floor(Date.now() / 1000);
  const body = {
    iss: `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`,
    aud: clientId,
    token_use: "id",
    ...payload,
    exp: now + expiresInSeconds,
  };
  const encode = (obj: any) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const data = `${encode(header)}.${encode(body)}`;
  const signer = createSign("RSA-SHA256");
  signer.update(data);
  const signature = signer.sign(privateKey).toString("base64url");
  return `${data}.${signature}`;
}

beforeAll(() => {
  // Prime JWKS to avoid any network usage
  primeJwksForTesting(jwks);
});

afterAll(() => {
  __resetVerifierForTests();
});

const validToken = signToken({ sub: "1", email: "a@example.com" }, 3600);
const expiredToken = signToken({ sub: "1", email: "a@example.com" }, -3600);
const parts = validToken.split(".");
const tamperedPayload = Buffer.from(
  JSON.stringify({
    iss: `https://cognito-idp.us-east-1.amazonaws.com/${userPoolId}`,
    aud: clientId,
    token_use: "id",
    sub: "1",
    email: "b@example.com",
    exp: Math.floor(Date.now() / 1000) + 3600,
  })
).toString("base64url");
const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

describe("verifyJwt", () => {
  it("verifies a valid token", async () => {
    const claims = await verifyJwt(validToken);
    expect(claims.email).toBe("a@example.com");
  });

  it("rejects expired tokens", async () => {
    await expect(verifyJwt(expiredToken)).rejects.toThrow();
  });

  it("rejects tampered tokens", async () => {
    await expect(verifyJwt(tamperedToken)).rejects.toThrow();
  });
});
