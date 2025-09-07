import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";
import { WithStage } from "./helpers/types";

export interface AuthStackProps extends cdk.StackProps, WithStage {}

export class AuthStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const suffix = props.stage;
    const backendRoot = path.join(__dirname, "../../../src/backend");
    const backendLock = path.join(backendRoot, "package-lock.json");
    const backendTsconfig = path.join(backendRoot, "tsconfig.json");

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

    if (suffix !== "prod") {
      const preSignUpFn = new NodejsFunction(this, "PreSignUpFn", {
        runtime: lambda.Runtime.NODEJS_18_X,
        entry: path.join(
          __dirname,
          "../../../src/backend/src/auth/triggers/pre-signup.ts"
        ),
        handler: "handler",
        environment: {
          STAGE: suffix,
        },
        depsLockFilePath: backendLock,
        bundling: {
          target: "node18",
          format: OutputFormat.CJS,
          minify: true,
          sourceMap: true,
          sourcesContent: false,
          tsconfig: backendTsconfig,
        },
      });

      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        preSignUpFn
      );
    }

    new cognito.CfnUserPoolGroup(this, "ProfileGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "profile",
    });
    new cognito.CfnUserPoolGroup(this, "RoutesGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "routes",
    });
    new cognito.CfnUserPoolGroup(this, "FavouritesGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "favourites",
    });

    const postConfirmationFn = new NodejsFunction(this, "PostConfirmationFn", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(
        __dirname,
        "../../../src/backend/src/auth/triggers/post-confirmation.ts"
      ),
      handler: "handler",
      environment: {
        DEFAULT_GROUP: "profile",
      },
      depsLockFilePath: backendLock,
      bundling: {
        target: "node18",
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        tsconfig: backendTsconfig,
        externalModules: ["aws-sdk"],
      },
    });

    this.userPool.addTrigger(
      cognito.UserPoolOperation.POST_CONFIRMATION,
      postConfirmationFn
    );

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
