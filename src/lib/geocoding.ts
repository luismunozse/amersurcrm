// Utilidades para geocodificación y obtención de coordenadas

export interface Coordenadas {
  lat: number;
  lng: number;
}

export interface UbicacionGeografica {
  departamento: string;
  provincia: string;
  distrito: string;
  coordenadas: Coordenadas;
}

/**
 * Obtiene las coordenadas aproximadas de un distrito en Perú
 * Usa una API de geocodificación gratuita
 */
export async function obtenerCoordenadasDistrito(
  departamento: string,
  provincia: string,
  distrito: string
): Promise<Coordenadas | null> {
  try {
    // Construir la dirección completa
    const direccion = `${distrito}, ${provincia}, ${departamento}, Perú`;
    
    // Usar Nominatim (OpenStreetMap) que es gratuito
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion)}&limit=1&countrycodes=pe`
    );
    
    if (!response.ok) {
      throw new Error(`Error en geocodificación: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data && data.length > 0) {
      const resultado = data[0];
      return {
        lat: parseFloat(resultado.lat),
        lng: parseFloat(resultado.lon)
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error obteniendo coordenadas:', error);
    return null;
  }
}

/**
 * Obtiene coordenadas de respaldo para distritos conocidos en Perú
 * Lista de coordenadas aproximadas para distritos principales
 */
export function obtenerCoordenadasRespaldo(distrito: string): Coordenadas | null {
  const coordenadasRespaldo: Record<string, Coordenadas> = {
    // Lima
    'Miraflores': { lat: -12.1201, lng: -77.0341 },
    'San Isidro': { lat: -12.0961, lng: -77.0361 },
    'Lima': { lat: -12.0464, lng: -77.0428 },
    'Callao': { lat: -12.0566, lng: -77.1181 },
    'San Borja': { lat: -12.1000, lng: -77.0000 },
    'La Molina': { lat: -12.0833, lng: -76.9500 },
    'Surco': { lat: -12.1500, lng: -77.0000 },
    'Pueblo Libre': { lat: -12.0667, lng: -77.0667 },
    'Jesús María': { lat: -12.0833, lng: -77.0500 },
    'Magdalena': { lat: -12.1000, lng: -77.0833 },
    
    // Arequipa
    'Arequipa': { lat: -16.4090, lng: -71.5375 },
    'Cayma': { lat: -16.4000, lng: -71.5000 },
    'Yanahuara': { lat: -16.4167, lng: -71.5167 },
    
    // Cusco
    'Cusco': { lat: -13.5319, lng: -71.9675 },
    'San Sebastián': { lat: -13.5500, lng: -71.9500 },
    'Santiago': { lat: -13.5167, lng: -71.9833 },
    
    // Trujillo
    'Trujillo': { lat: -8.1116, lng: -79.0287 },
    'La Esperanza': { lat: -8.1000, lng: -79.0167 },
    'El Porvenir': { lat: -8.0833, lng: -79.0000 },
    
    // Chiclayo
    'Chiclayo': { lat: -6.7714, lng: -79.8408 },
    'José Leonardo Ortiz': { lat: -6.7500, lng: -79.8333 },
    'La Victoria': { lat: -6.7667, lng: -79.8500 },
    
    // Piura
    'Piura': { lat: -5.1945, lng: -80.6328 },
    'Castilla': { lat: -5.2000, lng: -80.6500 },
    'Veintiséis de Octubre': { lat: -5.1833, lng: -80.6167 },
    
    // Iquitos
    'Iquitos': { lat: -3.7491, lng: -73.2538 },
    'Belén': { lat: -3.7500, lng: -73.2500 },
    'San Juan Bautista': { lat: -3.7333, lng: -73.2667 },
    
    // Huancayo
    'Huancayo': { lat: -12.0667, lng: -75.2167 },
    'El Tambo': { lat: -12.0500, lng: -75.2000 },
    'Chilca': { lat: -12.0833, lng: -75.2333 },
    
    // Tacna
    'Tacna': { lat: -18.0066, lng: -70.2469 },
    'Alto de la Alianza': { lat: -18.0000, lng: -70.2500 },
    'Ciudad Nueva': { lat: -18.0167, lng: -70.2333 },
    
    // Puno
    'Puno': { lat: -15.8433, lng: -70.0236 },
    'San Román': { lat: -15.8333, lng: -70.0167 },
    'Juliaca': { lat: -15.5000, lng: -70.1333 },
  };
  
  // Buscar por nombre exacto (case insensitive)
  const distritoKey = Object.keys(coordenadasRespaldo).find(
    key => key.toLowerCase() === distrito.toLowerCase()
  );
  
  return distritoKey ? coordenadasRespaldo[distritoKey] : null;
}

/**
 * Obtiene las coordenadas de un distrito, primero intentando geocodificación
 * y luego usando coordenadas de respaldo
 */
export async function obtenerCoordenadasUbicacion(
  departamento: string,
  provincia: string,
  distrito: string
): Promise<Coordenadas | null> {
  // Primero intentar geocodificación
  const coordenadas = await obtenerCoordenadasDistrito(departamento, provincia, distrito);
  
  if (coordenadas) {
    return coordenadas;
  }
  
  // Si falla, usar coordenadas de respaldo
  return obtenerCoordenadasRespaldo(distrito);
}

