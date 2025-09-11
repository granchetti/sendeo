import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "./dynamodb/dynamo-route-repository";
import { GoogleRoutesProvider } from "./google-maps/google-routes-provider";
import { SQSRouteRequestQueue } from "./sqs-route-request-queue";
import { SQSQueuePublisher } from "./sqs-queue-publisher";
import { createRequestRoutesHandler } from "../interfaces/http/request-routes";
import { createWorkerRoutesHandler } from "../interfaces/sqs/worker-routes";
import { getGoogleKey } from "../interfaces/shared/utils";

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const sqs = new SQSClient({});

const routeRepository = new DynamoRouteRepository(
  dynamo,
  process.env.ROUTES_TABLE!
);

export const requestRoutesHandler = createRequestRoutesHandler(
  new SQSRouteRequestQueue(sqs, process.env.QUEUE_URL!)
);

const metricsPublisher = new SQSQueuePublisher(
  sqs,
  process.env.METRICS_QUEUE || ""
);

export const workerRoutesHandler = async (
  event: any,
  context: any
) => {
  const key = await getGoogleKey();
  const provider = new GoogleRoutesProvider(key);
  const handler = createWorkerRoutesHandler(
    routeRepository,
    provider,
    metricsPublisher
  );
  return handler(event, context);
};

