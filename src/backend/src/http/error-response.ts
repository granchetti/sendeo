import { APIGatewayProxyResult } from "aws-lambda";
import { jsonHeaders } from "./cors";
import { getTraceId } from "./base";
import {
  AppError,
  InvalidDistanceError,
  RouteNotFoundError,
  ValidationError,
} from "../shared/errors";
function buildResponse(
  statusCode: number,
  code: string | number,
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
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  };
}

export function errorResponse(
  code: number,
  message: string,
  details?: unknown
): APIGatewayProxyResult {
  return buildResponse(code, code, message, details);
}

export function errorResponseFromError(
  error: unknown
): APIGatewayProxyResult {
  if (error instanceof RouteNotFoundError) {
    return buildResponse(404, error.errorCode, error.message);
  }
  if (error instanceof InvalidDistanceError) {
    return buildResponse(400, error.errorCode, error.message);
  }
  if (error instanceof ValidationError) {
    return buildResponse(400, error.errorCode, error.message);
  }
  if (error instanceof AppError) {
    return buildResponse(500, error.errorCode, error.message);
  }
  return buildResponse(500, "INTERNAL_ERROR", "Internal Server Error");
}
