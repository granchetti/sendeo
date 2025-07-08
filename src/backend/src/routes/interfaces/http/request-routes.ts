import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { RouteId } from "../../domain/value-objects/route-id-value-object";

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
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }
  if (!data.routeId) {
    data.routeId = RouteId.generate().Value;
  }
  if (data.routesCount !== undefined) {
    const num = parseInt(String(data.routesCount), 10);
    if (!isNaN(num) && num > 0) data.routesCount = num;
    else delete data.routesCount;
  }

  await sqs.send(
    new SendMessageCommand({
      QueueUrl: process.env.QUEUE_URL,
      MessageBody: JSON.stringify(data),
    })
  );

  return {
    statusCode: 202,
    body: JSON.stringify({ enqueued: true, routeId: data.routeId }),
  };
};
