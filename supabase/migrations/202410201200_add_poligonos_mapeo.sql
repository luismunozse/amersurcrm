-- Agrega columnas para almacenar polígono del proyecto y geometría de lotes
set search_path = public, crm;

-- Columna para polígono del perímetro del proyecto
alter table if exists crm.proyecto
  add column if not exists poligono jsonb;

comment on column crm.proyecto.poligono is 'Lista de vértices [{"lat":number,"lng":number},...] que define el perímetro del proyecto';

create index if not exists idx_proyecto_poligono on crm.proyecto using gin (poligono);

-- Columna para el polígono dibujado de los lotes sobre el plano
alter table if exists crm.lote
  add column if not exists plano_poligono jsonb;

comment on column crm.lote.plano_poligono is 'Polígono del lote dentro del plano del proyecto. Array de pares [lat,lng]';

create index if not exists idx_lote_plano_poligono on crm.lote using gin (plano_poligono);
