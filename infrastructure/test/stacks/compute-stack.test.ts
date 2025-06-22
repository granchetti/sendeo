import * as cdk from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { ComputeStack } from "../../lib/stacks/compute-stack";
import { Table, AttributeType, BillingMode } from "aws-cdk-lib/aws-dynamodb";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { UserPool } from "aws-cdk-lib/aws-cognito";

describe("ComputeStack", () => {
  let template: Template;
  const TEST_ENV = { account: "123456789012", region: "us-east-1" };

  beforeAll(() => {
    const app = new cdk.App();

    const deps = new cdk.Stack(app, "Deps", { env: TEST_ENV });

    // 2) Dentro de él, define Tables, Queues y UserPool
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

    // 3) Ahora el ComputeStack, también con el mismo env
    const stack = new ComputeStack(app, "TestComputeStack", {
      env: TEST_ENV,
      routesTable,
      userStateTable,
      routeJobsQueue,
      metricsQueue,
      userPool,
    });

    template = Template.fromStack(stack);
  });

  test("creates an API Gateway named SendeoApi", () => {
    template.hasResourceProperties("AWS::ApiGateway::RestApi", {
      Name: "SendeoApi",
    });
  });

  test("creates a Cognito authorizer", () => {
    template.resourceCountIs("AWS::ApiGateway::Authorizer", 1);
  });

  test("defines five Lambda functions", () => {
    template.resourceCountIs("AWS::Lambda::Function", 5);
  });

  test("creates two SQS event source mappings", () => {
    template.resourceCountIs("AWS::Lambda::EventSourceMapping", 2);
  });
});
