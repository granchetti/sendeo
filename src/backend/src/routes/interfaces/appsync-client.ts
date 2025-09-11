import { HttpRequest } from "@aws-sdk/protocol-http";
import { SignatureV4 } from "@aws-sdk/signature-v4";
import { defaultProvider } from "@aws-sdk/credential-provider-node";
import { Sha256 } from "@aws-crypto/sha256-js";
import { Route } from "../domain/entities/route";

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
    `mutation PublishFavouriteSaved($email: String!, $routeId: ID!, $version: Int!) {\n  publishFavouriteSaved(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version: 1 }
  );
}

export async function publishFavouriteDeleted(email: string, routeId: string) {
  await send(
    `mutation PublishFavouriteDeleted($email: String!, $routeId: ID!, $version: Int!) {\n  publishFavouriteDeleted(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version: 1 }
  );
}

export async function publishRoutesGenerated(jobId: string, routes: Route[]) {
  const inputs = routes.map((r) => ({
    routeId: r.routeId.Value,
    distanceKm: r.distanceKm?.Value,
    duration: r.duration?.Value,
    path: r.path?.Encoded,
    description: r.description,
  }));
  await send(
    `mutation PublishRoutesGenerated($jobId: ID!, $routes: [RouteInput]!, $version: Int!) {\n  publishRoutesGenerated(jobId: $jobId, routes: $routes, version: $version)\n}`,
    { jobId, routes: inputs, version: 1 }
  );
}

export async function publishRouteStarted(email: string, routeId: string) {
  await send(
    `mutation PublishRouteStarted($email: String!, $routeId: ID!, $version: Int!) {\n  publishRouteStarted(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version: 1 }
  );
}

export async function publishRouteFinished(
  email: string,
  routeId: string,
  summary: string
) {
  await send(
    `mutation PublishRouteFinished($email: String!, $routeId: ID!, $summary: String!, $version: Int!) {\n  publishRouteFinished(email: $email, routeId: $routeId, summary: $summary, version: $version)\n}`,
    { email, routeId, summary, version: 1 }
  );
}

export async function publishErrorOccurred(
  message: string,
  payload: any
) {
  await send(
    `mutation PublishErrorOccurred($message: String!, $payload: AWSJSON, $version: Int!) {\n  publishErrorOccurred(message: $message, payload: $payload, version: $version)\n}`,
    { message, payload, version: 1 }
  );
}
