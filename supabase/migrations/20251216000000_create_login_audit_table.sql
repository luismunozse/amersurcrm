-- Crear tabla de auditoría de intentos de login
CREATE TABLE IF NOT EXISTS crm.login_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT,
  dni TEXT, -- Para login de vendedores
  login_type TEXT NOT NULL DEFAULT 'admin', -- 'admin', 'vendedor', 'extension'
  stage TEXT NOT NULL DEFAULT 'lookup', -- 'lookup', 'authentication', 'recovery', 'security'
  success BOOLEAN NOT NULL DEFAULT FALSE,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_login_audit_username ON crm.login_audit(username);
CREATE INDEX IF NOT EXISTS idx_login_audit_dni ON crm.login_audit(dni);
CREATE INDEX IF NOT EXISTS idx_login_audit_ip_address ON crm.login_audit(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_audit_created_at ON crm.login_audit(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_login_audit_success ON crm.login_audit(success);
CREATE INDEX IF NOT EXISTS idx_login_audit_stage ON crm.login_audit(stage);

-- Índices compuestos para rate limiting
CREATE INDEX IF NOT EXISTS idx_login_audit_rate_limit_username
ON crm.login_audit(username, success, stage, created_at);

CREATE INDEX IF NOT EXISTS idx_login_audit_rate_limit_dni
ON crm.login_audit(dni, success, stage, created_at);

COMMENT ON TABLE crm.login_audit IS 'Registro de intentos de login para auditoría y rate limiting';
