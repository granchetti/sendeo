import { request as httpsRequest } from "node:https";
import {
  SecretsManagerClient,
  GetSecretValueCommand,
} from "@aws-sdk/client-secrets-manager";

const sm = new SecretsManagerClient({});

export function fetchJson<T = any>(url: string): Promise<T> {
  console.info(`[fetchJson] GET ${url}`);
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

export async function getCityName(
  lat: number,
  lng: number,
  apiKey: string
): Promise<string> {
  const url =
    `https://maps.googleapis.com/maps/api/geocode/json` +
    `?latlng=${lat},${lng}` +
    `&key=${apiKey}` +
    `&result_type=locality|administrative_area_level_3`;

  try {
    const data: any = await fetchJson(url);
    const comps = data?.results?.[0]?.address_components ?? [];
    return (
      comps.find((c: any) => c.types.includes("locality"))?.long_name ??
      comps.find((c: any) =>
        c.types.includes("administrative_area_level_3")
      )?.long_name ??
      "Unknown"
    );
  } catch {
    return "Unknown";
  }
}