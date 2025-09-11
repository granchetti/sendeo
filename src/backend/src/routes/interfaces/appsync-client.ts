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

export async function publishFavouriteSaved(
  email: string,
  routeId: string,
  version = 1
) {
  await send(
    `mutation PublishFavouriteSaved($email: String!, $routeId: ID!, $version: Int!) {\n  publishFavouriteSaved(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version }
  );
}

export async function publishFavouriteDeleted(
  email: string,
  routeId: string,
  version = 1
) {
  await send(
    `mutation PublishFavouriteDeleted($email: String!, $routeId: ID!, $version: Int!) {\n  publishFavouriteDeleted(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version }
  );
}

export async function publishRoutesGenerated(
  jobId: string,
  routes: Route[],
  correlationId?: string,
  version = 1
) {
  const inputs = routes.map((r) => ({
    routeId: r.routeId.Value,
    distanceKm: r.distanceKm?.Value,
    duration: r.duration?.Value,
    path: r.path?.Encoded,
    description: r.description,
  }));
  await send(
    `mutation PublishRoutesGenerated($jobId: ID!, $routes: [RouteInput]!, $correlationId: ID, $version: Int!) {\n  publishRoutesGenerated(jobId: $jobId, routes: $routes, correlationId: $correlationId, version: $version)\n}`,
    { jobId, routes: inputs, correlationId, version }
  );
}

export async function publishRouteStarted(
  email: string,
  routeId: string,
  version = 1
) {
  await send(
    `mutation PublishRouteStarted($email: String!, $routeId: ID!, $version: Int!) {\n  publishRouteStarted(email: $email, routeId: $routeId, version: $version)\n}`,
    { email, routeId, version }
  );
}

export async function publishRouteFinished(
  email: string,
  routeId: string,
  summary: string,
  version = 1
) {
  await send(
    `mutation PublishRouteFinished($email: String!, $routeId: ID!, $summary: String!, $version: Int!) {\n  publishRouteFinished(email: $email, routeId: $routeId, summary: $summary, version: $version)\n}`,
    { email, routeId, summary, version }
  );
}

export async function publishErrorOccurred(
  message: string,
  payload: any,
  correlationId?: string,
  version = 1
) {
  await send(
    `mutation PublishErrorOccurred($message: String!, $payload: AWSJSON, $correlationId: ID, $version: Int!) {\n  publishErrorOccurred(message: $message, payload: $payload, correlationId: $correlationId, version: $version)\n}`,
    { message, payload, correlationId, version }
  );
}
