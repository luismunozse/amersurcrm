/**
 * Script corregido para normalizar números de teléfono
 * Ejecutar con: node normalize-phones-fixed.js
 */

const SUPABASE_URL = 'https://hbscbwpnkrnuvmdbfmvp.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic2Nid3Bua3JudXZtZGJmbXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDExMiwiZXhwIjoyMDczMzE2MTEyfQ.UzKGfEfs6YPndqXE-l3BjViWLoU1OAJ6hMmM9GFjjocde';

function normalizePhoneNumber(phone) {
  if (!phone) return null;
  
  // Si ya tiene código de país, devolverlo tal como está
  if (phone.startsWith('+')) {
    return phone;
  }
  
  // Limpiar el número (solo dígitos)
  const cleanNumber = phone.replace(/\D/g, '');
  
  // Si está vacío después de limpiar, devolver null
  if (!cleanNumber) return null;
  
  // Si ya tiene código de país peruano (51), agregar el +
  if (cleanNumber.startsWith('51') && cleanNumber.length >= 9) {
    return `+${cleanNumber}`;
  }
  
  // Si es un número peruano (9 dígitos), agregar +51
  if (cleanNumber.length === 9 && cleanNumber.startsWith('9')) {
    return `+51${cleanNumber}`;
  }
  
  // Si es un número peruano (8 dígitos), agregar +51
  if (cleanNumber.length === 8) {
    return `+51${cleanNumber}`;
  }
  
  // Para otros casos, agregar +51 por defecto
  return `+51${cleanNumber}`;
}

async function normalizePhoneNumbers() {
  try {
    console.log('🔍 Normalizando números de teléfono...');
    console.log('📡 Conectando a Supabase...');
    
    // Primero, verificar la conexión con una consulta simple
    const testResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY
      }
    });
    
    console.log('🔗 Estado de conexión:', testResponse.status);
    
    // Obtener todos los clientes del esquema crm
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cliente?select=id,nombre,telefono,telefono_whatsapp`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    console.log('📊 Estado de consulta clientes:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error detallado:', errorText);
      throw new Error(`Error obteniendo clientes: ${response.status} - ${errorText}`);
    }
    
    const clientes = await response.json();
    
    if (!clientes || clientes.length === 0) {
      console.log('ℹ️  No se encontraron clientes');
      return;
    }
    
    console.log(`📊 Encontrados ${clientes.length} clientes`);
    
    // Mostrar algunos ejemplos antes de procesar
    console.log('\n📋 Ejemplos de números encontrados:');
    clientes.slice(0, 3).forEach((cliente, index) => {
      console.log(`${index + 1}. ${cliente.nombre}:`);
      console.log(`   Teléfono: ${cliente.telefono || 'N/A'}`);
      console.log(`   WhatsApp: ${cliente.telefono_whatsapp || 'N/A'}`);
    });
    
    let updatedCount = 0;
    let errorCount = 0;
    
    console.log('\n🔄 Procesando clientes...');
    
    for (const cliente of clientes) {
      try {
        const normalizedTelefono = normalizePhoneNumber(cliente.telefono);
        const normalizedWhatsApp = normalizePhoneNumber(cliente.telefono_whatsapp);
        
        // Solo actualizar si hay cambios
        const needsUpdate = 
          (cliente.telefono !== normalizedTelefono) || 
          (cliente.telefono_whatsapp !== normalizedWhatsApp);
        
        if (needsUpdate) {
          console.log(`\n🔄 Actualizando ${cliente.nombre}...`);
          
          const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/cliente?id=eq.${cliente.id}`, {
            method: 'PATCH',
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY,
              'Content-Type': 'application/json',
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              telefono: normalizedTelefono,
              telefono_whatsapp: normalizedWhatsApp
            })
          });
          
          if (!updateResponse.ok) {
            const errorText = await updateResponse.text();
            console.error(`❌ Error actualizando ${cliente.nombre}: ${updateResponse.status} - ${errorText}`);
            errorCount++;
          } else {
            console.log(`✅ ${cliente.nombre}:`);
            if (cliente.telefono !== normalizedTelefono) {
              console.log(`   Teléfono: ${cliente.telefono} → ${normalizedTelefono}`);
            }
            if (cliente.telefono_whatsapp !== normalizedWhatsApp) {
              console.log(`   WhatsApp: ${cliente.telefono_whatsapp} → ${normalizedWhatsApp}`);
            }
            updatedCount++;
          }
        } else {
          console.log(`✓ ${cliente.nombre} - Sin cambios necesarios`);
        }
      } catch (error) {
        console.error(`❌ Error procesando ${cliente.nombre}:`, error);
        errorCount++;
      }
    }
    
    console.log('\n📈 Resumen de la migración:');
    console.log(`✅ Clientes actualizados: ${updatedCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log(`📊 Total procesados: ${clientes.length}`);
    
    if (updatedCount > 0) {
      console.log('\n🎉 Migración completada exitosamente!');
      console.log('💡 Los números ahora tienen formato internacional estándar (+51XXXXXXXXX)');
    } else {
      console.log('\nℹ️  No se encontraron números que necesiten normalización');
    }
    
  } catch (error) {
    console.error('❌ Error en la migración:', error);
    console.error('💡 Verifica que la API key tenga permisos de lectura y escritura en la tabla cliente');
  }
}

// Ejecutar la migración
normalizePhoneNumbers();
