import { SQSHandler } from "aws-lambda";
import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({});

export const handler: SQSHandler = async (event) => {
  const namespace = process.env.METRICS_NAMESPACE!;
  const metricData: any[] = [];

  for (const record of event.Records || []) {
    try {
      const msg = JSON.parse(record.body);
      if (msg.version !== 1) {
        console.warn("[metrics-processor] unsupported version", msg.version);
        continue;
      }
      const ts = msg.timestamp ? new Date(msg.timestamp) : new Date();
      switch (msg.event) {
        case "routes_generated":
          metricData.push({
            MetricName: "RoutesGenerated",
            Value: msg.count ?? 0,
            Unit: "Count",
            Timestamp: ts,
          });
          break;
        case "started":
          metricData.push({
            MetricName: "RouteStarted",
            Value: 1,
            Unit: "Count",
            Timestamp: ts,
          });
          break;
        case "finished":
          metricData.push({
            MetricName: "RouteFinished",
            Value: 1,
            Unit: "Count",
            Timestamp: ts,
          });
          if (msg.actualDuration != null) {
            metricData.push({
              MetricName: "ActualDuration",
              Value: msg.actualDuration,
              Unit: "Seconds",
              Timestamp: ts,
            });
          }
          break;
        default:
          console.warn("[metrics-processor] unknown event", msg);
      }
    } catch (err) {
      console.error("[metrics-processor] invalid message", err);
    }
  }

  if (metricData.length) {
    await cw.send(
      new PutMetricDataCommand({ Namespace: namespace, MetricData: metricData })
    );
  }
};
