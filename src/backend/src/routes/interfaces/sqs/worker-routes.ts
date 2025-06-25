import { SQSHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { request as httpsRequest } from "node:https";
import { DynamoRouteRepository } from "../../infrastructure/dynamodb/dynamo-route-repository";
import { RouteId } from "../../domain/value-objects/route-id-value-object";
import { DistanceKm } from "../../domain/value-objects/distance-value-object";
import { Duration } from "../../domain/value-objects/duration-value-object";
import { Path } from "../../domain/value-objects/path-value-object";
import { Route } from "../../domain/entities/route-entity";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const dynamo = new DynamoDBClient({});
const tableName = process.env.ROUTES_TABLE as string;
const repository = new DynamoRouteRepository(dynamo, tableName);
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

function fetchJson(url: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
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
    req.end();
  });
}

async function getGoogleKey() {
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  const json = JSON.parse(resp.SecretString!);
  return json.GOOGLE_API_KEY as string;
}

export const handler: SQSHandler = async (event) => {
  console.log("📥 Evento SQS completo:", JSON.stringify(event, null, 2));

  const googleKey = await getGoogleKey();
  console.log("🔑 Google API Key recuperada (truncada):", googleKey.slice(0,4), "…");

  for (const record of event.Records) {
    console.log("📦 Nuevo record:", record);

    let payload;
    try {
      payload = JSON.parse(record.body);
    } catch (e) {
      console.error("❌ No pude parsear record.body:", record.body, e);
      continue;
    }
    console.log("➡️ Payload:", payload);

    const origin = encodeURIComponent(payload.origin);
    const destination = encodeURIComponent(payload.destination);
    console.log(`🌐 Llamando a Google Maps API: origin=${payload.origin}, destination=${payload.destination}`);

    const url =
      `https://maps.googleapis.com/maps/api/directions/json` +
      `?origin=${origin}&destination=${destination}&key=${googleKey}`;
    let directions;
    try {
      directions = await fetchJson(url);
    } catch (e) {
      console.error("❌ Error al llamar a Google Maps:", e);
      continue;
    }
    console.log("📊 Respuesta de Google:", JSON.stringify(directions, null, 2));

    const leg = directions.routes?.[0]?.legs?.[0];
    if (!leg) {
      console.warn("⚠️ No vino ningún leg en la respuesta de Google:", directions);
      continue;
    }

    const route = new Route({
      routeId: RouteId.fromString(payload.routeId),
      distanceKm: new DistanceKm((leg.distance.value || 0) / 1000),
      duration: new Duration(leg.duration.value || 0),
      path: new Path(
        decodePolyline(directions.routes[0].overview_polyline?.points ?? "")
      ),
    });
    console.log("💾 Guardando ruta:", JSON.stringify(route, null, 2));
    try {
      await repository.save(route);
      console.log("✅ Ruta guardada con éxito:", route.routeId.toString());
    } catch (e) {
      console.error("❌ Error al guardar en DynamoDB:", e);
    }
  }
};

