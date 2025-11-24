/**
 * Script para verificar estado actual del bot
 */

import dotenv from 'dotenv';
dotenv.config();

const CRM_API_URL = process.env.CRM_API_URL || 'http://localhost:3000';
const CRM_API_KEY = process.env.CRM_API_KEY;

console.log('Verificando estado del bot en el CRM...\n');

try {
  const response = await fetch(`${CRM_API_URL}/api/whatsapp/bot/status`, {
    method: 'GET',
    headers: {
      'x-api-key': CRM_API_KEY
    }
  });

  if (response.ok) {
    const data = await response.json();
    console.log('Estado actual:', JSON.stringify(data, null, 2));
  } else {
    console.log('Error:', response.status, await response.text());
  }
} catch (error) {
  console.error('Error de conexión:', error.message);
}
