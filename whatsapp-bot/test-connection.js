/**
 * Script de prueba para verificar conexión con el CRM
 *
 * Ejecutar: node test-connection.js
 */

import dotenv from 'dotenv';
dotenv.config();

const CRM_API_URL = process.env.CRM_API_URL || 'http://localhost:3000';
const CRM_API_KEY = process.env.CRM_API_KEY;

console.log('🧪 Probando conexión con el CRM...\n');
console.log(`📡 URL: ${CRM_API_URL}`);
console.log(`🔑 API Key: ${CRM_API_KEY ? CRM_API_KEY.substring(0, 10) + '...' : 'NO CONFIGURADA'}\n`);

if (!CRM_API_KEY) {
  console.error('❌ ERROR: Falta CRM_API_KEY en el archivo .env');
  process.exit(1);
}

// Datos de prueba
const testLead = {
  telefono: '+51999999999',
  nombre: 'Lead de Prueba',
  mensaje_inicial: 'Este es un mensaje de prueba del bot de WhatsApp',
  origen_lead: 'whatsapp_web',
  canal: 'test',
  fecha_contacto: new Date().toISOString()
};

console.log('📤 Enviando lead de prueba...\n');

try {
  const response = await fetch(`${CRM_API_URL}/api/whatsapp/lead/create`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CRM_API_KEY
    },
    body: JSON.stringify(testLead)
  });

  const status = response.status;
  const data = await response.json();

  console.log(`📊 Respuesta del servidor (${status}):`);
  console.log(JSON.stringify(data, null, 2));
  console.log('');

  if (status === 200 || status === 201) {
    console.log('✅ Conexión exitosa!');
    console.log('✅ El bot puede comunicarse correctamente con el CRM');

    if (data.success) {
      console.log('✅ Lead de prueba creado correctamente');
      console.log(`\n🎉 Todo funcionando! El bot está listo para usarse.`);
    } else {
      console.log('ℹ️  Lead no creado (posiblemente ya existía)');
      console.log('✅ Pero la comunicación con el CRM funciona correctamente');
    }
  } else if (status === 401) {
    console.log('❌ Error de autenticación');
    console.log('');
    console.log('Verifica que:');
    console.log('1. CRM_API_KEY en este .env sea igual a WHATSAPP_BOT_API_KEY en el .env del CRM');
    console.log('2. Hayas reiniciado el servidor del CRM después de agregar la variable');
  } else if (status >= 500) {
    console.log('❌ Error del servidor CRM');
    console.log('');
    console.log('Verifica que:');
    console.log('1. El CRM esté corriendo');
    console.log('2. La URL sea correcta');
    console.log('3. El endpoint /api/whatsapp/lead/create exista');
  } else {
    console.log('⚠️  Respuesta inesperada');
  }

} catch (error) {
  console.error('❌ Error de conexión:', error.message);
  console.log('');
  console.log('Verifica que:');
  console.log('1. El CRM esté corriendo en:', CRM_API_URL);
  console.log('2. Tengas conexión a internet');
  console.log('3. La URL del CRM sea correcta');
}

console.log('\n---\n');
