import { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { UUID } from "../shared/domain/value-objects/uuid";
import { setTraceId, clearTraceId } from "./trace-context";
import { errorResponse } from "./error-response";

export function withTraceId(
  handler: APIGatewayProxyHandler
): APIGatewayProxyHandler {
  return async (event, context): Promise<APIGatewayProxyResult> => {
    const traceId = UUID.generate().Value;
    setTraceId(traceId);
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: any[]) => originalLog(`[${traceId}]`, ...args);
    console.error = (...args: any[]) => originalError(`[${traceId}]`, ...args);
    try {
      const result = await new Promise<APIGatewayProxyResult | undefined>(
        (resolve, reject) => {
          try {
            const maybe = handler(
              event,
              context,
              (err?: any, res?: APIGatewayProxyResult) => {
                if (err) {
                  reject(err);
                } else {
                  resolve(res);
                }
              }
            );
            if (maybe && typeof (maybe as any).then === "function") {
              (maybe as Promise<APIGatewayProxyResult>).then(resolve, reject);
            }
          } catch (e) {
            reject(e);
          }
        }
      );
      if (!result) {
        return {
          statusCode: 204,
          body: "",
        };
      }
      if (result.statusCode >= 400) {
        try {
          const body = JSON.parse(result.body);
          if (body && typeof body === "object" && body.error && !body.traceId) {
            body.traceId = traceId;
            result.body = JSON.stringify(body);
          }
        } catch {
          // ignore parse errors
        }
      }
      return result;
    } catch (err) {
      console.error("Unhandled error:", err);
      return errorResponse(500, "Internal Server Error", traceId);
    } finally {
      console.log = originalLog;
      console.error = originalError;
      clearTraceId();
    }
  };
}
