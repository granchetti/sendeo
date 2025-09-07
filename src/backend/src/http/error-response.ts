import { APIGatewayProxyResult } from "aws-lambda";
import { corsHeaders } from "./cors";
import { getTraceId } from "./base";

export function errorResponse(
  code: number,
  message: string,
  details?: unknown
): APIGatewayProxyResult {
  const body: Record<string, unknown> = { code, message };
  const traceId = getTraceId();
  if (traceId) {
    body.traceId = traceId;
    console.error(`traceId:${traceId} error:${message}`);
  }
  if (details !== undefined) {
    body.details = details;
  }
  return {
    statusCode: code,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}
