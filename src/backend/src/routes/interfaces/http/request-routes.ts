import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { RouteId } from '../../domain/value-objects/route-id-value-object';

const sqs = new SQSClient({});

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  const data = event.body ? JSON.parse(event.body) : {};
  if (!data.routeId) {
    data.routeId = RouteId.generate().Value;
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