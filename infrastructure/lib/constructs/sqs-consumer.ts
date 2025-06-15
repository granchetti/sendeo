import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface SqsConsumerProps {
  readonly entry: string;
  readonly handler: string;
  readonly environment?: { [k: string]: string };
  readonly queue: sqs.IQueue;
}

export class SqsConsumer extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: SqsConsumerProps) {
    super(scope, id);

    this.fn = new lambda.Function(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(props.entry),
      handler: props.handler,
      environment: props.environment,
    });

    this.fn.addEventSource(new SqsEventSource(props.queue));
  }
}
