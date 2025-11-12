// Test con Sandbox de Twilio (funciona inmediatamente)
require('dotenv').config({ path: '.env.local' });

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Usar el sandbox (funciona sin restricciones)
const SANDBOX_NUMBER = 'whatsapp:+14155238886';

// Tu número (debe estar verificado en el sandbox primero)
// Para verificar: Envía "join curious-remarkable" al +14155238886 desde WhatsApp
const NUMERO_DESTINO = 'whatsapp:+5493517734676';

console.log('📱 Test con Sandbox de Twilio');
console.log('');
console.log('⚠️  IMPORTANTE: Antes de ejecutar este test:');
console.log('1. Abre WhatsApp en tu teléfono');
console.log('2. Envía un mensaje a: +1 415 523 8886');
console.log('3. El mensaje debe decir: join curious-remarkable');
console.log('4. Espera la confirmación');
console.log('5. Luego ejecuta este script');
console.log('');

const client = twilio(accountSid, authToken);

console.log('🚀 Enviando mensaje de prueba con SANDBOX...');
console.log('De:', SANDBOX_NUMBER);
console.log('Para:', NUMERO_DESTINO);
console.log('');

client.messages
  .create({
    from: SANDBOX_NUMBER,
    to: NUMERO_DESTINO,
    body: '✅ TEST EXITOSO! El sistema de WhatsApp funciona correctamente. Este mensaje llegó desde el Sandbox de Twilio mientras esperas la activación completa de tu número de WhatsApp Business.'
  })
  .then(message => {
    console.log('✅ ÉXITO!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('');
    console.log('🎉 El mensaje debería llegar en unos segundos.');
    console.log('Si no llega, verifica que hayas enviado "join curious-remarkable" al sandbox.');
  })
  .catch(error => {
    console.log('❌ ERROR:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);
    console.log('');

    if (error.code === 63016) {
      console.log('🔴 Tu número no está verificado en el sandbox.');
      console.log('');
      console.log('📱 SOLUCIÓN:');
      console.log('1. Abre WhatsApp');
      console.log('2. Envía mensaje a: +1 415 523 8886');
      console.log('3. Mensaje: join curious-remarkable');
      console.log('4. Espera confirmación');
      console.log('5. Ejecuta este script nuevamente');
    }

    console.error('');
    console.error('Detalles completos:', error);
  });
