export type Departamento = { code: string; nombre: string };
export type Provincia    = { code: string; nombre: string };
export type Distrito     = { code: string; nombre: string };

export interface UbigeoSearchResult {
  dep_code: string;
  dep_nombre: string;
  prov_code: string;
  prov_nombre: string;
  dist_code: string;
  dist_nombre: string;
  rank: number;
}
