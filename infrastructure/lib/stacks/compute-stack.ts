import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import { Secret } from "aws-cdk-lib/aws-secretsmanager";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { HttpLambda } from "../constructs/http-lambda";
import { SqsConsumer } from "../constructs/sqs-consumer";
import * as path from "path";
import { WithStage } from "./helpers/types";

export interface ComputeStackProps extends cdk.StackProps, WithStage {
  readonly routesTable: Table;
  readonly userStateTable: Table;
  readonly routeJobsQueue: sqs.IQueue;
  readonly metricsQueue: sqs.IQueue;
  readonly userPool: IUserPool;
  readonly googleApiKeySecretName: string;
  readonly appSyncUrl?: string;
  readonly appSyncApiKey?: string;
  readonly appSyncRegion?: string;
  readonly bedrockAgentId?: string;
  readonly bedrockAgentAliasId?: string;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    const suffix = props.stage;

    const googleSecret = Secret.fromSecretNameV2(
      this,
      "GoogleSecret",
      props.googleApiKeySecretName
    );

    // API Gateway + Cognito Authorizer
    const api = new apigw.RestApi(this, "Api", {
      restApiName: `SendeoApi-${suffix}`,
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["*"],
      },
    });

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      exportName: `SendeoApiUrl-${suffix}`,
    });

    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuth",
      { cognitoUserPools: [props.userPool] }
    );

    // 1) RequestRoutes → POST /v1/routes
    const requestRoutes = new HttpLambda(this, "RequestRoutes", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/http"
      ),
      handler: "request-routes.handler",
      environment: { QUEUE_URL: props.routeJobsQueue.queueUrl },
      api,
      routes: [{ path: "v1/routes", methods: ["POST"], authorizer }],
    });
    props.routeJobsQueue.grantSendMessages(requestRoutes.fn);

    // 2) WorkerRoutes → routeJobsQueue consumer
    const workerRoutes = new SqsConsumer(this, "WorkerRoutes", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/sqs"
      ),
      handler: "worker-routes.handler",
      queue: props.routeJobsQueue,
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        METRICS_QUEUE: props.metricsQueue.queueUrl,
        ...(props.appSyncUrl ? { APPSYNC_URL: props.appSyncUrl } : {}),
        ...(props.appSyncApiKey
          ? { APPSYNC_API_KEY: props.appSyncApiKey }
          : {}),
        ...(props.appSyncRegion ? { APPSYNC_REGION: props.appSyncRegion } : {}),
      },
    });
    googleSecret.grantRead(workerRoutes.fn);
    workerRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [props.routesTable.tableArn],
      })
    );
    workerRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appsync:GraphQL"],
        resources: ["*"],
      })
    );
    props.metricsQueue.grantSendMessages(workerRoutes.fn);

    // 3) FavouriteRoutes → GET/POST /v1/favourites & DELETE /v1/favourites/{routeId}
    const favoriteRoutes = new HttpLambda(this, "FavoriteRoutes", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/users/interfaces/http"
      ),
      handler: "favourite-routes.handler",
      environment: {
        USER_STATE_TABLE: props.userStateTable.tableName,
        ...(props.appSyncUrl ? { APPSYNC_URL: props.appSyncUrl } : {}),
        ...(props.appSyncApiKey
          ? { APPSYNC_API_KEY: props.appSyncApiKey }
          : {}),
        ...(props.appSyncRegion ? { APPSYNC_REGION: props.appSyncRegion } : {}),
      },
      api,
      routes: [
        { path: "v1/favourites", methods: ["GET", "POST"], authorizer },
        { path: "v1/favourites/{routeId}", methods: ["DELETE"], authorizer },
      ],
    });
    favoriteRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
        resources: [props.userStateTable.tableArn],
      })
    );
    favoriteRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appsync:GraphQL"],
        resources: ["*"], // or the specific API ARN
      })
    );

    // 4) ProfileRoutes → GET/PUT/DELETE /v1/profile
    const profileRoutes = new HttpLambda(this, "ProfileRoutes", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/users/interfaces/http"
      ),
      handler: "profile-routes.handler",
      environment: {
        USER_STATE_TABLE: props.userStateTable.tableName,
        ...(props.appSyncUrl ? { APPSYNC_URL: props.appSyncUrl } : {}),
        ...(props.appSyncApiKey
          ? { APPSYNC_API_KEY: props.appSyncApiKey }
          : {}),
        ...(props.appSyncRegion ? { APPSYNC_REGION: props.appSyncRegion } : {}),
      },
      api,
      routes: [{ path: "v1/profile", methods: ["GET", "PUT", "DELETE"], authorizer }],
    });
    profileRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:BatchWriteItem",
          "dynamodb:Query",
        ],
        resources: [props.userStateTable.tableArn],
      })
    );

    // 5) PageRouter → multiple routes
    const pageRouter = new HttpLambda(this, "PageRouter", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/http"
      ),

      handler: "page-router.handler",
      memorySize: 256,
      timeout: cdk.Duration.seconds(15),
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        USER_STATE_TABLE: props.userStateTable.tableName,
        METRICS_QUEUE: props.metricsQueue.queueUrl,
        ...(props.appSyncUrl ? { APPSYNC_URL: props.appSyncUrl } : {}),
        ...(props.appSyncApiKey
          ? { APPSYNC_API_KEY: props.appSyncApiKey }
          : {}),
        ...(props.appSyncRegion ? { APPSYNC_REGION: props.appSyncRegion } : {}),
      },
      api,
      routes: [
        { path: "v1/routes", methods: ["GET"], authorizer },
        { path: "v1/routes/{routeId}", methods: ["GET"], authorizer },
        { path: "v1/jobs/{jobId}/routes", methods: ["GET"], authorizer },
        { path: "v1/telemetry/started", methods: ["POST"], authorizer },
        { path: "v1/routes/{routeId}/finish", methods: ["POST"], authorizer },
      ],
    });
    googleSecret.grantRead(pageRouter.fn);
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:PutItem",
        ],
        resources: [
          props.routesTable.tableArn,
          `${props.routesTable.tableArn}/index/*`,
        ],
      })
    );
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ],
        resources: [props.userStateTable.tableArn],
      })
    );
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["bedrock:InvokeModel"],
        resources: ["*"],
      })
    );
    props.metricsQueue.grantSendMessages(pageRouter.fn);
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appsync:GraphQL"],
        resources: ["*"],
      })
    );

    // 6) MetricsConsumer
    const metricsConsumer = new SqsConsumer(this, "MetricsConsumer", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/sqs"
      ),

      handler: "metrics-processor.handler",
      queue: props.metricsQueue,
      environment: { METRICS_NAMESPACE: `SendeoMetrics-${suffix}` },
    });
    metricsConsumer.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudwatch:PutMetricData"],
        resources: ["*"],
      })
    );

    // 7) SwaggerDocs → GET /swagger & GET /swagger.json
    new HttpLambda(this, "SwaggerDocs", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/docs/interfaces/http"
      ),
      handler: "swagger.handler",
      api,
      routes: [
        { path: "swagger", methods: ["GET"] },
        { path: "swagger.json", methods: ["GET"] },
      ],
    });
  }
}
