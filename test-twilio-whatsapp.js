// Test directo de envío de WhatsApp con Twilio
require('dotenv').config({ path: '.env.local' });

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const whatsappFrom = process.env.TWILIO_WHATSAPP_FROM;

console.log('📱 Configuración:');
console.log('Account SID:', accountSid ? '✓' : '✗');
console.log('Auth Token:', authToken ? '✓' : '✗');
console.log('WhatsApp From:', whatsappFrom);
console.log('');

const client = twilio(accountSid, authToken);

// IMPORTANTE: Reemplaza con TU número de WhatsApp (con código de país)
const NUMERO_DESTINO = 'whatsapp:+5493517734676'; // ← CAMBIA ESTO

console.log('🚀 Enviando mensaje de prueba...');
console.log('De:', whatsappFrom);
console.log('Para:', NUMERO_DESTINO);
console.log('');

client.messages
  .create({
    from: whatsappFrom,
    to: NUMERO_DESTINO,
    body: 'Hola! Este es un mensaje de prueba desde Amersur usando Twilio WhatsApp Business. Si recibes esto, la integración funciona correctamente. 🎉'
  })
  .then(message => {
    console.log('✅ ÉXITO!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('');
    console.log('El mensaje fue enviado. Verifica tu WhatsApp.');
  })
  .catch(error => {
    console.log('❌ ERROR:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);
    console.log('');

    if (error.code === 63016) {
      console.log('🔴 PROBLEMA: El número de destino no está verificado o el número de WhatsApp Business no tiene permisos todavía.');
      console.log('Soluciones:');
      console.log('1. Espera 24-48 horas para que Meta active completamente tu número');
      console.log('2. Verifica que el número de destino sea válido (+código de país)');
      console.log('3. Usa el sandbox temporalmente: whatsapp:+14155238886');
    }

    console.error('Detalles completos:', error);
  });
