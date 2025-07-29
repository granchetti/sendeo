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

export interface ComputeStackProps extends cdk.StackProps {
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

    const googleSecret = Secret.fromSecretNameV2(
      this,
      "GoogleSecret",
      "google-api-key"
    );

    // API Gateway + Cognito Authorizer
    const api = new apigw.RestApi(this, "Api", {
      restApiName: "SendeoApi",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowHeaders: ["Content-Type", "Authorization"],
      },
    });
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuth",
      { cognitoUserPools: [props.userPool] }
    );

    // 1) RequestRoutes → POST /routes
    const requestRoutes = new HttpLambda(this, "RequestRoutes", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/http"
      ),
      handler: "request-routes.handler",
      environment: { QUEUE_URL: props.routeJobsQueue.queueUrl },
      api,
      routes: [{ path: "routes", methods: ["POST"], authorizer }],
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

    // 3) FavouriteRoutes → GET/POST /favourites & DELETE /favourites/{routeId}
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
        { path: "favourites", methods: ["GET", "POST"], authorizer },
        { path: "favourites/{routeId}", methods: ["DELETE"], authorizer },
      ],
    });
    favoriteRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:DeleteItem", "dynamodb:Query"],
        resources: [props.userStateTable.tableArn],
      })
    );

    // 4) ProfileRoutes → GET/PUT /profile
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
      routes: [{ path: "profile", methods: ["GET", "PUT"], authorizer }],
    });
    profileRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
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
        { path: "routes", methods: ["GET"], authorizer },
        { path: "routes/{routeId}", methods: ["GET"], authorizer },
        { path: "jobs/{jobId}/routes", methods: ["GET"], authorizer },
        { path: "telemetry/started", methods: ["POST"], authorizer },
        { path: "routes/{routeId}/finish", methods: ["POST"], authorizer },
      ],
    });
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:Scan"],
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
    props.metricsQueue.grantSendMessages(pageRouter.fn);
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["appsync:GraphQL"],
        resources: ["*"],
      })
    );

    // 6) MetricsConsumer
    new SqsConsumer(this, "MetricsConsumer", {
      entry: path.join(
        __dirname,
        "../../../src/backend/src/routes/interfaces/sqs"
      ),

      handler: "metrics-processor.handler",
      queue: props.metricsQueue,
    });

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
