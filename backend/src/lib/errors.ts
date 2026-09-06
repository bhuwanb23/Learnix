export class AppError extends Error {
  readonly code: string;
  readonly httpStatus: number;
  readonly details?: unknown;

  constructor(code: string, httpStatus: number, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
  }
}

export const badRequest = (msg: string, details?: unknown) =>
  new AppError('VALIDATION_ERROR', 400, msg, details);
export const unauthenticated = (msg = 'Authentication required') =>
  new AppError('AUTH_UNAUTHENTICATED', 401, msg);
export const forbidden = (msg = 'Forbidden') => new AppError('AUTH_FORBIDDEN', 403, msg);
export const notFound = (msg = 'Resource not found') => new AppError('NOT_FOUND', 404, msg);
export const conflict = (msg: string) => new AppError('CONFLICT', 409, msg);
export const unprocessable = (msg: string, details?: unknown) =>
  new AppError('UNPROCESSABLE', 422, msg, details);
