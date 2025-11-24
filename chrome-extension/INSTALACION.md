# Guía Rápida de Instalación - AmersurChat

## Paso 1: Cargar la extensión en Chrome

1. Abre Google Chrome
2. Ve a `chrome://extensions/`
3. Activa el **"Modo de desarrollador"** (toggle en esquina superior derecha)
4. Click en **"Cargar extensión sin empaquetar"**
5. Navega a: `/home/luismunozse/Escritorio/amersurcrm/chrome-extension/dist`
6. Click en **"Seleccionar carpeta"**

✅ La extensión AmersurChat debería aparecer en la lista

## Paso 2: Configurar permisos

La extensión necesita permisos para:
- Acceder a WhatsApp Web
- Comunicarse con el CRM
- Guardar configuración localmente

Chrome pedirá confirmación la primera vez.

## Paso 3: Usar AmersurChat

1. Abre [WhatsApp Web](https://web.whatsapp.com)
2. Verás un **botón flotante verde** en la esquina superior derecha
3. Click en el botón para abrir el sidebar
4. **Inicia sesión**:
   - URL del CRM: `http://localhost:3000` (o tu URL de producción)
   - Email: tu email del CRM
   - Contraseña: tu contraseña del CRM

## Paso 4: Probar la funcionalidad

1. Selecciona cualquier chat en WhatsApp Web
2. El sidebar mostrará:
   - Nombre y teléfono del contacto
   - Si existe en el CRM (con todos sus datos)
   - Botón para crear lead si es nuevo

3. Para crear un lead nuevo:
   - Completa el nombre (pre-llenado)
   - Opcionalmente agrega el primer mensaje
   - Click en **"Crear Lead en CRM"**
   - ✅ El lead se creará y asignará automáticamente

## Solución rápida de problemas

### No veo el botón verde en WhatsApp Web
- Refresca la página (F5)
- Verifica que la extensión esté activa en `chrome://extensions/`

### No puedo iniciar sesión
- Verifica que el CRM esté corriendo (`npm run dev`)
- Comprueba la URL del CRM (debe incluir http:// o https://)

### "Error buscando cliente"
- Asegúrate de estar autenticado
- Verifica que el endpoint `/api/clientes/search` esté funcionando

## Desarrollo local

Para hacer cambios en la extensión:

```bash
# Terminal 1: Compilar extensión en modo watch
cd chrome-extension
npm run dev

# Después de cada cambio:
# 1. Ve a chrome://extensions/
# 2. Click en el botón de recarga de AmersurChat
```

## Arquitectura

```
WhatsApp Web
    ↓
Content Script (detecta contacto)
    ↓
Sidebar React (muestra info)
    ↓
API del CRM (busca/crea leads)
```

## Próximos pasos

- [ ] Personalizar iconos con logo de Amersur
- [ ] Agregar plantillas de mensajes rápidos
- [ ] Mostrar historial de interacciones
- [ ] Permitir cambiar estado del lead
- [ ] Notificaciones de tareas pendientes
