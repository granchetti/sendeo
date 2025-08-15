import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import { WithStage } from "./helpers/types";

export interface FrontendStackProps extends cdk.StackProps, WithStage {
  readonly repoOwner: string;
  readonly repoName: string;
  readonly oauthTokenSecretName: string;
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    const app = new amplify.App(this, "AmplifyApp", {
      appName: `Sendeo-${props.stage}`,
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: props.repoOwner,
        repository: props.repoName,
        oauthToken: cdk.SecretValue.secretsManager(props.oauthTokenSecretName, {
          jsonField: "GITHUB_TOKEN",
        }),
      }),
    });

    const branchName = "main";
    const branch = app.addBranch(branchName);

    new cdk.CfnOutput(this, "AmplifyURL", {
      value: `https://${branch.branchName}.${app.defaultDomain}`,
      description: `URL pública de la rama ${branchName} (${props.stage})`,
    });
  }
}
