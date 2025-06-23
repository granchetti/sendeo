import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { AuthStack } from './auth-stack';

describe('AuthStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new AuthStack(app, 'TestAuthStack', {
      env: { account: '123456789012', region: 'us-east-1' },
    });
    template = Template.fromStack(stack);
  });

  test('defines a Cognito User Pool with email sign-in alias and self-sign-up enabled', () => {
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: Match.stringLikeRegexp('SendeoUserPool'),
      AutoVerifiedAttributes: ['email'],
      UsernameAttributes: ['email'],
      Schema: Match.arrayWith([
        Match.objectLike({ Name: 'email', Required: true, Mutable: true }),
      ]),
    });
  });

  test('defines a Cognito User Pool Client with correct auth flows and no secret', () => {
    template.hasResourceProperties('AWS::Cognito::UserPoolClient', {
      ClientName: Match.stringLikeRegexp('UserPoolClient'),
      GenerateSecret: false,
      ExplicitAuthFlows: Match.arrayWith([
        'ALLOW_USER_PASSWORD_AUTH',
        'ALLOW_ADMIN_USER_PASSWORD_AUTH',
        'ALLOW_USER_SRP_AUTH',
      ]),
      PreventUserExistenceErrors: 'ENABLED',
    });
  });

  test('exports the UserPoolClientId output for cross-stack reference', () => {
    template.hasOutput('UserPoolClientId', {
      Export: {
        Name: 'SendeoUserPoolClientId',
      },
      Value: {
        'Ref': Match.stringLikeRegexp('UserPoolClient'),
      },
    });
  });
});
