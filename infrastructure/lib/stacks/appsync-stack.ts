import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  GraphqlApi,
  AuthorizationType,
  FieldLogLevel,
  SchemaFile,
  MappingTemplate,
} from "aws-cdk-lib/aws-appsync";
import { IUserPool } from "aws-cdk-lib/aws-cognito";
import * as path from "path";
import { WithStage } from "./helpers/types";

export interface AppSyncStackProps extends cdk.StackProps, WithStage {
  readonly userPool: IUserPool;
}

export class AppSyncStack extends cdk.Stack {
  public readonly api: GraphqlApi;

  constructor(scope: Construct, id: string, props: AppSyncStackProps) {
    super(scope, id, props);

    const suffix = props.stage;

    this.api = new GraphqlApi(this, "SendeoGraphQL", {
      name: `SendeoGraphQL-${suffix}`,
      schema: SchemaFile.fromAsset(
        path.join(__dirname, "../../graphql/schema.graphql")
      ),
      logConfig: { fieldLogLevel: FieldLogLevel.ALL },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: { userPool: props.userPool },
        },
      },
    });

    const noneDs = this.api.addNoneDataSource("NoneDS");

    const mutations = [
      "publishRoutesGenerated",
      "publishFavouriteSaved",
      "publishFavouriteDeleted",
      "publishRouteStarted",
      "publishRouteFinished",
      "publishErrorOccurred",
    ];

    mutations.forEach((field) =>
      noneDs.createResolver(field, {
        typeName: "Mutation",
        fieldName: field,
        requestMappingTemplate: MappingTemplate.fromString(
          "$util.toJson($context.arguments)"
        ),
        responseMappingTemplate: MappingTemplate.fromString(
          "$util.toJson($context.arguments)"
        ),
      })
    );

    new cdk.CfnOutput(this, "AppSyncUrl", {
      value: this.api.graphqlUrl,
      exportName: `SendeoAppSyncUrl-${suffix}`,
    });

    if (this.api.apiKey) {
      new cdk.CfnOutput(this, "AppSyncApiKey", {
        value: this.api.apiKey,
        exportName: `SendeoAppSyncApiKey-${suffix}`,
      });
    }
  }
}
