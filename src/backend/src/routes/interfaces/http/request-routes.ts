import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { RouteId } from "../../domain/value-objects/route-id-value-object";

const sqs = new SQSClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  // 1️⃣ Parsear body
  let data: any;
  try {
    data = event.body ? JSON.parse(event.body) : {};
  } catch {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  if (!data.routeId) {
    data.routeId = RouteId.generate().Value;
  }

  if (data.maxDeltaKm !== undefined) {
    const n = Number(data.maxDeltaKm);
    if (!isNaN(n)) {
      data.maxDeltaKm = n;
    } else {
      delete data.maxDeltaKm;
    }
  }

  if (data.routesCount !== undefined) {
    const n = parseInt(String(data.routesCount), 10);
    if (!isNaN(n) && n > 0) {
      data.routesCount = n;
    } else {
      delete data.routesCount;
    }
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(data),
    })
  );

  return {
    statusCode: 200,
    body: JSON.stringify({ routeId: data.routeId }),
  };
};
