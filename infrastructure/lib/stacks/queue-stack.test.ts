import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { QueueStack } from './queue-stack';

describe('QueueStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new QueueStack(app, 'TestQueueStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('defines three SQS queues including DLQ', () => {
    template.resourceCountIs('AWS::SQS::Queue', 3);
  });

  test('RouteJobsQueue configured with DLQ and visibility timeout', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'RouteJobsQueue',
      VisibilityTimeout: 60,
      RedrivePolicy: {
        maxReceiveCount: 5,
        deadLetterTargetArn: {
          'Fn::GetAtt': [Match.stringLikeRegexp('RouteJobsDLQ'), 'Arn'],
        },
      },
    });
  });

  test('MetricsQueue has visibility timeout of 30 seconds', () => {
    template.hasResourceProperties('AWS::SQS::Queue', {
      QueueName: 'MetricsQueue',
      VisibilityTimeout: 30,
    });
  });
});