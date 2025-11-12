// Test de envío de SMS con Twilio (SIN restricciones de ventana)
require('dotenv').config({ path: '.env.local' });

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

console.log('📱 Configuración SMS:');
console.log('Account SID:', accountSid ? '✓' : '✗');
console.log('Auth Token:', authToken ? '✓' : '✗');
console.log('From Number:', phoneNumber);
console.log('');

const client = twilio(accountSid, authToken);

// Tu número de teléfono (con código de país, SIN "whatsapp:")
const NUMERO_DESTINO = '+5493517734676';

console.log('🚀 Enviando SMS de prueba...');
console.log('De:', phoneNumber);
console.log('Para:', NUMERO_DESTINO);
console.log('');

client.messages
  .create({
    from: phoneNumber,
    to: NUMERO_DESTINO,
    body: 'Hola! Este es un mensaje de prueba desde AMERSUR usando SMS con Twilio. Sin restricciones de ventana de 24 horas. 🎉'
  })
  .then(message => {
    console.log('✅ SMS ENVIADO EXITOSAMENTE!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    console.log('Price:', message.price, message.priceUnit);
    console.log('');
    console.log('📱 Verifica tu teléfono. El SMS debería llegar en segundos.');
  })
  .catch(error => {
    console.log('❌ ERROR:');
    console.log('Código:', error.code);
    console.log('Mensaje:', error.message);
    console.log('');

    if (error.code === 21608) {
      console.log('🔴 El número de origen no está habilitado para SMS.');
      console.log('Solución: Compra un número con capacidad SMS en Twilio Console.');
    } else if (error.code === 21211) {
      console.log('🔴 El número de destino no es válido.');
      console.log('Verifica que el formato sea: +5493517734676');
    }

    console.error('');
    console.error('Detalles completos:', error);
  });
