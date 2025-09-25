-- Agregar columna estado_civil al cliente (opcional)
-- Valores permitidos: soltero, casado, viudo, divorciado
-- Fecha: 2025-09-25

set search_path = public, crm;

alter table crm.cliente
  add column if not exists estado_civil text
  check (estado_civil in ('soltero','casado','viudo','divorciado'));


