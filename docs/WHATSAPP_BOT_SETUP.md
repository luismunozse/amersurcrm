# Configuración del Bot de WhatsApp Web

Guía paso a paso para configurar el bot de WhatsApp que captura leads automáticamente desde publicidades de Facebook/Instagram.

## 📌 Contexto

Cuando alguien ve una publicidad en Facebook/Instagram con botón de WhatsApp y hace clic:
1. Se abre WhatsApp en su teléfono
2. El usuario escribe un mensaje a la empresa
3. **El bot detecta el mensaje automáticamente**
4. **Crea un lead en el CRM con asignación de vendedor**

## 🎯 Resultado Final

- ✅ Lead creado automáticamente al recibir mensaje de WhatsApp
- ✅ Vendedor asignado automáticamente (round-robin)
- ✅ Visible en Dashboard → Leads con origen "WhatsApp Web (Automático)"
- ✅ Sin necesidad de migrar número a WhatsApp API
- ✅ Funciona con WhatsApp Business App actual

---

## 📋 Pasos de Configuración

### Paso 1: Generar API Key Segura

Ejecuta este comando para generar una clave aleatoria segura:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Ejemplo de resultado:**
```
a7f3b9e1c4d8f2a6e5b3c9d7f1a4e8b2c6d9f3a7e1b5c8d2f6a9e3b7c1d5f8a4
```

**Guarda esta clave**, la usaremos en los siguientes pasos.

### Paso 2: Configurar el CRM (Backend)

Agrega la API Key en el archivo `.env.local` del CRM:

```bash
# En /home/luismunozse/Escritorio/amersurcrm/.env.local
WHATSAPP_BOT_API_KEY=a7f3b9e1c4d8f2a6e5b3c9d7f1a4e8b2c6d9f3a7e1b5c8d2f6a9e3b7c1d5f8a4
```

**Reinicia el servidor del CRM:**

```bash
# Si usas PM2:
pm2 restart crm

# Si usas npm:
# Detén el servidor (Ctrl+C) y vuelve a ejecutar:
npm run dev
```

### Paso 3: Configurar el Bot

Ve a la carpeta del bot y crea el archivo `.env`:

```bash
cd whatsapp-bot
cp .env.example .env
nano .env
```

Configura las variables (usa la MISMA API Key del Paso 1):

```bash
# URL del CRM en producción
CRM_API_URL=https://crm.amersursac.com

# API Key (LA MISMA que pusiste en el CRM)
CRM_API_KEY=a7f3b9e1c4d8f2a6e5b3c9d7f1a4e8b2c6d9f3a7e1b5c8d2f6a9e3b7c1d5f8a4

# Origen del lead
ORIGEN_LEAD=whatsapp_web
```

Guarda el archivo (Ctrl+O, Enter, Ctrl+X).

### Paso 4: Instalar Dependencias

```bash
npm install
```

Esto instalará:
- `whatsapp-web.js` - Conexión con WhatsApp Web
- `qrcode-terminal` - Para mostrar QR en la terminal
- `dotenv` - Para leer variables de entorno

### Paso 5: Probar Conexión con el CRM

Antes de conectar WhatsApp, verifica que el bot puede comunicarse con el CRM:

```bash
npm test
```

**Deberías ver:**

```
🧪 Probando conexión con el CRM...

📡 URL: https://crm.amersursac.com
🔑 API Key: a7f3b9e1c4...

📤 Enviando lead de prueba...

📊 Respuesta del servidor (200):
{
  "success": true,
  "message": "Lead creado exitosamente",
  "clienteId": "550e8400-e29b-41d4-a716-446655440000",
  "vendedor": "Carlos Mendoza"
}

✅ Conexión exitosa!
✅ El bot puede comunicarse correctamente con el CRM
✅ Lead de prueba creado correctamente

🎉 Todo funcionando! El bot está listo para usarse.
```

**Si hay error:**

❌ **"Error de autenticación"**
- Verifica que la API Key sea EXACTAMENTE la misma en ambos archivos
- Verifica que reiniciaste el CRM después de agregar la variable

❌ **"Error de conexión"**
- Verifica que el CRM esté corriendo
- Verifica la URL en `CRM_API_URL`

### Paso 6: Iniciar el Bot

```bash
npm start
```

**Verás:**

```
🚀 Iniciando WhatsApp Bot para Amersur CRM...
📡 CRM API: https://crm.amersursac.com
⏳ Inicializando cliente de WhatsApp...

📱 Escanea este código QR con WhatsApp Web:

█████████████████████████████
█████▄▄▄▄▄██▀▀██▄▄▄▄▄█████
...
```

