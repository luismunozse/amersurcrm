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

/**
 * Maneja errores de Supabase de forma consistente.
 * Convierte códigos de error PostgreSQL/PostgREST a mensajes amigables.
 * Retorna null si no hay error.
 */
export function handleSupabaseError(
  error: { message: string; code?: string; details?: string; hint?: string } | null,
  context: string,
): { success: false; error: string } | null {
  if (!error) return null;

  errorLogger.error(`[Supabase:${context}]`, new Error(error.message), {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });

  const SUPABASE_ERROR_MAP: Record<string, string> = {
    'PGRST116': 'No se encontró el registro',
    '23505': 'Ya existe un registro con esos datos',
    '23503': 'No se puede realizar: existen registros relacionados',
    '42501': 'No tienes permisos para realizar esta acción',
    'PGRST301': 'Sesión expirada, por favor vuelve a iniciar sesión',
    '23502': 'Faltan datos obligatorios',
    '22P02': 'Formato de datos inválido',
  };

  const userMessage = (error.code && SUPABASE_ERROR_MAP[error.code]) || error.message || 'Error inesperado';
  return { success: false, error: userMessage };
}
