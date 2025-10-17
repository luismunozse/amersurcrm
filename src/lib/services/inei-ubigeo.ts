// Servicio para descargar y procesar datos oficiales del INEI
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const exists = promisify(fs.exists);

// URLs oficiales del INEI
const INEI_URLS = {
  ubigeo: 'https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1469/cap01/indice.htm',
  // URL directa del archivo XLSX (actualizar cuando esté disponible)
  xlsx: 'https://www.inei.gob.pe/media/MenuRecursivo/publicaciones_digitales/Est/Lib1469/cap01/01.01.01.01.xlsx'
};

// URLs alternativas de datos abiertos
const ALTERNATIVE_URLS = [
  'https://datosabiertos.gob.pe/dataset/ubigeo-peru',
  'https://www.inei.gob.pe/estadisticas/censos/',
  // URL de respaldo con datos estructurados
  'https://raw.githubusercontent.com/RitchieRD/ubigeos-peru-data/main/data/ubigeos-peru.json'
];

interface UbigeoData {
  codigo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  region?: string;
  macroregion?: string;
  superficie?: number;
  latitud?: number;
  longitud?: number;
}

interface ProcessedUbigeo {
  departamentos: Array<{
    codigo: string;
    nombre: string;
    provincias: Array<{
      codigo: string;
      nombre: string;
      distritos: Array<{
        codigo: string;
        nombre: string;
      }>;
    }>;
  }>;
}

class INEIUbigeoService {
  private dataPath: string;
  private cachePath: string;
  private lastUpdate: Date | null = null;

  constructor() {
    this.dataPath = path.join(process.cwd(), 'data', 'ubigeo');
    this.cachePath = path.join(this.dataPath, 'ubigeo-inei.json');
  }

  // Crear directorio de datos si no existe
  private async ensureDataDirectory(): Promise<void> {
    if (!await exists(this.dataPath)) {
      await fs.promises.mkdir(this.dataPath, { recursive: true });
    }
  }

  // Descargar archivo XLSX del INEI
  private async downloadXLSX(url: string): Promise<Buffer> {
    try {
      console.log(`Descargando datos del INEI desde: ${url}`);
      
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'AMERSUR-CRM/1.0 (https://amersur.com)',
          'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`Error descargando archivo: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (error) {
      console.error('Error descargando XLSX del INEI:', error);
      throw error;
    }
  }

