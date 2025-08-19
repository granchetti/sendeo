import type { Handler, PreSignUpTriggerEvent } from "aws-lambda";

export const handler: Handler<PreSignUpTriggerEvent, PreSignUpTriggerEvent> = async (event) => {
  const stage = process.env.STAGE ?? "dev";
  const email = event.request.userAttributes?.email ?? "";
  const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN;

  const domainOk = allowedDomain ? email.endsWith(`@${allowedDomain}`) : true;

  if (stage !== "prod" && domainOk) {
    event.response.autoConfirmUser = true;
    event.response.autoVerifyEmail = true;
  }

  return event;
};
