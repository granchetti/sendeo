import type { Handler, PostConfirmationTriggerEvent } from "aws-lambda";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({});

export const handler: Handler<PostConfirmationTriggerEvent, PostConfirmationTriggerEvent> = async (
  event
) => {
  console.info("[post-confirmation] UserSignedUp", event.userName);
  const namespace = process.env.METRICS_NAMESPACE!;
  await cw.send(
    new PutMetricDataCommand({
      Namespace: namespace,
      MetricData: [
        {
          MetricName: "UserSignedUp",
          Value: 1,
          Unit: "Count",
          Timestamp: new Date(),
        },
      ],
    })
  );
  return event;
};
