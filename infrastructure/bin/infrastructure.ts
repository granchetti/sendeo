import * as cdk from "aws-cdk-lib";
import { DefaultStackSynthesizer, Tags } from "aws-cdk-lib";

import { StorageStack } from "../lib/stacks/storage-stack";
import { QueueStack } from "../lib/stacks/queue-stack";
import { AuthStack } from "../lib/stacks/auth-stack";
import { ComputeStack } from "../lib/stacks/compute-stack";
import { FrontendStack } from "../lib/stacks/frontend-stack";
import { AppSyncStack } from "../lib/stacks/appsync-stack";

type Stage = "dev" | "prod";

const app = new cdk.App();

const target = (app.node.tryGetContext("env") ??
  process.env.DEPLOY_ENV ??
  "dev") as Stage;

const env: cdk.Environment = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

const cfg = {
  googleApiKeySecretName: "google-api-key",
  oauthTokenSecretName: "my-github-token",
};

const synthesizer = new DefaultStackSynthesizer({ qualifier: "tfm" });
const tagEnv = (stack: cdk.Stack) => Tags.of(stack).add("Environment", target);

// Stacks con `stage`
const storage = new StorageStack(app, `SendeoStorageStack-${target}`, {
  env,
  stage: target,
  synthesizer,
});
tagEnv(storage);

const queues = new QueueStack(app, `SendeoQueuesStack-${target}`, {
  env,
  stage: target,
  synthesizer,
});
tagEnv(queues);

const auth = new AuthStack(app, `SendeoAuthStack-${target}`, {
  env,
  stage: target,
  synthesizer,
});
tagEnv(auth);

const appSync = new AppSyncStack(app, `SendeoAppSyncStack-${target}`, {
  env,
  stage: target,
  synthesizer,
  userPool: auth.userPool,
});
tagEnv(appSync);

const compute = new ComputeStack(app, `SendeoComputeStack-${target}`, {
  env,
  stage: target,
  synthesizer,
  routesTable: storage.routesTable,
  userStateTable: storage.userStateTable,
  routeJobsQueue: queues.routeJobsQueue,
  metricsQueue: queues.metricsQueue,
  userPool: auth.userPool,
  googleApiKeySecretName: cfg.googleApiKeySecretName,
  appSyncUrl: appSync.api.graphqlUrl,
  appSyncApiKey: appSync.api.apiKey || undefined,
  appSyncRegion: env.region,
});
tagEnv(compute);

const frontend = new FrontendStack(app, `SendeoFrontendStack-${target}`, {
  env,
  stage: target,
  synthesizer,
  repoOwner: "granchetti",
  repoName: "sendeo",
  oauthTokenSecretName: cfg.oauthTokenSecretName,
});
tagEnv(frontend);
