// Sistema de logging centralizado
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug'
}

export interface LogEntry {
  level: LogLevel;
  message: string;
  error?: Error;
  context?: Record<string, unknown>;
  timestamp: Date;
  userId?: string;
}

class ErrorLogger {
  private logs: LogEntry[] = [];

  log(level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>) {
    const entry: LogEntry = {
      level,
      message,
      error,
      context,
      timestamp: new Date(),
    };

    this.logs.push(entry);

    // En desarrollo, mostrar en consola
    if (process.env.NODE_ENV === 'development') {
      console[level](`[${level.toUpperCase()}] ${message}`, error, context);
    }

    // En producción, enviar a servicio de logging
    if (process.env.NODE_ENV === 'production') {
      this.sendToLoggingService(entry);
    }
  }

  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this.log(LogLevel.ERROR, message, error, context);
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.WARN, message, undefined, context);
  }

  info(message: string, context?: Record<string, unknown>) {
    this.log(LogLevel.INFO, message, undefined, context);
  }

  private async sendToLoggingService(entry: LogEntry) {
    // Aquí podrías integrar con servicios como Sentry, LogRocket, etc.
    try {
      // Ejemplo: enviar a endpoint de logging
      await fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry),
      });
    } catch (err) {
      console.error('Failed to send log to service:', err);
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();
