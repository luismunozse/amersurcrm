# Información sobre Manifest V3

La extensión AmersurChat usa **Manifest V3**, que es el estándar actual de Chrome.

## Diferencias vs Manifest V2

| Aspecto | V2 (antiguo) | V3 (actual) |
|---|---|---|
| Background | Página persistente | Service Worker |
| Permisos | Todos por defecto | Solo los necesarios |
| Seguridad | Menor | Mayor |
| Performance | Peor | Mejor |
| Soporte | Deprecated 2024 | Actual |

## Permisos usados

```json
{
  "permissions": [
    "storage",      // Guardar auth y config
    "activeTab"     // Interactuar con WhatsApp Web
  ],
  "host_permissions": [
    "https://web.whatsapp.com/*",  // WhatsApp Web
    "http://localhost:3000/*",      // CRM local
    "https://*.vercel.app/*"        // CRM producción
  ]
}
```

## Limitaciones de Manifest V3

1. **No eval()**: No se puede usar `eval()` por seguridad
   - ✅ Resuelto: Usamos React compilado

2. **Service Worker**: No puede mantenerse vivo indefinidamente
   - ✅ Resuelto: Usamos alarmas para keep-alive

3. **Permisos explícitos**: Hay que declarar todos los hosts
   - ✅ Resuelto: Declaramos localhost y Vercel

## Content Security Policy (CSP)

```json
{
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'"
  }
}
```

Esto significa:
- Solo scripts del paquete de la extensión
- No scripts inline
- No scripts externos (CDN)

✅ Cumplimos todas las políticas

## Web Accessible Resources

```json
{
  "web_accessible_resources": [{
    "resources": ["sidebar.html", "sidebar.js"],
    "matches": ["https://web.whatsapp.com/*"]
  }]
}
```

Permite que WhatsApp Web cargue nuestro sidebar.

## Migración futura

Si Chrome lanza Manifest V4:
- La estructura modular facilitará la migración
- Background service worker ya cumple estándares
- Permisos granulares facilitan adaptación