### Paso 7: Vincular WhatsApp

En tu teléfono con WhatsApp Business:

1. Abre WhatsApp
2. Toca **⋮** (menú) → **Dispositivos vinculados**
3. Toca **Vincular dispositivo**
4. Escanea el código QR que apareció en la terminal

**Verás en la terminal:**

```
🔐 Autenticación exitosa
✅ WhatsApp Bot conectado y listo!
👂 Escuchando mensajes entrantes...
```

### Paso 8: Probar con Mensaje Real

Pídele a alguien que te envíe un mensaje de WhatsApp por primera vez (desde un número que NO esté en el CRM).

**Verás en la terminal:**

```
📨 Mensaje de: Juan Pérez (+51987654321)
💬 Contenido: Hola, me interesa información sobre los lotes
📤 Enviando lead al CRM...
✅ Lead creado exitosamente: 550e8400-e29b-41d4-a716-446655440000
👤 Asignado a vendedor: Carlos Mendoza
```

### Paso 9: Verificar en el CRM

1. Ve a https://crm.amersursac.com/dashboard/leads
2. Busca el lead con origen "WhatsApp Web (Automático)"
3. Verifica que tenga vendedor asignado

---

## 🚢 Mantener el Bot Corriendo 24/7

El bot necesita estar siempre corriendo para capturar mensajes. Opciones:

### Opción A: PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar bot con PM2
pm2 start index.js --name whatsapp-bot

# Ver estado
pm2 status

# Ver logs
pm2 logs whatsapp-bot

# Configurar para que inicie automáticamente
pm2 startup
pm2 save
```

### Opción B: Screen (Más simple)

```bash
# Crear sesión de screen
screen -S whatsapp-bot

# Iniciar bot
npm start

# Desconectar sin detener (Ctrl+A, luego D)

# Reconectar después
screen -r whatsapp-bot
```

---

## 🔧 Mantenimiento

### Ver logs en tiempo real

```bash
pm2 logs whatsapp-bot --lines 100
```

### Reiniciar el bot

```bash
pm2 restart whatsapp-bot
```

### Detener el bot

```bash
pm2 stop whatsapp-bot
```

### Si WhatsApp se desconecta

1. Detén el bot:
   ```bash
   pm2 stop whatsapp-bot
   ```

2. Elimina autenticación:
   ```bash
   rm -rf .wwebjs_auth
   ```

3. Reinicia:
   ```bash
   pm2 restart whatsapp-bot
   ```

4. Escanea QR nuevamente:
   ```bash
   pm2 logs whatsapp-bot
   ```

---

## 📊 Monitoreo de Leads

### Dashboard del CRM

Ve a: https://crm.amersursac.com/dashboard/leads

Verás estadísticas de leads por origen, incluyendo "WhatsApp Web (Automático)".

### Filtrar solo leads de WhatsApp

En la página de leads, filtra por origen: "whatsapp_web"

---

## ❓ Preguntas Frecuentes

### ¿El bot responde mensajes automáticamente?

No. El bot solo **captura** el primer mensaje y crea el lead. Los vendedores deben responder manualmente.

### ¿Crea leads duplicados si alguien escribe varias veces?

No. El bot verifica si el número ya existe en la base de datos antes de crear el lead.

### ¿Funciona con publicidades de Facebook/Instagram?

Sí. Cuando alguien hace clic en el botón de WhatsApp de tu anuncio y te escribe, el bot lo captura.

### ¿Puedo seguir usando WhatsApp normalmente?

Sí. El bot no interfiere con tu uso normal de WhatsApp Business. Solo escucha mensajes entrantes.

### ¿Qué pasa si el servidor se reinicia?

Si usas PM2, el bot se reinicia automáticamente. Pero necesitarás escanear el QR de WhatsApp nuevamente cada 14-30 días aproximadamente.

### ¿Es legal usar este bot?

El bot usa `whatsapp-web.js` que NO es oficial de WhatsApp. Viola técnicamente los términos de servicio, pero miles de empresas lo usan sin problemas si no hacen spam.

**Uso seguro:**
- ✅ Solo capturar mensajes de quienes te escriben primero
- ✅ No enviar mensajes masivos
- ❌ No hacer spam

---

## 🆘 Soporte

Si algo no funciona:

1. Verifica los logs: `pm2 logs whatsapp-bot`
2. Prueba la conexión: `npm test`
3. Revisa que las API Keys coincidan
4. Verifica que el CRM esté corriendo

---

**Documentación completa:** `/whatsapp-bot/README.md`
