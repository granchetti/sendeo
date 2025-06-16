import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  GraphqlApi,
  AuthorizationType,
  FieldLogLevel,
  SchemaFile,
} from "aws-cdk-lib/aws-appsync";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import * as path from "path";

export interface AppSyncStackProps extends cdk.StackProps {
  readonly userPool: IUserPool;
}

export class AppSyncStack extends cdk.Stack {
  public readonly api: GraphqlApi;

  constructor(scope: Construct, id: string, props: AppSyncStackProps) {
    super(scope, id, props);

    this.api = new GraphqlApi(this, "SendeoGraphQL", {
      name: "SendeoGraphQL",
      schema: SchemaFile.fromAsset(
        path.join(__dirname, "../../infrastructure/graphql/schema.graphql")
      ),
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: { userPool: props.userPool },
        },
      },
    });
  }
}
