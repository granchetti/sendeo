import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { RouteRepository } from '../../domain/repositories/route-repository';
import { Route } from '../../domain/entities/route-entity';
import { RouteId } from '../../domain/value-objects/route-id-value-object';
import { DistanceKm } from '../../domain/value-objects/distance-value-object';
import { Duration } from '../../domain/value-objects/duration-value-object';
import { Path } from '../../domain/value-objects/path-value-object';

export class DynamoRouteRepository implements RouteRepository {
  constructor(private client: DynamoDBClient, private tableName: string) {}

  async save(route: Route): Promise<void> {
    const item: any = {
      routeId: { S: route.routeId.Value },
    };
    if (route.distanceKm) item.distanceKm = { N: route.distanceKm.Value.toString() };
    if (route.duration) item.duration = { N: route.duration.Value.toString() };
    if (route.path) item.path = { S: JSON.stringify(route.path.Coordinates) };

    await this.client.send(
      new PutItemCommand({
        TableName: this.tableName,
        Item: item,
      })
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
      routeId: RouteId.fromString(res.Item.routeId.S as string),
      distanceKm: res.Item.distanceKm ? new DistanceKm(parseFloat(res.Item.distanceKm.N as string)) : undefined,
      duration: res.Item.duration ? new Duration(parseFloat(res.Item.duration.N as string)) : undefined,
      path: res.Item.path ? new Path(JSON.parse(res.Item.path.S as string)) : undefined,
    });
  }
}