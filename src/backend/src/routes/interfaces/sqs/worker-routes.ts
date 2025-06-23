import { SQSHandler } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { request as httpsRequest } from 'node:https';

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROUTES_TABLE as string;
const googleKey = process.env.GOOGLE_API_KEY as string;

type LatLng = { lat: number; lng: number };

function decodePolyline(encoded: string): LatLng[] {
  let index = 0;
  let lat = 0;
  let lng = 0;
  const coordinates: LatLng[] = [];

  while (index < encoded.length) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLat = (result & 1) ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;
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

    const polyline = directions.routes[0].overview_polyline?.points as string | undefined;
    const coordinates = polyline ? decodePolyline(polyline) : [];

    await dynamo.send(
      new PutItemCommand({
        TableName: tableName,
        Item: {
          routeId: { S: payload.routeId },
          distanceKm: { N: ((leg.distance.value || 0) / 1000).toString() },
          duration: { N: (leg.duration.value || 0).toString() },
          path: { S: JSON.stringify(coordinates) },
        },
      })
    );
  }
};
