"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { FormInput } from "@/components/form/FormInput";
import { LoadingButton } from "@/components/form/LoadingButton";
import { isValidPhone, normalizePhoneE164 } from "@/lib/utils/phone";

interface Props {
  perfil: any;
  isAdmin?: boolean;
  currentEmail: string;
}

export default function EditarPerfilForm({ perfil, isAdmin = false, currentEmail }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [nombreCompleto, setNombreCompleto] = useState(perfil.nombre_completo || '');
  const [dni, setDni] = useState(perfil.dni || '');
  const [telefono, setTelefono] = useState(perfil.telefono || '');
  const [email, setEmail] = useState(currentEmail);

  // Errores de validación
  const [errors, setErrors] = useState<{
    nombreCompleto?: string;
    dni?: string;
    telefono?: string;
    email?: string;
  }>({});

  const validateForm = (): boolean => {
    const newErrors: typeof errors = {};

    // Validar nombre completo
    if (!nombreCompleto.trim()) {
      newErrors.nombreCompleto = "El nombre completo es obligatorio";
    } else if (nombreCompleto.trim().length < 3) {
      newErrors.nombreCompleto = "El nombre debe tener al menos 3 caracteres";
    }

    // Validar DNI (opcional pero debe ser válido si se proporciona)
    if (dni && !/^\d{8}$/.test(dni.trim())) {
      newErrors.dni = "El DNI debe tener 8 dígitos";
    }

    // Validar teléfono
    if (telefono && !isValidPhone(telefono)) {
      newErrors.telefono = "Formato de teléfono inválido. Use formato peruano (9 dígitos) o internacional";
    }

    // Validar email
    if (email && email.trim()) {
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      if (!emailRegex.test(email.trim())) {
        newErrors.email = "Formato de email inválido. Debe ser un email válido (ej: usuario@ejemplo.com)";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validar formulario
    if (!validateForm()) {
      toast.error("Por favor, corrige los errores del formulario");
      return;
    }

    startTransition(async () => {
      try {
        // Detectar si el email cambió
        const emailChanged = email.trim() !== currentEmail;

        const response = await fetch('/api/perfil/actualizar', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre_completo: nombreCompleto.trim(),
            dni: dni.trim() || null,
            telefono: telefono ? normalizePhoneE164(telefono) : null,
            email: emailChanged ? email.trim() : undefined,
          }),
        });

        const result = await response.json();

        if (result.success) {
          if (emailChanged) {
            toast.success(
              "Se ha enviado un correo de confirmación al nuevo email. Tu email actual no cambiará hasta que confirmes desde el correo.",
              { duration: 8000 }
            );
          } else {
            toast.success("Perfil actualizado exitosamente");
          }
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Grid de campos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nombre Completo */}
        <FormInput
          id="nombreCompleto"
          label="Nombre Completo"
          type="text"
          required
          value={nombreCompleto}
          onChange={(e) => {
            setNombreCompleto(e.target.value);
            if (errors.nombreCompleto) {
              setErrors({ ...errors, nombreCompleto: undefined });
            }
          }}
          error={errors.nombreCompleto}
          placeholder="Ej: Juan Pérez García"
          disabled={isPending}
        />

        {/* DNI */}
        <FormInput
          id="dni"
          label="DNI"
          type="text"
          maxLength={8}
          value={dni}
          onChange={(e) => {
            const value = e.target.value.replace(/\D/g, ''); // Solo números
            setDni(value);
            if (errors.dni) {
              setErrors({ ...errors, dni: undefined });
            }
          }}
          error={errors.dni}
          placeholder="Ej: 12345678"
          disabled={isPending}
          helperText="8 dígitos"
        />

        {/* Teléfono */}
        <FormInput
          id="telefono"
          label="Teléfono"
          type="tel"
          value={telefono}
          onChange={(e) => {
            setTelefono(e.target.value);
            if (errors.telefono) {
              setErrors({ ...errors, telefono: undefined });
            }
          }}
          error={errors.telefono}
          placeholder="Ej: 987654321"
          disabled={isPending}
          helperText="Visible para otros miembros del equipo"
        />

        {/* Email */}
        <FormInput
          id="email"
          label="Correo Electrónico"
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) {
              setErrors({ ...errors, email: undefined });
            }
          }}
          error={errors.email}
          placeholder="Ej: usuario@ejemplo.com"
          disabled={isPending}
          helperText="Se enviará un correo de confirmación si cambias tu email"
        />
      </div>

      {/* Nota informativa */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 mt-0.5">
            <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">
              Cambio de email
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              Si cambias tu email, se enviará un correo de confirmación a la nueva dirección. Tu email actual <strong>no cambiará</strong> hasta que hagas clic en el enlace de confirmación del correo.
            </p>
          </div>
        </div>
      </div>

      {/* Botón de guardar */}
      <LoadingButton
        type="submit"
        variant="primary"
        isLoading={isPending}
        loadingText="Guardando..."
        className="w-full"
      >
        Guardar Cambios
      </LoadingButton>
    </form>
  );
}