  // Procesar archivo XLSX y convertirlo a JSON estructurado
  private processXLSX(buffer: Buffer): ProcessedUbigeo {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convertir a JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      // Procesar datos (asumiendo estructura estándar del INEI)
      const ubigeoData: UbigeoData[] = [];
      
      // Saltar encabezados y procesar filas
      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i] as any[];
        if (row && row.length >= 4) {
          ubigeoData.push({
            codigo: String(row[0] || '').padStart(6, '0'),
            departamento: String(row[1] || ''),
            provincia: String(row[2] || ''),
            distrito: String(row[3] || ''),
            region: row[4] ? String(row[4]) : undefined,
            macroregion: row[5] ? String(row[5]) : undefined,
            superficie: row[6] ? Number(row[6]) : undefined,
            latitud: row[7] ? Number(row[7]) : undefined,
            longitud: row[8] ? Number(row[8]) : undefined
          });
        }
      }

      return this.structureUbigeoData(ubigeoData);
    } catch (error) {
      console.error('Error procesando XLSX:', error);
      throw error;
    }
  }

  // Estructurar datos en formato jerárquico
  private structureUbigeoData(data: UbigeoData[]): ProcessedUbigeo {
    const departamentosMap = new Map<string, any>();
    
    data.forEach(item => {
      const deptCode = item.codigo.substring(0, 2);
      const provCode = item.codigo.substring(0, 4);
      const distCode = item.codigo;

      // Agregar departamento
      if (!departamentosMap.has(deptCode)) {
        departamentosMap.set(deptCode, {
          codigo: deptCode,
          nombre: item.departamento,
          provincias: new Map()
        });
      }

      const departamento = departamentosMap.get(deptCode);

      // Agregar provincia
      if (!departamento.provincias.has(provCode)) {
        departamento.provincias.set(provCode, {
          codigo: provCode,
          nombre: item.provincia,
          distritos: []
        });
      }

      // Agregar distrito
      departamento.provincias.get(provCode).distritos.push({
        codigo: distCode,
        nombre: item.distrito
      });
    });

    // Convertir Maps a Arrays
    const departamentos = Array.from(departamentosMap.values()).map(dept => ({
      codigo: dept.codigo,
      nombre: dept.nombre,
      provincias: Array.from(dept.provincias.values()).map((prov: any) => ({
        codigo: prov.codigo,
        nombre: prov.nombre,
        distritos: prov.distritos
      }))
    }));

    return { departamentos };
  }

  // Descargar datos alternativos si el INEI falla
  private async downloadAlternativeData(): Promise<ProcessedUbigeo> {
    for (const url of ALTERNATIVE_URLS) {
      try {
        console.log(`Intentando descargar datos alternativos desde: ${url}`);
        
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'AMERSUR-CRM/1.0',
            'Accept': 'application/json, */*'
          }
        });

        if (response.ok) {
          const data = await response.json();
          
          // Procesar según el formato de la fuente
          if (Array.isArray(data)) {
            return this.structureUbigeoData(data);
          } else if (data.departamentos) {
            return data;
          }
        }
      } catch (error) {
        console.warn(`Error con fuente alternativa ${url}:`, error);
        continue;
      }
    }

    throw new Error('No se pudieron obtener datos de ninguna fuente');
  }

  // Actualizar datos del INEI
  async updateUbigeoData(): Promise<ProcessedUbigeo> {
    await this.ensureDataDirectory();

    try {
      // Intentar descargar del INEI primero
      const xlsxBuffer = await this.downloadXLSX(INEI_URLS.xlsx);
      const processedData = this.processXLSX(xlsxBuffer);
      
      // Guardar datos procesados
      await writeFile(this.cachePath, JSON.stringify(processedData, null, 2));
      this.lastUpdate = new Date();
      
      console.log('Datos del INEI actualizados exitosamente');
      return processedData;
    } catch (error) {
      console.warn('Error descargando del INEI, intentando fuentes alternativas...');
      
      try {
        const alternativeData = await this.downloadAlternativeData();
        
        // Guardar datos alternativos
        await writeFile(this.cachePath, JSON.stringify(alternativeData, null, 2));
        this.lastUpdate = new Date();
        
        console.log('Datos alternativos descargados exitosamente');
        return alternativeData;
      } catch (altError) {
        console.error('Error con todas las fuentes:', altError);
        throw altError;
      }
    }
  }

  // Cargar datos desde cache
  async loadCachedData(): Promise<ProcessedUbigeo | null> {
    try {
      if (await exists(this.cachePath)) {
        const data = await readFile(this.cachePath, 'utf8');
        const parsed = JSON.parse(data);
        this.lastUpdate = new Date(fs.statSync(this.cachePath).mtime);
        return parsed;
      }
    } catch (error) {
      console.error('Error cargando datos en cache:', error);
    }
    return null;
  }

  // Verificar si los datos necesitan actualización
  shouldUpdate(): boolean {
    if (!this.lastUpdate) return true;
    
    // Actualizar cada 7 días
    const daysSinceUpdate = (Date.now() - this.lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
    return daysSinceUpdate >= 7;
  }

  // Obtener datos (cargar desde cache o actualizar)
  async getUbigeoData(): Promise<ProcessedUbigeo> {
    // Intentar cargar desde cache primero
    const cachedData = await this.loadCachedData();
    
    if (cachedData && !this.shouldUpdate()) {
      return cachedData;
    }

    // Por ahora, usar datos locales directamente
    // TODO: Implementar descarga del INEI cuando esté disponible
    try {
      console.log('Usando datos locales de ubicaciones');
      return await this.loadLocalData();
    } catch (error) {
      console.error('Error cargando datos locales:', error);
      throw new Error('No hay datos disponibles');
    }
  }

  // Cargar datos locales como fallback
  private async loadLocalData(): Promise<ProcessedUbigeo> {
    // Importar datos completos de Perú desde JSON
    const ubigeoData = await import('@/lib/data/ubigeo-peru-simple.json');
    
    // Guardar en cache
    await writeFile(this.cachePath, JSON.stringify(ubigeoData.default, null, 2));
    this.lastUpdate = new Date();

    return ubigeoData.default;
  }

  // Obtener estadísticas de los datos
  getDataStats(data: ProcessedUbigeo): { departamentos: number; provincias: number; distritos: number } {
    let provincias = 0;
    let distritos = 0;

    data.departamentos.forEach(dept => {
      provincias += dept.provincias.length;
      dept.provincias.forEach(prov => {
        distritos += prov.distritos.length;
      });
    });

    return {
      departamentos: data.departamentos.length,
      provincias,
      distritos
    };
  }
}

// Instancia singleton
export const ineiUbigeoService = new INEIUbigeoService();

// Función de conveniencia para obtener datos
export async function getUbigeoData(): Promise<ProcessedUbigeo> {
  return await ineiUbigeoService.getUbigeoData();
}

// Función para forzar actualización
export async function forceUpdateUbigeoData(): Promise<ProcessedUbigeo> {
  return await ineiUbigeoService.updateUbigeoData();
}
