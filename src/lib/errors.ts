import { errorLogger } from './errorLogger';

export class AppError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 'VALIDATION_ERROR', 400);
    this.name = 'ValidationError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, public originalError?: Error) {
    super(message, 'DATABASE_ERROR', 500);
    this.name = 'DatabaseError';
  }
}

export class AuthError extends AppError {
  constructor(message: string) {
    super(message, 'AUTH_ERROR', 401);
    this.name = 'AuthError';
  }
}

export function getErrorMessage(err: unknown): string {
  if (err instanceof AppError) {
    // Log del error personalizado
    errorLogger.error(`App Error: ${err.message}`, err, {
      code: err.code,
      statusCode: err.statusCode,
      context: err.context,
    });
    return err.message;
  }
  
  if (err instanceof Error) {
    // Log de errores estándar
    errorLogger.error('Standard Error', err);
    return err.message;
  }
  
  if (typeof err === "string") {
    errorLogger.warn('String error received', { error: err });
    return err;
  }
  
  if (typeof err === "object" && err !== null && "message" in err) {
    const maybe = (err as Record<string, unknown>).message;
    if (typeof maybe === "string") {
      errorLogger.warn('Object with message property', { error: err });
      return maybe;
    }
  }
  
  try {
    const jsonError = JSON.stringify(err);
    errorLogger.error('JSON stringified error', new Error('JSON error'), { error: err });
    return jsonError;
  } catch {
    errorLogger.error('Unknown error type', new Error('Unknown error'), { error: err });
    return "Ocurrió un error";
  }
}

export function handleError(error: unknown, context?: Record<string, unknown>): never {
  const message = getErrorMessage(error);
  errorLogger.error('Handled error', error instanceof Error ? error : new Error(message), context);
  throw new AppError(message, 'HANDLED_ERROR', 500, context);
}
