# Supabase – Migraciones y Seeds (DEV)

Este directorio guarda **todo cambio de base** y **datos de prueba** para que el proyecto sea reproducible mientras construimos.

supabase/
  migrations/
    2025-09-14_000_base_schema.sql
    2025-09-14_010_lote_estado_guard_rpc.sql
  seeds/
    dev_seed.sql
  README.md

# ¿Qué incluye cada archivo?

# migrations/2025-09-14_000_base_schema.sql

Crea el schema crm, extensiones (pgcrypto, pg_trgm) y enums:

crm.estado_proyecto: activo | pausado | cerrado

crm.estado_lote: disponible | reservado | vendido

Tablas:

crm.cliente (RLS por created_by)

crm.proyecto (RLS por created_by)

crm.lote con unique (proyecto_id, codigo) y updated_at

Triggers updated_at en proyecto y lote

Índices (gin_trgm_ops en proyecto.nombre, (proyecto_id,codigo) en lote)

RLS para cliente, proyecto, lote

Grants del schema/objetos a authenticated y default privileges

# migrations/2025-09-14_010_lote_estado_guard_rpc.sql

Guard: bloquea cambios directos de estado en lote (sólo mediante funciones)

RPC:

crm.reservar_lote(uuid) → disponible → reservado

crm.vender_lote(uuid) → reservado → vendido

crm.liberar_lote(uuid) → reservado → disponible

GRANT EXECUTE a authenticated para esas funciones

seeds/dev_seed.sql

Crea un proyecto demo y lotes para tu usuario (respeta RLS)

Crea clientes de prueba

# ⚠️ Editá el email adentro antes de ejecutar:

**where email = 'TU_EMAIL_AQUI'**

# Cómo aplicar (DEV)

**Migración base**
**Supabase Studio → SQL Editor → pegá migrations/2025-09-14_000_base_schema.sql → RUN.**

**Guard + RPC de estado**
**Studio → SQL Editor → pegá migrations/2025-09-14_010_lote_estado_guard_rpc.sql → RUN.**

**Seed de datos**
**Editá seeds/dev_seed.sql reemplazando TU_EMAIL_AQUI por tu email (el de Auth > Users) y ejecutalo en el SQL Editor.**

**Tip (opcional): podés envolver cada archivo en transacción para mayor seguridad en DEV:**

begin;
-- (pegar el contenido completo)
commit;

