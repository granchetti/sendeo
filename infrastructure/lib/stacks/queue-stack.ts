import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Queue,
  QueueEncryption,
  DeadLetterQueue,
} from "aws-cdk-lib/aws-sqs";
import { Alarm, ComparisonOperator } from "aws-cdk-lib/aws-cloudwatch";
import { WithStage } from "./helpers/types";

export interface QueueStackProps extends cdk.StackProps, WithStage {}

export class QueueStack extends cdk.Stack {
  public readonly routeJobsQueue: Queue;
  public readonly metricsQueue: Queue;
  public readonly metricsDlq: Queue;

  constructor(scope: Construct, id: string, props: QueueStackProps) {
    super(scope, id, props);

    const suffix = props.stage;

    // 1) Queue for routes with Dead Letter Queue (RouteJobsQueue)
    const routeJobsDlq = new Queue(this, "RouteJobsDLQ", {
      queueName: `RouteJobsDLQ-${suffix}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.routeJobsQueue = new Queue(this, "RouteJobsQueue", {
      queueName: `RouteJobsQueue-${suffix}`,
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
    this.metricsDlq = new Queue(this, "MetricsDLQ", {
      queueName: `MetricsDLQ-${suffix}`,
      retentionPeriod: cdk.Duration.days(14),
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
    this.metricsQueue = new Queue(this, "MetricsQueue", {
      queueName: `MetricsQueue-${suffix}`,
      visibilityTimeout: cdk.Duration.seconds(30),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        maxReceiveCount: 5,
        queue: this.metricsDlq,
      } as DeadLetterQueue,
      encryption: QueueEncryption.SQS_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // 3) CloudWatch alarms for DLQs
    new Alarm(this, "RouteJobsDLQAlarm", {
      alarmName: `RouteJobsDLQAlarm-${suffix}`,
      metric: routeJobsDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });

    new Alarm(this, "MetricsDLQAlarm", {
      alarmName: `MetricsDLQAlarm-${suffix}`,
      metric: this.metricsDlq.metricApproximateNumberOfMessagesVisible(),
      threshold: 0,
      evaluationPeriods: 1,
      comparisonOperator: ComparisonOperator.GREATER_THAN_THRESHOLD,
    });
  }
}
