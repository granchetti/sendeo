import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import * as codebuild from "aws-cdk-lib/aws-codebuild";

export interface FrontendStackProps extends cdk.StackProps {
  readonly repoOwner: string;
  readonly repoName: string;
  readonly oauthTokenSecretName: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const app = new amplify.App(this, "AmplifyApp", {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: props.repoOwner,
        repository: props.repoName,
        oauthToken: cdk.SecretValue.secretsManager(
          props.oauthTokenSecretName,
          { jsonField: "GITHUB_TOKEN" }
        ),
      }),
    });

    const main = app.addBranch("main");

    const url = `https://${main.branchName}.${app.defaultDomain}`;

    new cdk.CfnOutput(this, "AmplifyURL", {
      value: url,
      description: "URL pública de la rama main en Amplify",
    });
  }
}
