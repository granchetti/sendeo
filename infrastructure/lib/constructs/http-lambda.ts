import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";

export interface HttpLambdaProps {
  readonly entry: string;
  readonly handler: string;
  readonly environment?: { [k: string]: string };
  readonly api: apigw.RestApi;
  readonly routes: Array<{
    path: string;
    methods: string[];
    authorizer?: apigw.IAuthorizer;
  }>;
}

export class HttpLambda extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: HttpLambdaProps) {
    super(scope, id);

    this.fn = new lambda.Function(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(props.entry),
      handler: props.handler,
      environment: props.environment,
    });

    for (const r of props.routes) {
      const segments = r.path.split("/").filter((s) => s);
      let resource = props.api.root;
      for (const seg of segments) {
        resource = resource.getResource(seg) ?? resource.addResource(seg);
      }
      for (const m of r.methods) {
        resource.addMethod(m, new apigw.LambdaIntegration(this.fn), {
          authorizer: r.authorizer,
          authorizationType: r.authorizer
            ? apigw.AuthorizationType.COGNITO
            : apigw.AuthorizationType.NONE,
        });
      }
    }
  }
}
