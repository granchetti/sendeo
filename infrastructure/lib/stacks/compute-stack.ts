import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
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
      { cognitoUserPools: [props.userPool] }
    );

    // 1) RequestRoutes → POST /routes
    const requestRoutes = new HttpLambda(this, "RequestRoutes", {
      entry: path.join(
        __dirname,
        "../../../infrastructure-code/lambda/requestRoutes"
      ),
      handler: "index.handler",
      environment: { QUEUE_URL: props.routeJobsQueue.queueUrl },
      api,
      routes: [{ path: "routes", methods: ["POST"], authorizer }],
    });
    props.routeJobsQueue.grantSendMessages(requestRoutes.fn);

    // 2) WorkerRoutes → routeJobsQueue consumer
    const workerRoutes = new SqsConsumer(this, "WorkerRoutes", {
      entry: path.join(
        __dirname,
        "../../../infrastructure-code/lambda/workerRoutes"
      ),
      handler: "index.handler",
      queue: props.routeJobsQueue,
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        GOOGLE_API_KEY: process.env.GOOGLE_API_KEY!,
      },
    });
    workerRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:UpdateItem"],
        resources: [props.routesTable.tableArn],
      })
    );

    // 3) FavouriteRoutes → POST /favourites & DELETE /favourites/{routeId}
    const favoriteRoutes = new HttpLambda(this, "FavoriteRoutes", {
      entry: path.join(
        __dirname,
        "../../../infrastructure-code/lambda/favouriteRoutes"
      ),
      handler: "index.handler",
      environment: {
        USER_STATE_TABLE: props.userStateTable.tableName,
      },
      api,
      routes: [
        { path: "favourites", methods: ["POST"], authorizer },
        { path: "favourites/{routeId}", methods: ["DELETE"], authorizer },
      ],
    });
    favoriteRoutes.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem", "dynamodb:DeleteItem"],
        resources: [props.userStateTable.tableArn],
      })
    );

    // 4) PageRouter → multiple routes
    const pageRouter = new HttpLambda(this, "PageRouter", {
      entry: path.join(
        __dirname,
        "../../../infrastructure-code/lambda/pageRouter"
      ),

      handler: "index.handler",
      environment: {
        ROUTES_TABLE: props.routesTable.tableName,
        USER_STATE_TABLE: props.userStateTable.tableName,
        METRICS_QUEUE: props.metricsQueue.queueUrl,
      },
      api,
      routes: [
        { path: "profile", methods: ["GET", "PUT"], authorizer },
        { path: "favourites", methods: ["GET"], authorizer },
        { path: "routes/{routeId}", methods: ["GET"], authorizer },
        { path: "telemetry/started", methods: ["POST"], authorizer },
        { path: "routes/{routeId}/finish", methods: ["POST"], authorizer },
      ],
    });
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:Query"],
        resources: [props.routesTable.tableArn],
      })
    );
    pageRouter.fn.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:GetItem", "dynamodb:PutItem"],
        resources: [props.userStateTable.tableArn],
      })
    );
    props.metricsQueue.grantSendMessages(pageRouter.fn);

    // 5) MetricsConsumer
    new SqsConsumer(this, "MetricsConsumer", {
      entry: path.join(
        __dirname,
        "../../../infrastructure-code/lambda/metricsProcessor"
      ),

      handler: "index.handler",
      queue: props.metricsQueue,
    });
  }
}
