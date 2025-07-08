import { Construct } from 'constructs';
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as path from 'path';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

export interface SqsConsumerProps {
  readonly entry: string;
  readonly handler: string;
  readonly environment?: { [k: string]: string };
  readonly queue: sqs.IQueue;
  /** Optional memory size for the Lambda function in MB */
  readonly memorySize?: number;
  /** Optional timeout for the Lambda function */
  readonly timeout?: cdk.Duration;
}

export class SqsConsumer extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: SqsConsumerProps) {
    super(scope, id);

    const [file, fnName] = props.handler.split('.');
    this.fn = new NodejsFunction(this, 'Function', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(props.entry, `${file}.ts`),
      handler: fnName,
      environment: props.environment,
      ...(props.memorySize ? { memorySize: props.memorySize } : {}),
      ...(props.timeout ? { timeout: props.timeout } : {}),
    });

    this.fn.addEventSource(new SqsEventSource(props.queue));
  }
}
