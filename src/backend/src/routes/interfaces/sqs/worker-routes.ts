import { SQSHandler } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { request as httpsRequest } from 'node:https';
import { DynamoRouteRepository } from '../../infrastructure/dynamodb/dynamo-route-repository';
import { RouteId } from '../../domain/value-objects/route-id-value-object';
import { DistanceKm } from '../../domain/value-objects/distance-value-object';
import { Duration } from '../../domain/value-objects/duration-value-object';
import { Path } from '../../domain/value-objects/path-value-object';
import { Route } from '../../domain/entities/route-entity';

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROUTES_TABLE as string;
const repository = new DynamoRouteRepository(dynamo, tableName);
const googleKey = process.env.GOOGLE_API_KEY as string;

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: Array<{ lat: number; lng: number }> = [];

  while (index < encoded.length) {
    let result = 0;
    let shift = 0;
    let b: number;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = (result & 1) ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    const payload = JSON.parse(record.body);
    const origin = encodeURIComponent(payload.origin);
    const destination = encodeURIComponent(payload.destination);
    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin}&destination=${destination}&key=${googleKey}`;

    const directions = await fetchJson(url);
    const leg = directions.routes?.[0]?.legs?.[0];
    if (!leg) continue;

    const route = new Route({
      routeId: RouteId.fromString(payload.routeId),
      distanceKm: new DistanceKm((leg.distance.value || 0) / 1000),
      duration: new Duration(leg.duration.value || 0),
      path: new Path(
        decodePolyline(directions.routes[0].overview_polyline?.points ?? '')
      ),
    });
    await repository.save(route);
  }
};
