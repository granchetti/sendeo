import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Queue, QueueEncryption, DeadLetterQueue } from "aws-cdk-lib/aws-sqs";

export interface QueueStackProps extends cdk.StackProps {}

export class QueueStack extends cdk.Stack {
  public readonly routeJobsQueue: Queue;
  public readonly metricsQueue: Queue;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    //
    // 1) Cola de trabajos de rutas (RouteJobs) con DLQ
    //
    const routeJobsDlq = new Queue(this, "RouteJobsDLQ", {
      queueName: "RouteJobsDLQ",
      retentionPeriod: cdk.Duration.days(14),
      encryption: QueueEncryption.SQS_MANAGED,
    });

    this.routeJobsQueue = new Queue(this, "RouteJobsQueue", {
      queueName: "RouteJobsQueue",
      visibilityTimeout: cdk.Duration.seconds(60),
      retentionPeriod: cdk.Duration.days(4),
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: routeJobsDlq,
      } as DeadLetterQueue,
      encryption: QueueEncryption.SQS_MANAGED,
    });

    //
    // 2) Cola para métricas (Metrics)
    //
    this.metricsQueue = new Queue(this, "MetricsQueue", {
      queueName: "MetricsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(1),
      encryption: QueueEncryption.SQS_MANAGED,
    });
  }
}
