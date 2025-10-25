"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

interface Props {
  perfil: any;
  isAdmin?: boolean;
}

export default function EditarPerfilForm({ perfil, isAdmin = false }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [telefono, setTelefono] = useState(perfil.telefono || '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const response = await fetch('/api/perfil/actualizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            telefono,
          }),
        });

        const result = await response.json();

        if (result.success) {
          toast.success("Perfil actualizado exitosamente");
          router.refresh();
        } else {
          toast.error(result.error || "Error al actualizar perfil");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error inesperado al actualizar perfil");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-crm-text-primary mb-2">
          Teléfono
        </label>
        <input
          type="tel"
          value={telefono}
          onChange={(e) => setTelefono(e.target.value)}
          placeholder="Ej: 987654321"
          disabled={isPending}
          className="w-full px-4 py-2.5 border border-crm-border rounded-lg bg-crm-background text-crm-text-primary placeholder-crm-text-muted focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:opacity-50"
        />
        <p className="text-xs text-crm-text-muted mt-1">
          Este teléfono será visible para otros miembros del equipo
        </p>
      </div>

      <div className="p-4 bg-crm-background rounded-lg border border-crm-border">
        <p className="text-sm text-crm-text-muted">
          <strong>Nota:</strong>{" "}
          {isAdmin
            ? "Para modificar tu nombre, DNI o email, utiliza la sección Administración → Usuarios."
            : "Para modificar tu nombre, DNI o email, contacta con el administrador del sistema."}
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full px-4 py-2.5 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {isPending ? "Guardando..." : "Guardar Cambios"}
      </button>
    </form>
  );
}
