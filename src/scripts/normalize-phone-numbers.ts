/**
 * Script para normalizar números de teléfono existentes
 * Agrega código de país +51 (Perú) a números que no lo tienen
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://hbscbwpnkrnuvmdbfmvp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhic2Nid3Bua3JudXZtZGJmbXZwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1Nzc0MDExMiwiZXhwIjoyMDczMzE2MTEyfQ.UzKGfEfs6YPndqXE-l3BjViWLoU1OAJ6hMmM9GFjjocde';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Cliente {
  id: string;
  nombre: string;
  telefono: string | null;
  telefono_whatsapp: string | null;
}

function normalizePhoneNumber(phone: string | null): string | null {
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
    console.log('🔍 Buscando clientes con números de teléfono...');
    
    // Obtener todos los clientes
    const { data: clientes, error: fetchError } = await supabase
      .from('cliente')
      .select('id, nombre, telefono, telefono_whatsapp');
    
    if (fetchError) {
      throw new Error(`Error obteniendo clientes: ${fetchError.message}`);
    }
    
    const clientesNormalizados: Cliente[] = (clientes ?? []) as Cliente[];

    if (clientesNormalizados.length === 0) {
      console.log('ℹ️  No se encontraron clientes');
      return;
    }
    
    console.log(`📊 Encontrados ${clientesNormalizados.length} clientes`);
    
    let updatedCount = 0;
    let errorCount = 0;
    
    for (const cliente of clientesNormalizados) {
      try {
        const normalizedTelefono = normalizePhoneNumber(cliente.telefono);
        const normalizedWhatsApp = normalizePhoneNumber(cliente.telefono_whatsapp);
        
        // Solo actualizar si hay cambios
        const needsUpdate = 
          (cliente.telefono !== normalizedTelefono) || 
          (cliente.telefono_whatsapp !== normalizedWhatsApp);
        
        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('cliente')
            .update({
              telefono: normalizedTelefono,
              telefono_whatsapp: normalizedWhatsApp
            })
            .eq('id', cliente.id);
          
          if (updateError) {
            console.error(`❌ Error actualizando ${cliente.nombre}:`, updateError.message);
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
    console.log(`📊 Total procesados: ${clientesNormalizados.length}`);
    
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
