import { request as httpsRequest } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import * as turf from "@turf/turf";

const sm = new SecretsManagerClient({});

export function fetchJson<T = any>(url: string): Promise<T> {
  let logUrl = url;
  try {
    const u = new URL(url);
    if (u.searchParams.has("key")) {
      u.searchParams.set("key", "REDACTED");
    }
    logUrl = u.toString();
  } catch {
    // ignore url parsing errors and log original url
  }
  console.info(`[fetchJson] GET ${logUrl}`);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.info(`[fetchJson] resp body: ${data}`);
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err) {
          console.error("[fetchJson] JSON.parse error", data);
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("[fetchJson] HTTP error", err);
      reject(err);
    });
    req.end();
  });
}

export async function getGoogleKey(): Promise<string> {
  console.info("[getGoogleKey] start");
  if (process.env.GOOGLE_API_KEY) {
    console.info("[getGoogleKey] using ENV key");
    return process.env.GOOGLE_API_KEY;
  }
  console.info("[getGoogleKey] fetching from Secrets Manager");
  const resp = await sm.send(
    new GetSecretValueCommand({ SecretId: "google-api-key" })
  );
  console.info("[getGoogleKey] retrieved key");
  return JSON.parse(resp.SecretString!).GOOGLE_API_KEY;
}

export function calcDistanceKm(coords: [number, number][]) {
  const line = turf.lineString(coords.map(([lat, lng]) => [lng, lat]));
  return turf.length(line, { units: "kilometers" });
}

