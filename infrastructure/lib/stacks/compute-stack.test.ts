import * as cdk from "aws-cdk-lib";
import { Template, Match } from "aws-cdk-lib/assertions";
import { ComputeStack } from "./compute-stack";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { UserPool } from "aws-cdk-lib/aws-cognito";

describe("ComputeStack", () => {
  let template: Template;
  const TEST_ENV = { account: "123456789012", region: "us-east-1" };

  beforeAll(() => {
    const app = new cdk.App();

    const deps = new cdk.Stack(app, "Deps", { env: TEST_ENV });

    const routesTable = new Table(deps, "Routes", {
      partitionKey: { name: "id", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
    const userStateTable = new Table(deps, "UserState", {
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
    });
    const routeJobsQueue = new Queue(deps, "RouteJobs");
    const metricsQueue = new Queue(deps, "Metrics");
    const userPool = new UserPool(deps, "UserPool");
    const googleApiKeySecretName = "dummy-secret-name";
    const stack = new ComputeStack(app, "TestComputeStack", {
      env: TEST_ENV,
      routesTable,
      userStateTable,
      routeJobsQueue,
      metricsQueue,
      userPool,
      userPoolClientId: "dummy-client-id",
      googleApiKeySecretName,
      bedrockAgentId: "a",
      bedrockAgentAliasId: "b",
      stage: 'test',
    });

    template = Template.fromStack(stack);
  });

  test("creates an API Gateway named SendeoApi", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "SendeoApi-test",
    });
  });

  test("creates a Cognito authorizer", () => {
    template.resourceCountIs("AWS::ApiGateway::Authorizer", 1);
  });

  test("defines Lambda functions", () => {
    template.resourceCountIs("AWS::Lambda::Function", 7);
  });

  test("creates two SQS event source mappings", () => {
    template.resourceCountIs("AWS::Lambda::EventSourceMapping", 2);
  });

  test("creates default gateway responses with CORS headers", () => {
    template.hasResourceProperties("AWS::ApiGateway::GatewayResponse", {
      ResponseType: "DEFAULT_4XX",
      ResponseParameters: {
        "gatewayresponse.header.Access-Control-Allow-Origin": "*",
        "gatewayresponse.header.Access-Control-Allow-Headers": "*",
      },
    });
    template.hasResourceProperties("AWS::ApiGateway::GatewayResponse", {
      ResponseType: "DEFAULT_5XX",
      ResponseParameters: {
        "gatewayresponse.header.Access-Control-Allow-Origin": "*",
        "gatewayresponse.header.Access-Control-Allow-Headers": "*",
      },
    });
  });

  test("grants PageRouter access to the GSI2 index", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Resource: Match.arrayWith([
              Match.objectLike({
                "Fn::Join": ["", [Match.anyValue(), "/index/*"]],
              }),
            ]),
          }),
        ]),
      },
    });
  });

  test("grants PageRouter permission to delete items in UserState", () => {
    template.hasResourceProperties("AWS::IAM::Policy", {
      PolicyDocument: {
        Statement: Match.arrayWith([
          Match.objectLike({
            Action: Match.arrayWith(["dynamodb:DeleteItem"]),
          }),
        ]),
      },
    });
  });
});
