import { APIGatewayProxyResult } from "aws-lambda";
import { jsonHeaders } from "./cors";

export function errorResponse(
  code: number,
  message: string,
  details?: unknown
): APIGatewayProxyResult {
  const body: Record<string, unknown> = { code, message };
  if (details !== undefined) {
    body.details = details;
  }
  return {
    statusCode: code,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}
