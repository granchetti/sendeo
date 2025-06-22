import * as cdk from "aws-cdk-lib";
import { StorageStack } from "../lib/stacks/storage-stack";
import { QueueStack } from "../lib/stacks/queue-stack";
import { AuthStack } from "../lib/stacks/auth-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";
import { DefaultStackSynthesizer } from "aws-cdk-lib";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { AppSyncStack } from "../lib/stacks/appsync-stack";

const app = new cdk.App();

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const synthesizer = new DefaultStackSynthesizer({ qualifier: "tfm" });

// 1) Tablas Dynamo
const storage = new StorageStack(app, "SendeoStorageStack", {
  env,
  synthesizer,
});

// 2) Colas SQS
const queues = new QueueStack(app, "SendeoQueuesStack", { env, synthesizer });

// 3) Cognito User Pool
const auth = new AuthStack(app, "SendeoAuthStack", { env, synthesizer });

// 4) Compute: Lambdas + API Gateway
new ComputeStack(app, "SendeoComputeStack", {
  env,
  synthesizer,
  routesTable: storage.routesTable,
  userStateTable: storage.userStateTable,
  routeJobsQueue: queues.routeJobsQueue,
  metricsQueue: queues.metricsQueue,
  userPool: auth.userPool,
});

// 5) Frontend: Amplify App
new FrontendStack(app, "SendeoFrontendStack", {
  repoOwner: "granchetti",
  repoName: "sendeo",
  oauthTokenSecretName: "my-github-token",
  env,
  synthesizer,
});

// 6) AppSync
new AppSyncStack(app, 'SendeoAppSyncStack', {
  env,
  synthesizer,
  userPool: auth.userPool,
});