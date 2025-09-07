import { APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "./cors";
import { getTraceId } from "./trace-context";

export function errorResponse(
  statusCode: number,
  message: string,
  traceId: string | undefined = getTraceId()
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(
      traceId ? { error: message, traceId } : { error: message }
    ),
  };
}
