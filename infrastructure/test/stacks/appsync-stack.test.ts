// test/stacks/appsync-stack.test.ts
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { AppSyncStack } from '../../lib/stacks/appsync-stack';

describe('AppSyncStack', () => {
  let template: Template;
  const TEST_ENV = { account: '123456789012', region: 'us-east-1' };

  beforeAll(() => {
    const app = new cdk.App();

    const deps = new cdk.Stack(app, 'Deps', { env: TEST_ENV });

    const userPool = new cognito.UserPool(deps, 'UserPool', {
      userPoolName: 'TestUserPool',
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: {
        email: { required: true, mutable: true },
      },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
      },
    });

    const stack = new AppSyncStack(app, 'TestAppSyncStack', {
      env:      TEST_ENV,
      userPool,
    });

    template = Template.fromStack(stack);
  });

  test('creates a GraphQL API with Cognito auth', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name:               'SendeoGraphQL',
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
      LogConfig: {
        FieldLogLevel: 'ALL',
      },
    });
  });
});
