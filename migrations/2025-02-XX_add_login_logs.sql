-- Tabla para registrar intentos de autenticación
create table if not exists crm.login_audit (
  id uuid primary key default gen_random_uuid(),
  username text,
  dni text,
  ip_address text,
  user_agent text,
  login_type text check (login_type in ('admin', 'vendedor')),
  stage text check (stage in ('lookup', 'authentication', 'recovery', 'security')) not null default 'authentication',
  success boolean not null,
  error_message text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

comment on table crm.login_audit is 'Registro de intentos de login (exitosos y fallidos)';

create index if not exists login_audit_created_at_idx on crm.login_audit (created_at);
create index if not exists login_audit_username_idx on crm.login_audit (username);
create index if not exists login_audit_dni_idx on crm.login_audit (dni);
