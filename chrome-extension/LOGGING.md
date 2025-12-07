# Sistema de Logging - AmersurChat Extension

## Descripción

El sistema de logging proporciona logging estructurado y detallado para debugging en producción. Permite controlar el nivel de logging y exportar logs para reportar bugs.

## Uso Básico

```typescript
import { createLogger } from '@/lib/logger';

const logger = createLogger('MiComponente');

// Diferentes niveles de logging
logger.debug('Información detallada para debugging', { data: 'valor' });
logger.info('Información general', { userId: 123 });
logger.warn('Advertencia', { error: 'algo salió mal' }, error);
logger.error('Error crítico', error, { contexto: 'adicional' });
```

## Niveles de Logging

- **DEBUG (0)**: Información muy detallada, solo para desarrollo
- **INFO (1)**: Información general sobre el flujo de la aplicación (por defecto)
- **WARN (2)**: Advertencias que no detienen la ejecución
- **ERROR (3)**: Errores críticos que requieren atención
- **NONE (4)**: Desactivar todos los logs

## Configurar Nivel de Logging

### Desde el código:

```typescript
import { LogLevel, logger } from '@/lib/logger';

// Cambiar nivel global
logger.setLevel(LogLevel.DEBUG); // Mostrar todos los logs
logger.setLevel(LogLevel.ERROR);  // Solo errores
logger.setLevel(LogLevel.NONE);  // Desactivar logs
```

### Desde Chrome DevTools (en producción):

```javascript
// En la consola de la extensión
chrome.storage.local.set({ logLevel: 0 }); // DEBUG
chrome.storage.local.set({ logLevel: 1 }); // INFO
chrome.storage.local.set({ logLevel: 2 }); // WARN
chrome.storage.local.set({ logLevel: 3 }); // ERROR
chrome.storage.local.set({ logLevel: 4 }); // NONE
```

## Exportar Logs

Para reportar bugs, puedes exportar los logs:

```typescript
import { logger } from '@/lib/logger';

// Obtener historial de logs
const logs = logger.getHistory();
console.log(logs);

// Exportar como texto (útil para copiar/pegar)
const logsText = logger.exportLogs();
console.log(logsText);

// Limpiar historial
logger.clearHistory();
```

## Características

1. **Logging estructurado**: Cada log incluye timestamp, nivel, contexto y datos
2. **Historial limitado**: Mantiene los últimos 100 logs en memoria
3. **Envío automático de errores**: Los errores críticos se envían al servidor (si está configurado)
4. **Contexto por módulo**: Cada logger tiene su propio contexto para facilitar el debugging
5. **Deep cloning**: Los datos se clonan para evitar mutaciones

## Ejemplo de Log

```
[2024-01-15T10:30:45.123Z] [INFO] [CRMApiClient] Petición exitosa
Data: {
  "requestId": "GET /api/clientes/search",
  "responseTime": "234ms",
  "dataSize": 1024
}
```

## Mejores Prácticas

1. **Usar contexto descriptivo**: `createLogger('NombreComponente')` en lugar de `createLogger('C1')`
2. **Incluir datos relevantes**: Pasar objetos con información útil para debugging
3. **No loggear información sensible**: Evitar passwords, tokens completos, etc.
4. **Usar niveles apropiados**: 
   - DEBUG: Para información muy detallada
   - INFO: Para eventos importantes del flujo
   - WARN: Para situaciones inesperadas pero manejables
   - ERROR: Solo para errores reales

## Integración con Servidor

Los errores críticos (ERROR) se envían automáticamente al servidor si:
- Hay una URL de CRM configurada
- Hay un token de autenticación válido
- El endpoint `/api/logs/extension` existe en el servidor

Esto permite monitorear errores en producción sin necesidad de acceso a las consolas de los usuarios.

