import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
  QueryCommand,
} from "@aws-sdk/client-dynamodb";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route";
import { RouteStatus } from "../../domain/value-objects/route-status";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { DistanceKm } from "../../domain/value-objects/distance";
import { Duration } from "../../domain/value-objects/duration";
import { Path } from "../../domain/value-objects/path";

export class DynamoRouteRepository implements RouteRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async save(route: Route): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const item: any = {
      routeId: { S: route.routeId.Value },
      createdAt: { N: now.toString() },
    };
    if (route.jobId) item.jobId = { S: route.jobId.Value };
    if (route.correlationId)
      item.correlationId = { S: route.correlationId.Value };
    if (route.distanceKm)
      item.distanceKm = { N: route.distanceKm.Value.toString() };
    if (route.duration) item.duration = { N: route.duration.Value.toString() };
    if (route.path) item.path = { S: route.path.Encoded };
    if (route.description) item.description = { S: route.description };
    item.status = { S: route.status };

    const ttlEnv = process.env.ROUTES_TTL;
    if (ttlEnv) {
      const ttlSeconds = parseInt(ttlEnv, 10);
      if (!isNaN(ttlSeconds)) {
        item.ttl = { N: (now + ttlSeconds).toString() };
      }
    }

    await this.client.send(
      new PutItemCommand({ TableName: this.tableName, Item: item })
    );
  }

  async findById(id: UUID): Promise<Route | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { routeId: { S: id.Value } },
      })
    );
    if (!res.Item) return null;

    return Route.rehydrate({
      routeId: UUID.fromString(res.Item.routeId.S!),
      jobId: res.Item.jobId ? UUID.fromString(res.Item.jobId.S!) : undefined,
      correlationId: res.Item.correlationId
        ? UUID.fromString(res.Item.correlationId.S!)
        : undefined,
      distanceKm: res.Item.distanceKm
        ? new DistanceKm(parseFloat(res.Item.distanceKm.N!))
        : undefined,
      duration: res.Item.duration
        ? new Duration(parseFloat(res.Item.duration.N!))
        : undefined,
      path: res.Item.path ? new Path(res.Item.path.S!) : undefined,
      description: res.Item.description?.S,
      status: (res.Item.status?.S as RouteStatus) || RouteStatus.Requested,
    });
  }

  async findAll(
    params?: { cursor?: string; limit?: number }
  ): Promise<{ items: Route[]; nextCursor?: string }> {
    const scanParams: any = { TableName: this.tableName };
    if (params?.limit) scanParams.Limit = params.limit;
    if (params?.cursor)
      scanParams.ExclusiveStartKey = { routeId: { S: params.cursor } };
    const res = await this.client.send(new ScanCommand(scanParams));
    const items = (res.Items || []).map((item) =>
      Route.rehydrate({
        routeId: UUID.fromString(item.routeId.S!),
        jobId: item.jobId ? UUID.fromString(item.jobId.S!) : undefined,
        correlationId: item.correlationId
          ? UUID.fromString(item.correlationId.S!)
          : undefined,
        distanceKm: item.distanceKm
          ? new DistanceKm(+item.distanceKm.N!)
          : undefined,
        duration: item.duration ? new Duration(+item.duration.N!) : undefined,
        path: item.path ? new Path(item.path.S!) : undefined,
        description: item.description?.S,
        status: (item.status?.S as RouteStatus) || RouteStatus.Requested,
      })
    );
    const nextCursor = res.LastEvaluatedKey?.routeId?.S;
    return nextCursor ? { items, nextCursor } : { items };
  }

  async findByJobId(jobId: UUID): Promise<Route[]> {
    const res = await this.client.send(
      new QueryCommand({
        TableName: this.tableName,
        IndexName: "GSI2",
        KeyConditionExpression: "jobId = :job",
        ExpressionAttributeValues: {
          ":job": { S: jobId.Value },
        },
      })
    );
    return (res.Items || []).map(
      (item) =>
        Route.rehydrate({
          routeId: UUID.fromString(item.routeId.S!),
          jobId: item.jobId ? UUID.fromString(item.jobId.S!) : undefined,
          correlationId: item.correlationId
            ? UUID.fromString(item.correlationId.S!)
            : undefined,
          distanceKm: item.distanceKm
            ? new DistanceKm(+item.distanceKm.N!)
            : undefined,
          duration: item.duration ? new Duration(+item.duration.N!) : undefined,
          path: item.path ? new Path(item.path.S!) : undefined,
          description: item.description?.S,
          status: (item.status?.S as RouteStatus) || RouteStatus.Requested,
        })
    );
  }
  
  async remove(id: UUID): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: { routeId: { S: id.Value } },
      })
    );
  }
}
