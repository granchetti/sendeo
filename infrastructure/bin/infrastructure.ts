#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { QueueStack } from "../lib/queue-stack";
import { DefaultStackSynthesizer } from "aws-cdk-lib";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const synthesizer = new DefaultStackSynthesizer({ qualifier: "tfm" });

// 1) Stack de DynamoDB
new StorageStack(app, "SendeoStorageStack", { env, synthesizer });

// 2) Stack de SQS
new QueueStack(app, "SendeoQueueStack", { env, synthesizer });
