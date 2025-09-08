import { handler } from "./pre-signup";
import type { PreSignUpTriggerEvent } from "aws-lambda";

function createEvent(email: string): PreSignUpTriggerEvent {
  return {
    version: "1",
    region: "us-east-1",
    userPoolId: "pool",
    userName: "user",
    triggerSource: "PreSignUp_SignUp",
    callerContext: {} as any,
    request: {
      userAttributes: { email },
      validationData: {},
      clientMetadata: {},
    },
    response: {},
  } as any;
}

describe("pre-signup trigger", () => {
  afterEach(() => {
    delete process.env.STAGE;
    delete process.env.ALLOWED_EMAIL_DOMAIN;
  });

  it("auto-confirms in non-prod without domain restriction", async () => {
    process.env.STAGE = "dev";
    const event = createEvent("user@any.com");

    const res = (await (handler as any)(event)) as PreSignUpTriggerEvent;

    expect(res.response.autoConfirmUser).toBe(true);
    expect(res.response.autoVerifyEmail).toBe(true);
  });

  it("auto-confirms when allowed domain matches in non-prod", async () => {
    process.env.STAGE = "dev";
    process.env.ALLOWED_EMAIL_DOMAIN = "example.com";
    const event = createEvent("user@example.com");

    const res = (await (handler as any)(event)) as PreSignUpTriggerEvent;

    expect(res.response.autoConfirmUser).toBe(true);
    expect(res.response.autoVerifyEmail).toBe(true);
  });

  it("does not auto-confirm when domain does not match", async () => {
    process.env.STAGE = "dev";
    process.env.ALLOWED_EMAIL_DOMAIN = "example.com";
    const event = createEvent("user@other.com");

    const res = (await (handler as any)(event)) as PreSignUpTriggerEvent;

    expect(res.response.autoConfirmUser).toBeUndefined();
    expect(res.response.autoVerifyEmail).toBeUndefined();
  });

  it("does not auto-confirm in prod stage", async () => {
    process.env.STAGE = "prod";
    process.env.ALLOWED_EMAIL_DOMAIN = "example.com";
    const event = createEvent("user@example.com");

    const res = (await (handler as any)(event)) as PreSignUpTriggerEvent;

    expect(res.response.autoConfirmUser).toBeUndefined();
    expect(res.response.autoVerifyEmail).toBeUndefined();
  });
});

