set search_path = public, crm;

-- Agregar columna descripción a proyectos
alter table crm.proyecto
  add column if not exists descripcion text;
