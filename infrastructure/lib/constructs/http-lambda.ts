// infrastructure/lib/constructs/http-lambda.ts
import { Construct } from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigw from "aws-cdk-lib/aws-apigateway";
import { NodejsFunction, OutputFormat } from "aws-cdk-lib/aws-lambda-nodejs";
import * as path from "path";

export interface HttpLambdaProps {
  entry: string;
  handler: string;
  environment?: { [k: string]: string };
  api: apigw.RestApi;
  routes: Array<{
    path: string;
    methods: string[];
    authorizer?: apigw.IAuthorizer;
  }>;
  memorySize?: number;
  timeout?: cdk.Duration;
}

export class HttpLambda extends Construct {
  public readonly fn: lambda.Function;

  constructor(scope: Construct, id: string, props: HttpLambdaProps) {
    super(scope, id);

    const [file, fnName] = props.handler.split(".");
    const backendRoot = path.join(__dirname, "../../../src/backend");
    const backendLock = path.join(backendRoot, "package-lock.json");
    const backendTsconfig = path.join(backendRoot, "tsconfig.json");

    this.fn = new NodejsFunction(this, "Function", {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(props.entry, `${file}.ts`),
      handler: fnName,
      environment: props.environment,
      memorySize: props.memorySize ?? 128,
      timeout: props.timeout ?? cdk.Duration.seconds(3),
      depsLockFilePath: backendLock,
      bundling: {
        target: "node18",
        format: OutputFormat.CJS,
        minify: true,
        sourceMap: true,
        sourcesContent: false,
        tsconfig: backendTsconfig,
        nodeModules: ["uuid"],
      },
    });
    for (const r of props.routes) {
      const segments = r.path.split("/").filter(Boolean);
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
