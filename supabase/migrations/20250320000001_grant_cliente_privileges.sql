-- Otorga privilegios explícitos a los roles base sobre crm.cliente

GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE crm.cliente
  TO anon, authenticated, service_role;
