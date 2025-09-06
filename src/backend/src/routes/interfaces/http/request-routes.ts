import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { UUID } from "../../../shared/domain/value-objects/uuid";
import { corsHeaders } from "../../../http/cors";

const sqs = new SQSClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  let data: any = {};
  if (event.body) {
    try {
      data = JSON.parse(event.body);
    } catch (err) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }

  if (
    typeof data.origin !== "string" ||
    (!data.destination && data.distanceKm == null)
  ) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Must provide origin and (destination OR distanceKm)",
      }),
    };
  }

  if (!data.jobId) {
    data.jobId = UUID.generate().Value;
  }

  if (data.maxDeltaKm != null) {
    const n = Number(data.maxDeltaKm);
    if (!Number.isNaN(n)) {
      data.maxDeltaKm = n;
    } else {
      delete data.maxDeltaKm;
    }
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

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(data),
    })
  );

  return {
    statusCode: 202,
    headers: corsHeaders,
    body: JSON.stringify({ enqueued: true, jobId: data.jobId }),
  };
};
