import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as amplify from "@aws-cdk/aws-amplify-alpha";
import * as codebuild from "aws-cdk-lib/aws-codebuild";

export interface FrontendStackProps extends cdk.StackProps {
  readonly repoOwner: string;
  readonly repoName: string;
  readonly oauthTokenSecretName: string; // Secret en SecretsManager
}

export class FrontendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: FrontendStackProps) {
    super(scope, id, props);

    // 1) App de Amplify apuntando a tu repo
    const app = new amplify.App(this, "AmplifyApp", {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: props.repoOwner,
        repository: props.repoName,
        oauthToken: cdk.SecretValue.secretsManager(
          props.oauthTokenSecretName,
          { jsonField: "GITHUB_TOKEN" }
        ),
      }),
      // buildSpec de CodeBuild
      buildSpec: codebuild.BuildSpec.fromObjectToYaml({
        version: 1,
        frontend: {
          phases: {
            install: { commands: ["npm ci"] },
            build: { commands: ["npm run build"] },
          },
          artifacts: {
            baseDirectory: "dist",
            files: ["**/*"],
          },
          cache: {
            paths: ["node_modules/**/*"],
          },
        },
      }),
    });

    // 2) Deploy de la rama main
    const main = app.addBranch("main");

    // 3) Construye la URL pública: <branchName>.<defaultDomain>
    const url = `https://${main.branchName}.${app.defaultDomain}`;

    // 4) Salida CloudFormation
    new cdk.CfnOutput(this, "AmplifyURL", {
      value: url,
      description: "URL pública de la rama main en Amplify",
    });
  }
}
