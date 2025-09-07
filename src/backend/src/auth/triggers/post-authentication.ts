import type { Handler, PostAuthenticationTriggerEvent } from "aws-lambda";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({});

export const handler: Handler<PostAuthenticationTriggerEvent, PostAuthenticationTriggerEvent> = async (
  event
) => {
  console.info("[post-authentication] UserLoggedIn", event.userName);
  const namespace = process.env.METRICS_NAMESPACE!;
  await cw.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [
        {
          MetricName: "UserLoggedIn",
          Value: 1,
          Unit: "Count",
          Timestamp: new Date(),
        },
      ],
    })
  );
  return event;
};
