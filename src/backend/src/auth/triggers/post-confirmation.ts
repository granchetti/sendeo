import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";
import type { Handler, PostConfirmationTriggerEvent } from "aws-lambda";
// use aws-sdk v2 available in the Lambda runtime for group assignment
const { CognitoIdentityServiceProvider } = require("aws-sdk");

const cw = new CloudWatchClient({});
const idp = new CognitoIdentityServiceProvider();

export const handler: Handler<PostConfirmationTriggerEvent, PostConfirmationTriggerEvent> = async (
  event
) => {
  const ns = process.env.METRICS_NAMESPACE ?? "Sendeo";
  const defaultGroup = process.env.DEFAULT_GROUP ?? "profile";
  console.info("UserSignedUp", event.userName);
  try {
    await idp
      .adminAddUserToGroup({
        UserPoolId: event.userPoolId,
        Username: event.userName,
        GroupName: defaultGroup,
      })
      .promise();
  } catch (err) {
    console.error("Failed to add user to group", err);
  }
  await cw.send(
    new PutMetricDataCommand({
      Namespace: ns,
      MetricData: [
        { MetricName: "UserSignedUp", Value: 1, Unit: "Count" },
      ],
    })
  );
  return event;
};
