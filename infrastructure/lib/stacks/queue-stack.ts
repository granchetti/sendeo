import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Queue, QueueEncryption, DeadLetterQueue } from "aws-cdk-lib/aws-sqs";

export interface QueueStackProps extends cdk.StackProps {}

export class QueueStack extends cdk.Stack {
  public readonly routeJobsQueue: Queue;
  public readonly metricsQueue: Queue;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    // 1) Queue for routes with Dead Letter Queue (RouteJobsQueue)
    const routeJobsDlq = new Queue(this, "RouteJobsDLQ", {
      queueName: "RouteJobsDLQ",
      retentionPeriod: cdk.Duration.days(14),
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
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
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 2) Queue for metrics processing (MetricsQueue)
    this.metricsQueue = new Queue(this, "MetricsQueue", {
      queueName: "MetricsQueue",
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(1),
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
