export abstract class AppError extends Error {
  constructor(public readonly errorCode: string, message: string) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, errorCode = 'VALIDATION_ERROR') {
    super(errorCode, message);
  }
}

export class InvalidDistanceError extends ValidationError {
  constructor(message = 'Distance cannot be negative') {
    super(message, 'INVALID_DISTANCE');
  }
}

export class RouteNotFoundError extends AppError {
  constructor(message = 'Route not found') {
    super('ROUTE_NOT_FOUND', message);
  }
}
