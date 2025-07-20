import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";

export interface AuthStackProps extends cdk.StackProps {}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props?: AuthStackProps) {
    super(scope, id, props);

    // 1) User Pool
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: "SendeoUserPool",
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

    // 2) App Client
    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: "UserPoolClient",
      generateSecret: false,
      authFlows: {
        userPassword: true,
        adminUserPassword: true,
        userSrp: true,
      },
      accessTokenValidity: cdk.Duration.hours(2), // up to 24 hours
      idTokenValidity: cdk.Duration.hours(2), // up to 24 hours
      refreshTokenValidity: cdk.Duration.days(90), // up to 10 years
      // For Hosted UI:
      // oAuth: {
      //   flows: { authorizationCodeGrant: true },
      //   callbackUrls: ['https://tu-app.com/callback'],
      //   logoutUrls: ['https://tu-app.com/'],
      // },
      preventUserExistenceErrors: true,
    });

    new cdk.CfnOutput(this, "UserPoolClientId", {
      value: this.userPoolClient.userPoolClientId,
      exportName: "SendeoUserPoolClientId",
    });
  }
}
