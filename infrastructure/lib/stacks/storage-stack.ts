import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  Table,
  AttributeType,
  BillingMode,
  ProjectionType,
} from "aws-cdk-lib/aws-dynamodb";

export interface StorageStackProps extends cdk.StackProps {}

export class StorageStack extends cdk.Stack {
  public readonly routesTable: Table;
  public readonly userStateTable: Table;

  constructor(scope: Construct, id: string, props: StorageStackProps) {
    super(scope, id, props);

    this.routesTable = new Table(this, "RoutesTable", {
      tableName: "Routes",
      partitionKey: { name: "routeId", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      timeToLiveAttribute: "ttl",
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.routesTable.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "distanceKm", type: AttributeType.NUMBER },
      sortKey: { name: "createdAt", type: AttributeType.NUMBER },
      projectionType: ProjectionType.ALL,
    });

    this.routesTable.addGlobalSecondaryIndex({
      indexName: "GSI2",
      partitionKey: { name: "jobId", type: AttributeType.STRING },
      projectionType: ProjectionType.ALL,
    });

    this.userStateTable = new Table(this, "UserStateTable", {
      tableName: "UserState",
      partitionKey: { name: "PK", type: AttributeType.STRING },
      sortKey: { name: "SK", type: AttributeType.STRING },
      billingMode: BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });
  }
}
