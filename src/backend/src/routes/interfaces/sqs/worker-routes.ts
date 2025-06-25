import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { request as httpsRequest, RequestOptions } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { Route } from "../../domain/entities/route-entity";

const dynamo = new DynamoDBClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const sm = new SecretsManagerClient({});

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
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    result = 0;
    shift = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return coordinates;
}

async function getGoogleKey(): Promise<string> {
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  const json = JSON.parse(resp.SecretString!);
  return json.GOOGLE_API_KEY;
}

function postJson<T = any>(
  host: string,
  path: string,
  apiKey: string,
  body: any
): Promise<T> {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body);
    const opts: RequestOptions = {
      method: "POST",
      host,
      path,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "X-Goog-Api-Key": apiKey,
      },
    };
    const req = httpsRequest(opts, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

export const handler: SQSHandler = async (event) => {
  const googleKey = await getGoogleKey();

  for (const record of event.Records) {
    const { origin, destination, routeId } = JSON.parse(record.body);

    const requestBody = {
      origin: {
        location: { address: origin },
      },
      destination: {
        location: { address: destination },
      },
      travelMode: "WALK",
    };

    console.info("🌐 Calling new Routes API…");
    const resp: any = await postJson(
      "routes.googleapis.com",
      "/v1:computeRoutes",
      googleKey,
      requestBody
    );

    const leg = resp.routes?.[0]?.legs?.[0];
    if (!leg) {
      console.warn("⚠️ No legs returned:", resp);
      continue;
    }

    const route = new Route({
      routeId: RouteId.fromString(routeId),
      distanceKm: new DistanceKm((leg.distanceMeters || 0) / 1000),
      duration: new Duration(leg.duration.seconds || 0),
      path: new Path(
        leg.polyline?.encodedPolyline
          ? decodePolyline(leg.polyline.encodedPolyline)
          : []
      ),
    });
    console.info("💾 Saving route to Dynamo:", route);
    await repository.save(route);
    console.info("✅ Saved.");
  }
};
