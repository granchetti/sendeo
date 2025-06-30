import {
  DeleteItemCommand,
  DynamoDBClient,
  GetItemCommand,
  PutItemCommand,
  ScanCommand,
} from "@aws-sdk/client-dynamodb";
import { RouteRepository } from "../../domain/repositories/route-repository";
import { Route } from "../../domain/entities/route-entity";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";

export class DynamoRouteRepository implements RouteRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async save(route: Route): Promise<void> {
    const item: any = { routeId: { S: route.routeId.Value } };
    if (route.distanceKm)
      item.distanceKm = { N: route.distanceKm.Value.toString() };
    if (route.duration) item.duration = { N: route.duration.Value.toString() };
    if (route.path) item.path = { S: route.path.Encoded };

    await this.client.send(
      new PutItemCommand({ TableName: this.tableName, Item: item })
    );
  }

  async findById(id: string): Promise<Route | null> {
    const res = await this.client.send(
      new GetItemCommand({
        TableName: this.tableName,
        Key: { routeId: { S: id } },
      })
    );
    if (!res.Item) return null;

    return new Route({
      routeId: RouteId.fromString(res.Item.routeId.S!),
      distanceKm: res.Item.distanceKm
        ? new DistanceKm(parseFloat(res.Item.distanceKm.N!))
        : undefined,
      duration: res.Item.duration
        ? new Duration(parseFloat(res.Item.duration.N!))
        : undefined,
      path: res.Item.path ? new Path(res.Item.path.S!) : undefined,
    });
  }

  async findAll(): Promise<Route[]> {
    const res = await this.client.send(
      new ScanCommand({ TableName: this.tableName })
    );
    return (res.Items || []).map(
      (item) =>
        new Route({
          routeId: RouteId.fromString(item.routeId.S!),
          distanceKm: item.distanceKm
            ? new DistanceKm(+item.distanceKm.N!)
            : undefined,
          duration: item.duration ? new Duration(+item.duration.N!) : undefined,
          path: item.path ? new Path(item.path.S!) : undefined,
        })
    );
  }
  
  async remove(id: string): Promise<void> {
    await this.client.send(
      new DeleteItemCommand({
        TableName: this.tableName,
        Key: { routeId: { S: id } },
      })
    );
  }
}
