import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "./dynamodb/dynamo-route-repository";
import { GoogleRoutesProvider } from "./google-maps/google-routes-provider";
import { SQSRouteRequestQueue } from "./sqs-route-request-queue";
import { SQSQueuePublisher } from "./sqs-queue-publisher";
import { createRequestRoutesHandler } from "../interfaces/http/request-routes";
import { createWorkerRoutesHandler } from "../interfaces/sqs/worker-routes";
import { getGoogleKey } from "../interfaces/shared/utils";
import { InMemoryEventDispatcher } from "../../shared/domain/events/event-dispatcher";
import { RequestRoutesUseCase } from "../application/use-cases/request-routes";
import { RouteRequestedEvent } from "../domain/events/route-requested";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const sqs = new SQSClient({});

const routeRepository = new DynamoRouteRepository(
  dynamo,
  process.env.ROUTES_TABLE!,
);

const eventDispatcher = new InMemoryEventDispatcher();
const routeRequestQueue = new SQSRouteRequestQueue(
  sqs,
  process.env.QUEUE_URL!,
);
eventDispatcher.subscribe("RouteRequested", async (event: RouteRequestedEvent) => {
  await routeRequestQueue.send(
    JSON.stringify({ eventName: event.eventName, routeId: event.routeId.Value }),
  );
});

const requestRoutesUseCase = new RequestRoutesUseCase(
  routeRepository,
  eventDispatcher,
);

export const requestRoutesHandler = createRequestRoutesHandler(
  requestRoutesUseCase,
);

const metricsPublisher = new SQSQueuePublisher(
  sqs,
  process.env.METRICS_QUEUE || "",
);

export const workerRoutesHandler = async (
  event: any,
  context: any,
) => {
  const key = await getGoogleKey();
  const provider = new GoogleRoutesProvider(key);
  const handler = createWorkerRoutesHandler(
    routeRepository,
    provider,
    metricsPublisher,
  );
  return handler(event, context);
};

