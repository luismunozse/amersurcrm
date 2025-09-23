// Servicio simplificado para datos de ubigeo
export async function getUbigeoData() {
  try {
    // Importar datos directamente desde el JSON
    const ubigeoData = await import('@/lib/data/ubigeo-peru-simple.json');
    return ubigeoData.default;
  } catch (error) {
    console.error('Error cargando datos de ubigeo:', error);
    throw new Error('No hay datos disponibles');
  }
}
