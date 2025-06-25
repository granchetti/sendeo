import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { request as httpsRequest, RequestOptions } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import { Route } from "../../domain/entities/route-entity";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";

const dynamo = new DynamoDBClient({});
const repository = new DynamoRouteRepository(dynamo, process.env.ROUTES_TABLE!);
const sm = new SecretsManagerClient({});

async function getGoogleKey(): Promise<string> {
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  const json = JSON.parse(resp.SecretString!);
  const key = json.GOOGLE_API_KEY as string;
  console.info(
    "🔑 Google API Key retrieved (truncated):",
    key.slice(0, 8) + "…"
  );
  return key;
}

function decodePolyline(encoded: string): Array<{ lat: number; lng: number }> {
  let index = 0,
    lat = 0,
    lng = 0;
  const coordinates: Array<{ lat: number; lng: number }> = [];

  while (index < encoded.length) {
    let result = 0,
      shift = 0,
      b: number;
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
      console.info(`📡 Routes API → ${res.statusCode} ${res.statusMessage}`);
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (!data) {
          console.warn("⚠️ Empty response body from Routes API");
          return resolve(null as any);
        }
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          console.error("❌ JSON.parse error, raw body:", data);
          return reject(err);
        }
      });
    });

    req.on("error", (err) => {
      console.error("❌ HTTPS request error:", err);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
}

export const handler: SQSHandler = async (event) => {
  console.info("📥 Received SQS event:", JSON.stringify(event, null, 2));
  const googleKey = await getGoogleKey();

  for (const record of event.Records) {
    const { origin, destination, routeId } = JSON.parse(record.body);
    console.info("➡️ Processing record:", { origin, destination, routeId });

    const requestBody = {
      origin: { location: { address: origin } },
      destination: { location: { address: destination } },
      travelMode: "WALK",
      routingPreference: "TRAFFIC_AWARE",
    };

    console.info("🌐 Calling new Routes API…", requestBody);
    let resp: any;
    try {
      resp = await postJson(
        "routes.googleapis.com",
        "/v1/routes:computeRoutes",
        googleKey,
        requestBody
      );
    } catch (err) {
      console.error("❌ Failed calling Routes API:", err);
      continue;
    }

    console.info("📊 Routes API returned:", JSON.stringify(resp, null, 2));
    const leg = resp?.routes?.[0]?.legs?.[0];
    if (!leg) {
      console.warn("⚠️ No legs returned in response:", resp);
      continue;
    }

    const route = new Route({
      routeId: RouteId.fromString(routeId),
      distanceKm: new DistanceKm((leg.distanceMeters || 0) / 1000),
      duration: new Duration(leg.duration?.seconds || 0),
      path: new Path(
        leg.polyline?.encodedPolyline
          ? decodePolyline(leg.polyline.encodedPolyline)
          : []
      ),
    });

    console.info("💾 Saving route to DynamoDB:", route);
    try {
      await repository.save(route);
      console.info("✅ Route saved:", route.routeId.toString());
    } catch (err) {
      console.error("❌ Error saving to DynamoDB:", err);
    }
  }
};
