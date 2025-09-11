import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { jsonHeaders } from "../../../http/cors";
import { errorResponse } from "../../../http/error-response";
import { base } from "../../../http/base";
import { rateLimit } from "../../../http/rate-limit";

const sqs = new SQSClient({});

export const handler = base(rateLimit(async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let data: any = {};
  if (event.body) {
    try {
      data = JSON.parse(event.body);
    } catch (err) {
      return errorResponse(400, "Invalid JSON body");
    }
  }

  if (
    typeof data.origin !== "string" ||
    (!data.destination && data.distanceKm == null)
  ) {
    return errorResponse(
      400,
      "Must provide origin and (destination OR distanceKm)"
    );
  }

  if (!data.jobId) {
    data.jobId = UUID.generate().Value;
  }

  if (!data.correlationId) {
    data.correlationId = UUID.generate().Value;
  } else {
    data.correlationId = String(data.correlationId);
  }

  if (data.distanceKm != null) {
    const d = parseFloat(String(data.distanceKm));
    if (isNaN(d) || d < 1 || d > 100) {
      return errorResponse(400, "distanceKm must be between 1 and 100");
    }
    data.distanceKm = d;
  }

  if (data.routesCount != null) {
    const c = parseInt(String(data.routesCount), 10);
    if (c > 0) {
      data.routesCount = c;
    } else {
      delete data.routesCount;
    }
  }

  if (data.preference != null) {
    data.preference = String(data.preference);
  }

  data.version = 1;

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(data),
    })
  );

  return {
    statusCode: 202,
    headers: jsonHeaders,
    body: JSON.stringify({ enqueued: true, jobId: data.jobId }),
  };
}));
