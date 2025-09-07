import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { AsyncLocalStorage } from "async_hooks";
import { UUID } from "../shared/domain/value-objects/uuid";

const storage = new AsyncLocalStorage<{ traceId: string }>();

export const getTraceId = (): string | undefined => {
  return storage.getStore()?.traceId;
};

type Handler = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

export const base = (handler: Handler): Handler => {
  return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const traceId = UUID.generate().Value;
    return storage.run({ traceId }, async () => {
      console.log(`traceId:${traceId}`);
      try {
        return await handler(event);
      } catch (err) {
        console.error(`traceId:${traceId}`, err);
        throw err;
      }
    });
  };
};
