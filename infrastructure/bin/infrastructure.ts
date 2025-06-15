#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/storage-stack";
import { QueueStack } from "../lib/queue-stack";
import { DefaultStackSynthesizer } from "aws-cdk-lib";
import { ComputeStack } from "../lib/compute-stack";
import { UserPool } from "aws-cdk-lib/aws-cognito";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const synthesizer = new DefaultStackSynthesizer({ qualifier: "tfm" });

// 1) Tablas Dynamo
const storage = new StorageStack(app, "SendeoStorage", { env, synthesizer });

// 2) Colas SQS
const queues = new QueueStack(app, "SendeoQueues", { env, synthesizer });

// 3) Cognito User Pool
const userPool = new UserPool(app, "SendeoUserPool", {
  selfSignUpEnabled: true,
  signInAliases: { email: true },
});

// 4) Compute: Lambdas + API Gateway
new ComputeStack(app, "SendeoCompute", {
  env,
  routesTable: storage.routesTable,
  userStateTable: storage.userStateTable,
  routeJobsQueue: queues.routeJobsQueue,
  metricsQueue: queues.metricsQueue,
  userPool,
  synthesizer,
});
