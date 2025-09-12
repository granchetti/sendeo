import { request as httpsRequest } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";
import * as turf from "@turf/turf";

const sm = new SecretsManagerClient({});

const MAX_LOG_LENGTH = 200;
function redact(data: string) {
  return data.length > MAX_LOG_LENGTH
    ? `${data.slice(0, MAX_LOG_LENGTH)}...`
    : data;
}

export function fetchJson<T = any>(url: string): Promise<T> {
  console.info(`[fetchJson] GET ${url}`);
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        console.info(
          `[fetchJson] resp status: ${res.statusCode} body: ${redact(data)}`
        );
        try {
          resolve(data ? JSON.parse(data) : null);
        } catch (err) {
          console.error("[fetchJson] JSON.parse error", redact(data));
          reject(err);
        }
      });
    });
    req.on("error", (err) => {
      console.error("[fetchJson] HTTP error", err.message);
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

