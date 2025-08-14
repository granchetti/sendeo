import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import { WithStage } from "./types";

export interface AuthStackProps extends cdk.StackProps, WithStage {}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const suffix = props.stage;

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: `SendeoUserPool-${suffix}`,
      selfSignUpEnabled: true,
      signInAliases: { email: true },
      autoVerify: { email: true },
      standardAttributes: { email: { required: true, mutable: true } },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireDigits: true,
      },
    });

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `UserPoolClient-${suffix}`,
      generateSecret: false,
      authFlows: { userPassword: true, adminUserPassword: true, userSrp: true },
      accessTokenValidity: cdk.Duration.hours(2),
      idTokenValidity: cdk.Duration.hours(2),
      refreshTokenValidity: cdk.Duration.days(90),
      preventUserExistenceErrors: true,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: `SendeoUserPoolClientId-${suffix}`,
    });
  }
}
