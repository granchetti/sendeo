import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Table } from "aws-cdk-lib/aws-dynamodb";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import { HttpLambda } from "./constructs/http-lambda";
import { SqsConsumer } from "./constructs/sqs-consumer";

export interface ComputeStackProps extends cdk.StackProps {
  readonly routesTable: Table;
  readonly userStateTable: Table;
  readonly routeJobsQueue: sqs.IQueue;
  readonly metricsQueue: sqs.IQueue;
  readonly userPool: IUserPool;
}

export class ComputeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ComputeStackProps) {
    super(scope, id, props);

    // API Gateway + Cognito Authorizer
    const api = new apigw.RestApi(this, "Api", {
      restApiName: "SendeoApi",
      defaultCorsPreflightOptions: {
        allowOrigins: ["*"],
        allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      },
    });
    const authorizer = new apigw.CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuth",
      {
        cognitoUserPools: [props.userPool],
      }
    );

    // 1) RequestRoutes → POST /routes
    const requestRoutes = new HttpLambda(this, "RequestRoutes", {
      entry: "lambda/requestRoutes",
      handler: "index.handler",
      environment: { QUEUE_URL: props.routeJobsQueue.queueUrl },
      api,
      routes: [{ path: "routes", methods: ["POST"], authorizer }],
    });
    props.routeJobsQueue.grantSendMessages(requestRoutes.fn);

    // 2) WorkerRoutes → routeJobsQueue consumer
    const workerRoutes = new SqsConsumer(this, "WorkerRoutes", {
      entry: "lambda/workerRoutes",
      handler: "index.handler",
      queue: props.routeJobsQueue,
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
      },
    });
    props.routesTable.grantWriteData(workerRoutes.fn);

    // 3) SaveFavourite → POST /favorites
    const saveFav = new HttpLambda(this, "SaveFavourite", {
      entry: "lambda/saveFavourite",
      handler: "index.handler",
      environment: { USER_STATE_TABLE: props.userStateTable.tableName },
      api,
      routes: [{ path: "favorites", methods: ["POST"], authorizer }],
    });
    props.userStateTable.grantWriteData(saveFav.fn);

    // 4) deleteFavourite → DELETE /favorites
    const deleteFav = new HttpLambda(this, "DeleteFavourite", {
      entry: "lambda/deleteFavourite",
      handler: "index.handler",
      environment: { USER_STATE_TABLE: props.userStateTable.tableName },
      api,
      routes: [{ path: "favorites", methods: ["DELETE"], authorizer }],
    });
    props.userStateTable.grantWriteData(deleteFav.fn);

    // 5) PageRouter → GET /profile, PUT /profile, GET /favorites, GET /routes/{jobId}, POST /telemetry/started, POST /routes/{routeId}/finish
    const pageRouter = new HttpLambda(this, "PageRouter", {
      entry: "lambda/pageRouter",
      handler: "index.handler",
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        USER_STATE_TABLE: props.userStateTable.tableName,
        METRICS_QUEUE: props.metricsQueue.queueUrl,
      },
      api,
      routes: [
        {
          path: "profile",
          methods: ["GET", "PUT"],
          authorizer,
        },
        { path: "favorites", methods: ["GET"], authorizer },
        { path: "routes/{jobId}", methods: ["GET"], authorizer },
        {
          path: "telemetry/started",
          methods: ["POST"],
          authorizer,
        },
        {
          path: "routes/{routeId}/finish",
          methods: ["POST"],
          authorizer,
        },
      ],
    });
    props.routesTable.grantReadData(pageRouter.fn);
    props.userStateTable.grantReadWriteData(pageRouter.fn);
    props.metricsQueue.grantSendMessages(pageRouter.fn);

    // 6) MetricsConsumer → consumer de metricsQueue (opcional)
    new SqsConsumer(this, "MetricsConsumer", {
      entry: "lambda/metricsProcessor",
      handler: "index.handler",
      queue: props.metricsQueue,
    });
  }
}
