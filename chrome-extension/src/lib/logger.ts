/**
 * Sistema de logging detallado para debugging en producción
 * Permite controlar el nivel de logging y enviar logs estructurados
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

interface LogEntry {
  timestamp: string;
  level: string;
  context: string;
  message: string;
  data?: any;
  error?: Error;
  stack?: string;
}

class Logger {
  private currentLevel: LogLevel = LogLevel.INFO;
  private context: string;
  private logHistory: LogEntry[] = [];
  private maxHistorySize = 100;

  constructor(context: string) {
    this.context = context;
    this.loadLogLevel();
  }

  /**
   * Cargar nivel de logging desde storage (permite configurar en producción)
   */
  private async loadLogLevel() {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['logLevel']);
        if (result.logLevel !== undefined) {
          this.currentLevel = result.logLevel as LogLevel;
        }
      }
    } catch (error) {
      // Ignorar errores al cargar configuración
    }
  }

  /**
   * Establecer nivel de logging
   */
  setLevel(level: LogLevel) {
    this.currentLevel = level;
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({ logLevel: level });
    }
  }

  /**
   * Registrar entrada de log
   */
  private log(level: LogLevel, levelName: string, message: string, data?: any, error?: Error) {
    if (level < this.currentLevel) {
      return; // No mostrar logs por debajo del nivel actual
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: levelName,
      context: this.context,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : undefined, // Deep clone para evitar mutaciones
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } as any : undefined,
      stack: error?.stack,
    };

    // Agregar al historial
    this.logHistory.push(entry);
    if (this.logHistory.length > this.maxHistorySize) {
      this.logHistory.shift();
    }

    // Formatear mensaje para consola
    const prefix = `[${entry.timestamp}] [${levelName}] [${this.context}]`;
    const logMessage = `${prefix} ${message}`;

    // Usar el método de consola apropiado según el nivel
    switch (level) {
      case LogLevel.DEBUG:
        console.debug(logMessage, data || '');
        break;
      case LogLevel.INFO:
        console.info(logMessage, data || '');
        break;
      case LogLevel.WARN:
        console.warn(logMessage, data || '');
        if (error) console.warn('Error details:', error);
        break;
      case LogLevel.ERROR:
        console.error(logMessage, data || '');
        if (error) {
          console.error('Error:', error);
          if (error.stack) console.error('Stack:', error.stack);
        }
        break;
    }

    // En producción, también enviar errores críticos al servidor (opcional)
    if (level === LogLevel.ERROR && typeof chrome !== 'undefined') {
      this.sendErrorToServer(entry).catch(() => {
        // Ignorar errores al enviar logs al servidor
      });
    }
  }

  /**
   * Enviar error crítico al servidor para análisis
   */
  private async sendErrorToServer(entry: LogEntry) {
    try {
      // Solo enviar en producción y si hay configuración
      if (typeof chrome === 'undefined' || !chrome.storage) return;

      const config = await chrome.storage.local.get(['crmUrl', 'authToken']);
      if (!config.crmUrl || !config.authToken) return;

      // Enviar a endpoint de logging
      fetch(`${config.crmUrl}/api/logs/extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.authToken}`,
        },
        body: JSON.stringify({
          level: entry.level,
          context: entry.context,
          message: entry.message,
          data: entry.data,
          error: entry.error,
          timestamp: entry.timestamp,
          userAgent: navigator.userAgent,
          url: window.location.href,
        }),
      }).catch(() => {
        // Ignorar errores silenciosamente
      });
    } catch {
      // Ignorar errores
    }
  }

  /**
   * Enviar métrica de performance al servidor
   */
  async sendMetric(metricType: string, metricName: string, value: number, unit: string = 'ms', metadata?: any) {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage) return;

      const config = await chrome.storage.local.get(['crmUrl', 'authToken']);
      if (!config.crmUrl || !config.authToken) return;

      fetch(`${config.crmUrl}/api/metrics/extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.authToken}`,
        },
        body: JSON.stringify({
          metric_type: metricType,
          metric_name: metricName,
          value,
          unit,
          metadata,
        }),
      }).catch(() => {
        // Ignorar errores silenciosamente
      });
    } catch {
      // Ignorar errores
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, 'DEBUG', message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, 'INFO', message, data);
  }

  warn(message: string, data?: any, error?: Error) {
    this.log(LogLevel.WARN, 'WARN', message, data, error);
  }

  error(message: string, error?: Error, data?: any) {
    this.log(LogLevel.ERROR, 'ERROR', message, data, error);
  }

  /**
   * Obtener historial de logs (útil para debugging)
   */
  getHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  /**
   * Limpiar historial
   */
  clearHistory() {
    this.logHistory = [];
  }

  /**
   * Exportar logs como texto (útil para reportar bugs)
   */
  exportLogs(): string {
    return this.logHistory
      .map((entry) => {
        const parts = [
          `[${entry.timestamp}] [${entry.level}] [${entry.context}] ${entry.message}`,
        ];
        if (entry.data) {
          parts.push(`Data: ${JSON.stringify(entry.data, null, 2)}`);
        }
        if (entry.error) {
          parts.push(`Error: ${entry.error.message}`);
          if (entry.stack) {
            parts.push(`Stack: ${entry.stack}`);
          }
        }
        return parts.join('\n');
      })
      .join('\n\n');
  }
}

/**
 * Crear logger para un contexto específico
 */
export function createLogger(context: string): Logger {
  return new Logger(context);
}

/**
 * Logger global para uso rápido
 */
export const logger = createLogger('AmersurChat');

