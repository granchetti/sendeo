import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { QueueStack } from './queue-stack';

describe('QueueStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new QueueStack(app, 'TestQueueStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      stage: 'test',
    });
    template = Template.fromStack(stack);
  });

  test('defines four SQS queues including DLQs', () => {
    template.resourceCountIs('AWS::SQS::Queue', 4);
  });

  test('RouteJobsQueue configured with DLQ and visibility timeout', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'RouteJobsQueue-test',
      VisibilityTimeout: 60,
      RedrivePolicy: {
        maxReceiveCount: 5,
        deadLetterTargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('RouteJobsDLQ'), 'Arn'],
        },
      },
    });
  });

  test('MetricsQueue configured with DLQ and visibility timeout', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'MetricsQueue-test',
      VisibilityTimeout: 30,
      RedrivePolicy: {
        maxReceiveCount: 5,
        deadLetterTargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('MetricsDLQ'), 'Arn'],
        },
      },
    });
  });

  test('creates CloudWatch alarms for DLQs', () => {
    template.resourceCountIs('AWS::CloudWatch::Alarm', 2);
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'RouteJobsDLQAlarm-test',
      MetricName: 'ApproximateNumberOfMessagesVisible',
      ComparisonOperator: 'GreaterThanThreshold',
      Threshold: 0,
      Dimensions: [
        { Name: 'QueueName', Value: Match.anyValue() },
      ],
    });
    template.hasResourceProperties('AWS::CloudWatch::Alarm', {
      AlarmName: 'MetricsDLQAlarm-test',
      MetricName: 'ApproximateNumberOfMessagesVisible',
      ComparisonOperator: 'GreaterThanThreshold',
      Threshold: 0,
      Dimensions: [
        { Name: 'QueueName', Value: Match.anyValue() },
      ],
    });
  });
});