/**
 * Script simple para normalizar números de teléfono
 * Ejecutar con: node normalize-phones.js
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
    
    // Obtener todos los clientes
    const response = await fetch(`${SUPABASE_URL}/rest/v1/cliente?select=id,nombre,telefono,telefono_whatsapp`, {
      headers: {
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'apikey': SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    });
    
    if (!response.ok) {
      throw new Error(`Error obteniendo clientes: ${response.status}`);
    }
    
    const clientes = await response.json();
    
    if (!clientes || clientes.length === 0) {
      console.log('ℹ️  No se encontraron clientes');
      return;
    }
    
    console.log(`📊 Encontrados ${clientes.length} clientes`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const cliente of clientes) {
      try {
        const normalizedTelefono = normalizePhoneNumber(cliente.telefono);
        const normalizedWhatsApp = normalizePhoneNumber(cliente.telefono_whatsapp);
        
        // Solo actualizar si hay cambios
        const needsUpdate = 
          (cliente.telefono !== normalizedTelefono) || 
          (cliente.telefono_whatsapp !== normalizedWhatsApp);
        
        if (needsUpdate) {
          const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/cliente?id=eq.${cliente.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
              'apikey': SUPABASE_SERVICE_KEY,
              'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
              telefono: normalizedTelefono,
              telefono_whatsapp: normalizedWhatsApp
            })
          });
          
          if (!updateResponse.ok) {
            console.error(`❌ Error actualizando ${cliente.nombre}: ${updateResponse.status}`);
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
  }
}

// Ejecutar la migración
normalizePhoneNumbers();
