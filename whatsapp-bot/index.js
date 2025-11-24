/**
 * WhatsApp Bot para Amersur CRM
 *
 * Captura automáticamente leads cuando alguien escribe por WhatsApp
 * Funciona con WhatsApp Business App a través de WhatsApp Web
 */

import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import qrcode from 'qrcode-terminal';
import dotenv from 'dotenv';

dotenv.config();

const CRM_API_URL = process.env.CRM_API_URL || 'http://localhost:3000';
const CRM_API_KEY = process.env.CRM_API_KEY;
const ORIGEN_LEAD = process.env.ORIGEN_LEAD || 'whatsapp_web';

// Validar configuración
if (!CRM_API_KEY) {
  console.error('❌ ERROR: Falta CRM_API_KEY en las variables de entorno');
  process.exit(1);
}

console.log('🚀 Iniciando WhatsApp Bot para Amersur CRM...');
console.log(`📡 CRM API: ${CRM_API_URL}`);

/**
 * Enviar estado del bot al CRM
 */
async function sendStatusToCRM(status) {
  try {
    await fetch(`${CRM_API_URL}/api/whatsapp/bot/status`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CRM_API_KEY
      },
      body: JSON.stringify(status)
    });
  } catch (error) {
    // Silenciar errores de conexión al CRM (no es crítico para el bot)
    console.debug('[CRM Sync] Error enviando estado:', error.message);
  }
}

// Inicializar cliente de WhatsApp
const client = new Client({
  authStrategy: new LocalAuth({
    dataPath: './.wwebjs_auth'
  }),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});

// Evento: Generar QR para conectar WhatsApp
client.on('qr', (qr) => {
  console.log('\n📱 Escanea este código QR con WhatsApp Web:\n');
  qrcode.generate(qr, { small: true });
  console.log('\n👆 Abre WhatsApp en tu teléfono → Dispositivos vinculados → Vincular dispositivo\n');

  // Enviar QR al CRM para mostrarlo en el dashboard
  sendStatusToCRM({
    connected: false,
    qr: qr,
    phoneNumber: null,
    error: null
  });
});

// Evento: Cliente listo
client.on('ready', async () => {
  console.log('✅ WhatsApp Bot conectado y listo!');
  console.log('👂 Escuchando mensajes entrantes...\n');

  // Obtener número de WhatsApp conectado
  const info = client.info;
  const phoneNumber = info ? info.wid.user : null;

  // Enviar estado conectado al CRM
  await sendStatusToCRM({
    connected: true,
    qr: null,
    phoneNumber: phoneNumber,
    error: null
  });
});

// Evento: Autenticación exitosa
client.on('authenticated', () => {
  console.log('🔐 Autenticación exitosa');
});

// Evento: Error de autenticación
client.on('auth_failure', (msg) => {
  console.error('❌ Error de autenticación:', msg);

  // Enviar error al CRM
  sendStatusToCRM({
    connected: false,
    qr: null,
    phoneNumber: null,
    error: `Error de autenticación: ${msg}`
  });
});

// Evento: Desconexión
client.on('disconnected', (reason) => {
  console.log('⚠️ WhatsApp desconectado:', reason);
  console.log('🔄 Intentando reconectar...');

  // Enviar estado desconectado al CRM
  sendStatusToCRM({
    connected: false,
    qr: null,
    phoneNumber: null,
    error: `Desconectado: ${reason}`
  });
});

// Map para trackear conversaciones procesadas (evitar duplicados)
const conversacionesProcesadas = new Map();

// Evento: Mensaje recibido
client.on('message', async (message) => {
  try {
    // Solo procesar mensajes entrantes (no los que enviamos nosotros)
    if (message.fromMe) {
      return;
    }

    const contact = await message.getContact();
    const chat = await message.getChat();
    const telefono = contact.number;
    const nombre = contact.pushname || contact.name || 'Desconocido';
    const mensaje = message.body;

    console.log(`\n📨 Mensaje de: ${nombre} (${telefono})`);
    console.log(`💬 Contenido: ${mensaje.substring(0, 100)}${mensaje.length > 100 ? '...' : ''}`);

    // Verificar si ya procesamos esta conversación recientemente
    const ahora = Date.now();
    const ultimoProcesado = conversacionesProcesadas.get(telefono);

    // Solo crear lead si es la primera vez o si pasaron más de 24 horas
    if (ultimoProcesado && (ahora - ultimoProcesado) < 24 * 60 * 60 * 1000) {
      console.log(`⏭️  Conversación existente, no crear lead duplicado`);
      return;
    }

    // Crear lead en el CRM
    const leadData = {
      telefono: telefono,
      nombre: nombre,
      mensaje_inicial: mensaje,
      origen_lead: ORIGEN_LEAD,
      canal: 'whatsapp_web',
      chat_id: chat.id._serialized,
      fecha_contacto: new Date().toISOString()
    };

    console.log(`📤 Enviando lead al CRM...`);

    const response = await fetch(`${CRM_API_URL}/api/whatsapp/lead/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRM_API_KEY}`,
        'x-api-key': CRM_API_KEY
      },
      body: JSON.stringify(leadData)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Error del CRM (${response.status}):`, errorText);
      return;
    }

    const result = await response.json();

    if (result.success) {
      console.log(`✅ Lead creado exitosamente: ${result.clienteId || result.id}`);
      if (result.vendedor) {
        console.log(`👤 Asignado a vendedor: ${result.vendedor}`);
      }

      // Marcar como procesado
      conversacionesProcesadas.set(telefono, ahora);

      // Limpiar mapa si crece mucho (mantener solo últimas 1000)
      if (conversacionesProcesadas.size > 1000) {
        const primeraClave = conversacionesProcesadas.keys().next().value;
        conversacionesProcesadas.delete(primeraClave);
      }
    } else {
      console.log(`ℹ️  ${result.message || 'Lead ya existe o no se creó'}`);
    }

  } catch (error) {
    console.error('❌ Error procesando mensaje:', error.message);
  }
});

// Manejo de señales para cerrar limpiamente
process.on('SIGINT', async () => {
  console.log('\n\n🛑 Deteniendo WhatsApp Bot...');
  await client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n\n🛑 Deteniendo WhatsApp Bot...');
  await client.destroy();
  process.exit(0);
});

// Inicializar cliente
console.log('⏳ Inicializando cliente de WhatsApp...');
client.initialize();
