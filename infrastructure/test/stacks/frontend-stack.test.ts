import * as cdk from 'aws-cdk-lib';
import { Template, Match } from 'aws-cdk-lib/assertions';
import { FrontendStack } from '../../lib/stacks/frontend-stack';

describe('FrontendStack', () => {
  let template: Template;

  beforeAll(() => {
    const app = new cdk.App();
    const stack = new FrontendStack(app, 'TestFrontendStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      repoOwner: 'owner',
      repoName: 'repo',
      oauthTokenSecretName: 'tokenSecret',
    });
    template = Template.fromStack(stack);
  });

  test('defines an Amplify App resource', () => {
    template.resourceCountIs('AWS::Amplify::App', 1);
  });

  test('creates a branch named main', () => {
    template.hasResourceProperties('AWS::Amplify::Branch', {
      BranchName: 'main',
    });
  });

  test('outputs the Amplify URL', () => {
    template.hasOutput('AmplifyURL', {
      Description: 'URL pública de la rama main en Amplify',
    });
  });
});