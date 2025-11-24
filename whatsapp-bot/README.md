# WhatsApp Bot - Captura Automática de Leads

Bot de WhatsApp Web que captura automáticamente leads cuando alguien escribe al número de WhatsApp Business de la empresa desde publicidades de Facebook/Instagram.

## 📋 Requisitos Previos

- Node.js 18+ instalado
- Cuenta de WhatsApp Business App (la app móvil/web, NO API)
- Acceso al CRM en producción (https://crm.amersursac.com)
- Un servidor/VPS donde ejecutar el bot 24/7

## 🚀 Instalación

### 1. Instalar dependencias

```bash
cd whatsapp-bot
npm install
```

### 2. Configurar variables de entorno

Copia el archivo de ejemplo y edítalo:

```bash
cp .env.example .env
nano .env
```

Configura las siguientes variables:

```bash
# URL del CRM (sin barra final)
CRM_API_URL=https://crm.amersursac.com

# API Key para autenticar con el CRM
# Debe ser la misma que WHATSAPP_BOT_API_KEY en el .env del CRM
CRM_API_KEY=genera_una_clave_segura_aqui

# Origen del lead (cómo aparecerá en el CRM)
ORIGEN_LEAD=whatsapp_web
```

**IMPORTANTE:** Genera una API Key segura. Puedes usar:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Configurar el CRM

En el archivo `.env.local` del CRM, agrega la misma API Key:

```bash
WHATSAPP_BOT_API_KEY=la_misma_clave_que_generaste
```

Reinicia el servidor del CRM después de agregar la variable.

## 🎯 Uso

### Modo desarrollo (para probar)

```bash
npm run dev
```

### Modo producción

```bash
npm start
```

### Primera vez - Conectar WhatsApp

1. Ejecuta el bot:
   ```bash
   npm start
   ```

2. Aparecerá un código QR en la terminal:
   ```
   📱 Escanea este código QR con WhatsApp Web:

   █████████████████████████████
   █████████████████████████████
   ...
   ```

3. En tu teléfono:
   - Abre WhatsApp
   - Ve a **Menú (⋮)** → **Dispositivos vinculados**
   - Toca **Vincular dispositivo**
   - Escanea el código QR que apareció en la terminal

4. Verás en la terminal:
   ```
   🔐 Autenticación exitosa
   ✅ WhatsApp Bot conectado y listo!
   👂 Escuchando mensajes entrantes...
   ```

5. ¡Listo! El bot ya está capturando mensajes.

## 🔄 Funcionamiento

### Flujo de captura de leads

```
Usuario ve anuncio en Facebook/Instagram
    ↓
Hace clic en botón "WhatsApp"
    ↓
Se abre WhatsApp en su teléfono
    ↓
Usuario escribe mensaje a la empresa
    ↓
Bot detecta mensaje nuevo
    ↓
Bot verifica si es primera vez que escribe
    ↓
Bot envía datos al CRM
    ↓
CRM crea lead automáticamente
    ↓
CRM asigna vendedor (round-robin)
    ↓
✅ Lead disponible en dashboard
```

### Logs en tiempo real

Cuando alguien escribe, verás en la terminal:

```
📨 Mensaje de: Juan Pérez (+51987654321)
💬 Contenido: Hola, me interesa información sobre los lotes en Huaral
📤 Enviando lead al CRM...
✅ Lead creado exitosamente: 550e8400-e29b-41d4-a716-446655440000
👤 Asignado a vendedor: Carlos Mendoza
```

## 🔒 Seguridad

### API Key

El bot usa una API Key para autenticarse con el CRM. Esta clave:

- ✅ Debe ser segura (mínimo 32 caracteres aleatorios)
- ✅ Debe ser la misma en ambos `.env` (bot y CRM)
- ❌ No debe compartirse públicamente
- ❌ No debe subirse a Git

### Datos transmitidos

El bot solo envía al CRM:

- Número de teléfono del contacto
- Nombre (si está disponible en WhatsApp)
- Mensaje inicial
- Fecha de contacto

NO envía:
- Conversaciones completas
- Mensajes privados posteriores
- Datos de otros contactos

## 🛠️ Mantenimiento

### Ver si el bot está corriendo

```bash
ps aux | grep "node index.js"
```

### Detener el bot

```bash
# Si lo ejecutaste en primer plano: Ctrl + C

# Si está en segundo plano:
pkill -f "node index.js"
```

### Reiniciar sesión de WhatsApp

Si el bot se desconecta:

1. Detén el bot
2. Elimina la carpeta de autenticación:
   ```bash
   rm -rf .wwebjs_auth
   ```
3. Inicia el bot nuevamente y escanea el QR

### Logs

El bot imprime logs en la consola. Para guardarlos:

```bash
npm start > logs/bot.log 2>&1
```

## 🚢 Despliegue en Producción

### Opción 1: PM2 (Recomendado)

PM2 mantiene el bot corriendo 24/7 y lo reinicia automáticamente si falla.

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar bot con PM2
pm2 start index.js --name whatsapp-bot

# Ver estado
pm2 status

# Ver logs en tiempo real
pm2 logs whatsapp-bot

# Reiniciar
pm2 restart whatsapp-bot

# Detener
pm2 stop whatsapp-bot

# Configurar para que inicie al reiniciar servidor
pm2 startup
pm2 save
```

### Opción 2: systemd (Linux)

Crear archivo `/etc/systemd/system/whatsapp-bot.service`:

```ini
[Unit]
Description=WhatsApp Bot - Amersur CRM
After=network.target

[Service]
Type=simple
User=your_user
WorkingDirectory=/ruta/completa/al/whatsapp-bot
ExecStart=/usr/bin/node index.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Luego:

```bash
sudo systemctl daemon-reload
sudo systemctl enable whatsapp-bot
sudo systemctl start whatsapp-bot
sudo systemctl status whatsapp-bot
```

### Opción 3: Docker

Crear `Dockerfile`:

```dockerfile
FROM node:18-slim

# Instalar dependencias de Puppeteer
RUN apt-get update && apt-get install -y \
    chromium \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

CMD ["node", "index.js"]
```

Ejecutar:

```bash
docker build -t whatsapp-bot .
docker run -d --name whatsapp-bot \
  --env-file .env \
  -v $(pwd)/.wwebjs_auth:/app/.wwebjs_auth \
  whatsapp-bot
```

## ❓ Troubleshooting

### El QR no aparece

- Verifica que tienes Node.js 18+ instalado
- Prueba con `npm run dev` en lugar de `npm start`
- Verifica que el puerto no esté bloqueado

### "API Key inválida"

- Verifica que `CRM_API_KEY` en `.env` del bot sea igual a `WHATSAPP_BOT_API_KEY` en `.env.local` del CRM
- Verifica que reiniciaste el servidor del CRM después de agregar la variable

### "Cliente ya existe"

Esto es normal. El bot solo crea un lead la primera vez que un número escribe. Si el número ya existe en la base de datos, no crea duplicados.

### El bot se desconecta seguido

- Verifica tu conexión a internet
- WhatsApp puede desconectar sesiones inactivas después de 14 días
- Usa PM2 para reiniciar automáticamente

### "Error: Session closed"

WhatsApp cerró la sesión. Solución:

```bash
rm -rf .wwebjs_auth
npm start
# Escanea el QR nuevamente
```

## 📊 Monitoreo

### Verificar leads creados

En el CRM, ve a:
- Dashboard → Leads
- Filtra por origen: "WhatsApp Web (Automático)"

### Estadísticas

El dashboard de leads muestra cuántos leads se capturaron desde WhatsApp Web.

## ⚠️ Advertencias Importantes

### Términos de servicio

Este bot usa `whatsapp-web.js`, una librería no oficial que automatiza WhatsApp Web. Esto **viola los términos de servicio de WhatsApp**.

**Riesgos:**
- Posibilidad de ban del número (bajo si usas bien)
- Puede dejar de funcionar si WhatsApp cambia su protocolo

**Uso seguro:**
- ✅ Solo responder a quien te escribe primero
- ✅ No enviar spam
- ✅ Uso comercial legítimo
- ❌ No enviar mensajes masivos no solicitados
- ❌ No agregar contactos automáticamente

### Alternativa oficial

Para una solución 100% legal y estable, considera migrar a **WhatsApp Business API** (Twilio o Meta Cloud API). El CRM ya tiene soporte para Twilio.

## 📝 Licencia

MIT

---

**Desarrollado para Amersur CRM** - Captura automática de leads desde publicidades de Facebook/Instagram via WhatsApp
