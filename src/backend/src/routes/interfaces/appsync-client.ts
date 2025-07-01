import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Sha256 } from "@aws-crypto/sha256-js";
import { Route } from "../domain/entities/route-entity";

const url = process.env.APPSYNC_URL;
const apiKey = process.env.APPSYNC_API_KEY;
const region = process.env.APPSYNC_REGION || process.env.AWS_REGION || "us-east-1";

async function send(query: string, variables: Record<string, any>): Promise<any> {
  if (!url) return;
  const body = JSON.stringify({ query, variables });
  if (apiKey) {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body,
    });
    return res.json();
  }

  const { hostname, pathname, protocol } = new URL(url);
  const request = new HttpRequest({
    protocol,
    hostname,
    method: "POST",
    path: pathname,
    headers: { "Content-Type": "application/json", host: hostname },
    body,
  });

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region,
    service: "appsync",
    sha256: Sha256,
  });
  const signed = await signer.sign(request);
  const res = await fetch(url, {
    method: "POST",
    headers: signed.headers as any,
    body,
  });
  return res.json();
}

export async function publishFavouriteSaved(email: string, routeId: string) {
  await send(
    `mutation PublishFavouriteSaved($email: String!, $routeId: ID!) {\n  publishFavouriteSaved(email: $email, routeId: $routeId)\n}`,
    { email, routeId }
  );
}

export async function publishFavouriteDeleted(email: string, routeId: string) {
  await send(
    `mutation PublishFavouriteDeleted($email: String!, $routeId: ID!) {\n  publishFavouriteDeleted(email: $email, routeId: $routeId)\n}`,
    { email, routeId }
  );
}

export async function publishRoutesGenerated(jobId: string, routes: Route[]) {
  const inputs = routes.map((r) => ({
    routeId: r.routeId.Value,
    distanceKm: r.distanceKm?.Value,
    duration: r.duration?.Value,
    path: r.path?.Encoded,
  }));
  await send(
    `mutation PublishRoutesGenerated($jobId: ID!, $routes: [RouteInput]!) {\n  publishRoutesGenerated(jobId: $jobId, routes: $routes)\n}`,
    { jobId, routes: inputs }
  );
}
