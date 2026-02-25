"use client";

import { useEffect, useMemo, useState } from "react";
import { Spinner } from '@/components/ui/Spinner';

type Rol = {
  id: string;
  nombre: string;
  descripcion?: string;
};

type UsuarioEditable = {
  id: string;
  username?: string;
  email?: string;
  nombre_completo?: string;
  dni?: string;
  telefono?: string | null;
  rol?: { id: string; nombre: string; descripcion?: string };
  activo: boolean;
  meta_mensual?: number;
  comision_porcentaje?: number;
};

interface UserEditModalProps {
  open: boolean;
  onClose: () => void;
  user: UsuarioEditable | null;
  roles: Rol[];
  onSave: (payload: {
    id: string;
    username?: string;
    email?: string;
    nombre_completo?: string;
    dni?: string;
    telefono?: string | null;
    rol_id?: string;
    meta_mensual?: number | null;
    comision_porcentaje?: number | null;
    activo?: boolean;
  }) => Promise<boolean>;
}

export default function UserEditModal({ open, onClose, user, roles, onSave }: UserEditModalProps) {
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [nombre, setNombre] = useState<string>("");
  const [dni, setDni] = useState<string>("");
  const [telefono, setTelefono] = useState<string>("");
  const [rolId, setRolId] = useState<string>("");
  const [meta, setMeta] = useState<string>("");
  const [comision, setComision] = useState<string>("");
  const [activo, setActivo] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState(false);

  // Valores iniciales para detectar cambios
  const initial = useMemo(() => ({
    username: user?.username || "",
    email: user?.email || "",
    nombre: user?.nombre_completo || "",
    dni: user?.dni || "",
    telefono: user?.telefono || "",
    rolId: user?.rol?.id || "",
    meta: user?.meta_mensual != null ? String(user.meta_mensual) : "",
    comision: user?.comision_porcentaje != null ? String(user.comision_porcentaje) : "",
    activo: user?.activo ?? true,
  }), [user]);

  useEffect(() => {
    if (open && user) {
      setUsername(initial.username);
      setEmail(initial.email);
      setNombre(initial.nombre);
      setDni(initial.dni);
      setTelefono(initial.telefono);
      setRolId(initial.rolId);
      setMeta(initial.meta);
      setComision(initial.comision);
      setActivo(initial.activo);
    }
  }, [open, user, initial]);

  if (!open || !user) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { id: user.id };

    if (username !== initial.username) payload.username = username;
    if (email !== initial.email && email.trim()) payload.email = email.trim().toLowerCase();
    if (nombre !== initial.nombre) payload.nombre_completo = nombre;
    if (dni !== initial.dni) payload.dni = dni;
    if (telefono !== initial.telefono) payload.telefono = telefono === "" ? null : telefono;
    if (rolId !== initial.rolId && rolId) payload.rol_id = rolId;
    if (meta !== initial.meta) payload.meta_mensual = meta === "" ? null : parseInt(meta, 10);
    if (comision !== initial.comision) payload.comision_porcentaje = comision === "" ? null : Number(comision);
    if (activo !== initial.activo) payload.activo = activo;

    const hasChanges = Object.keys(payload).length > 1;
    if (!hasChanges) {
      onClose();
      return;
    }

    setIsLoading(true);
    try {
      const ok = await onSave(payload);
      if (ok) onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50" onClick={isLoading ? undefined : onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-crm-card border border-crm-border rounded-xl shadow-crm-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-crm-text-primary">Editar Usuario</h3>
          <button onClick={onClose} disabled={isLoading} className="text-crm-text-muted hover:text-crm-text-primary disabled:opacity-50">✕</button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Username</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-crm-text-muted">@</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                  className="w-full pl-8 pr-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                  placeholder="jperez"
                  maxLength={50}
                />
              </div>
              <p className="text-xs text-crm-text-muted mt-1">Solo letras minúsculas y números</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="usuario@ejemplo.com"
              />
              <p className="text-xs text-crm-text-muted mt-1">Email para inicio de sesión</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Nombre Completo</label>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">DNI</label>
              <input
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                maxLength={8}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="12345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Teléfono</label>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="987654321"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Rol</label>
              <select
                value={rolId}
                onChange={(e) => setRolId(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
              >
                <option value="">Seleccionar rol</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.nombre.replace('ROL_', '').replace('_', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Meta Mensual (S/.)</label>
              <input
                type="number"
                value={meta}
                onChange={(e) => setMeta(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="50000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Comisión (%)</label>
              <input
                type="number"
                step="0.1"
                value={comision}
                onChange={(e) => setComision(e.target.value)}
                className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary"
                placeholder="2.5"
              />
            </div>
            <div className="md:col-span-2">
              <label className="inline-flex items-center gap-2 text-sm text-crm-text-primary">
                <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                Activo
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={isLoading} className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors disabled:opacity-50">
              Cancelar
            </button>
            <button type="submit" disabled={isLoading} className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <Spinner size="sm" color="white" />
                  Guardando...
                </div>
              ) : (
                'Guardar cambios'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


