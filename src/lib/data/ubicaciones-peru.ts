// Datos de ubicaciones de Perú - Departamentos, Provincias y Distritos
// Fuente: INEI - Instituto Nacional de Estadística e Informática

export interface Departamento {
  codigo: string;
  nombre: string;
  provincias: Provincia[];
}

export interface Provincia {
  codigo: string;
  nombre: string;
  distritos: Distrito[];
}

export interface Distrito {
  codigo: string;
  nombre: string;
}

export const UBICACIONES_PERU: Departamento[] = [
  { codigo: "01", nombre: "Amazonas", provincias: [] },
  { codigo: "02", nombre: "Áncash", provincias: [] },
  { codigo: "03", nombre: "Apurímac", provincias: [] },
  { codigo: "04", nombre: "Arequipa", provincias: [] },
  { codigo: "05", nombre: "Ayacucho", provincias: [] },
  { codigo: "06", nombre: "Cajamarca", provincias: [] },
  { codigo: "07", nombre: "Callao", provincias: [] },
  { codigo: "08", nombre: "Cusco", provincias: [] },
  { codigo: "09", nombre: "Huancavelica", provincias: [] },
  { codigo: "10", nombre: "Huánuco", provincias: [] },
  { codigo: "11", nombre: "Ica", provincias: [] },
  { codigo: "12", nombre: "Junín", provincias: [] },
  { codigo: "13", nombre: "La Libertad", provincias: [] },
  { codigo: "14", nombre: "Lambayeque", provincias: [] },
  { codigo: "15", nombre: "Lima", provincias: [] },
  { codigo: "16", nombre: "Loreto", provincias: [] },
  { codigo: "17", nombre: "Madre de Dios", provincias: [] },
  { codigo: "18", nombre: "Moquegua", provincias: [] },
  { codigo: "19", nombre: "Pasco", provincias: [] },
  { codigo: "20", nombre: "Piura", provincias: [] },
  { codigo: "21", nombre: "Puno", provincias: [] },
  { codigo: "22", nombre: "San Martín", provincias: [] },
  { codigo: "23", nombre: "Tacna", provincias: [] },
  { codigo: "24", nombre: "Tumbes", provincias: [] },
  { codigo: "25", nombre: "Ucayali", provincias: [] }
];

// Funciones de utilidad para trabajar con ubicaciones
export function getDepartamentos(): Departamento[] {
  return UBICACIONES_PERU;
}

export function getProvinciasByDepartamento(codigoDepartamento: string): Provincia[] {
  const departamento = UBICACIONES_PERU.find(d => d.codigo === codigoDepartamento);
  return departamento ? departamento.provincias : [];
}

export function getDistritosByProvincia(codigoDepartamento: string, codigoProvincia: string): Distrito[] {
  const departamento = UBICACIONES_PERU.find(d => d.codigo === codigoDepartamento);
  if (!departamento) return [];
  
  const provincia = departamento.provincias.find(p => p.codigo === codigoProvincia);
  return provincia ? provincia.distritos : [];
}

export function getUbicacionCompleta(codigoDepartamento: string, codigoProvincia: string, codigoDistrito: string): {
  departamento: string;
  provincia: string;
  distrito: string;
} | null {
  const departamento = UBICACIONES_PERU.find(d => d.codigo === codigoDepartamento);
  if (!departamento) return null;
  
  const provincia = departamento.provincias.find(p => p.codigo === codigoProvincia);
  if (!provincia) return null;
  
  const distrito = provincia.distritos.find(d => d.codigo === codigoDistrito);
  if (!distrito) return null;
  
  return {
    departamento: departamento.nombre,
    provincia: provincia.nombre,
    distrito: distrito.nombre
  };
}