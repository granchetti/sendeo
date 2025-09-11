import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { SQSClient } from "@aws-sdk/client-sqs";
import { DynamoRouteRepository } from "./dynamodb/dynamo-route-repository";
import { GoogleRoutesProvider } from "./google-maps/google-routes-provider";
import { SQSRouteRequestQueue } from "./sqs-route-request-queue";
import { SQSQueuePublisher } from "./sqs-queue-publisher";
import { createRequestRoutesHandler } from "../interfaces/http/request-routes";
import { createWorkerRoutesHandler } from "../interfaces/sqs/worker-routes";
import { QueuePublisher } from "../domain/queues/queue-publisher";

const sqs = new SQSClient({});

const requestQueue = new SQSRouteRequestQueue(sqs, process.env.QUEUE_URL!);
export const requestRoutesHandler = createRequestRoutesHandler(requestQueue);

const dynamo = new DynamoDBClient({
  endpoint: process.env.AWS_ENDPOINT_URL_DYNAMODB,
});
const routeRepository = new DynamoRouteRepository(
  dynamo,
  process.env.ROUTES_TABLE!
);
const mapProvider = new GoogleRoutesProvider(process.env.GOOGLE_API_KEY!);
const metricsPublisher: QueuePublisher = process.env.METRICS_QUEUE
  ? new SQSQueuePublisher(sqs, process.env.METRICS_QUEUE)
  : { send: async () => {} };

export const workerRoutesHandler = createWorkerRoutesHandler(
  routeRepository,
  mapProvider,
  metricsPublisher
);
