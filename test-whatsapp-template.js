// Test de envío de WhatsApp con plantilla aprobada
require('dotenv').config({ path: '.env.local' });

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

const client = twilio(accountSid, authToken);

// Tu número de destino
const NUMERO_DESTINO = 'whatsapp:+5493517734676';

// IMPORTANTE: Reemplaza esto con el Content SID de tu plantilla aprobada
// Lo encuentras en: https://console.twilio.com/us1/develop/sms/content-editor/templates
const CONTENT_SID = 'HXxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; // ← REEMPLAZAR

console.log('📱 Enviando mensaje con plantilla aprobada...');
console.log('De:', whatsappFrom);
console.log('Para:', NUMERO_DESTINO);
console.log('Content SID:', CONTENT_SID);
console.log('');

// Opción 1: Usar Content Template (recomendado si la plantilla está en Twilio)
client.messages
  .create({
    from: whatsappFrom,
    to: NUMERO_DESTINO,
    contentSid: CONTENT_SID,
    contentVariables: JSON.stringify({
      1: 'Juan',  // Variable {{1}} en la plantilla
      2: 'Casa en Lima Centro'  // Variable {{2}} en la plantilla
    })
  })
  .then(message => {
    console.log('✅ MENSAJE CON PLANTILLA ENVIADO!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('');
    console.log('El mensaje debería llegar sin restricciones de ventana.');
  })
  .catch(error => {
    console.log('❌ ERROR:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);
    console.log('');

    if (error.code === 63016) {
      console.log('🔴 Sigues fuera de la ventana de 24 horas.');
      console.log('');
      console.log('SOLUCIONES:');
      console.log('1. Verifica que la plantilla esté APROBADA en Meta Business Manager');
      console.log('2. Asegúrate que el Content SID sea correcto');
      console.log('3. Si la plantilla es nueva, espera 24-48h para que se sincronice');
    }

    console.error('');
    console.error('Detalles completos:', error);
  });
