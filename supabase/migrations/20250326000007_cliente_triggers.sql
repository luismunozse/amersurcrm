-- Trigger to auto-assign vendedor when a user creates a client
CREATE OR REPLACE FUNCTION crm.asignar_vendedor_por_defecto()
RETURNS TRIGGER AS $$
DECLARE
  v_username text;
BEGIN
  -- Si ya viene asignado, no hacemos nada
  IF NEW.vendedor_asignado IS NOT NULL OR NEW.vendedor_username IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT username INTO v_username
  FROM crm.usuario_perfil
  WHERE id = NEW.created_by
  LIMIT 1;

  IF v_username IS NOT NULL THEN
    NEW.vendedor_asignado := NEW.created_by;
    NEW.vendedor_username := v_username;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cliente_asignar_vendedor ON crm.cliente;
CREATE TRIGGER tr_cliente_asignar_vendedor
BEFORE INSERT ON crm.cliente
FOR EACH ROW
EXECUTE FUNCTION crm.asignar_vendedor_por_defecto();

-- Trigger para actualizaciones: si se reasigna el vendedor por username, sincronizar el uuid y viceversa
CREATE OR REPLACE FUNCTION crm.sync_vendedor_asignado()
RETURNS TRIGGER AS $$
DECLARE
  v_id uuid;
  v_username text;
BEGIN
  IF NEW.vendedor_username IS NOT NULL AND (OLD.vendedor_username IS DISTINCT FROM NEW.vendedor_username) THEN
    SELECT id INTO v_id
    FROM crm.usuario_perfil
    WHERE username = NEW.vendedor_username
    LIMIT 1;

    IF v_id IS NOT NULL THEN
      NEW.vendedor_asignado := v_id;
    END IF;
  ELSIF NEW.vendedor_asignado IS NOT NULL AND (OLD.vendedor_asignado IS DISTINCT FROM NEW.vendedor_asignado) THEN
    SELECT username INTO v_username
    FROM crm.usuario_perfil
    WHERE id = NEW.vendedor_asignado
    LIMIT 1;

    IF v_username IS NOT NULL THEN
      NEW.vendedor_username := v_username;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_cliente_sync_vendedor ON crm.cliente;
CREATE TRIGGER tr_cliente_sync_vendedor
BEFORE INSERT OR UPDATE ON crm.cliente
FOR EACH ROW
EXECUTE FUNCTION crm.sync_vendedor_asignado();
