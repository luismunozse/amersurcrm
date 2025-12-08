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

  // Trackear campos editados
  const [camposEditados, setCamposEditados] = useState<Set<string>>(new Set());

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
      const emailTrimmed = email.trim();
      const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      if (!emailRegex.test(emailTrimmed)) {
        newErrors.email = "Formato de email inválido. Debe ser un email válido (ej: usuario@ejemplo.com)";
      } else {
        // Validar que el dominio sea válido (no dominios locales)
        const domain = emailTrimmed.split('@')[1]?.toLowerCase();
        const invalidDomains = ['.local', '.admin', '.test', '.localhost'];
        const hasInvalidDomain = invalidDomains.some(invalid => domain?.endsWith(invalid));
        
        if (hasInvalidDomain) {
          newErrors.email = "No se puede usar un dominio local (.local, .admin, etc.). Usa un email con un dominio válido de internet como @gmail.com, @outlook.com, @hotmail.com";
        }
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

    // Detectar si el email cambió (cambio importante que requiere confirmación)
    const emailChanged = email.trim() !== currentEmail;
    
    // Si el email cambió, mostrar confirmación
    if (emailChanged) {
      const confirmar = window.confirm(
        "¿Estás seguro de que deseas cambiar tu email?\n\n" +
        "Se enviará un correo de confirmación al nuevo email. " +
        "Tu email actual no cambiará hasta que confirmes desde el correo."
      );
      
      if (!confirmar) {
        return;
      }
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
            if (result.emailUpdatedDirectly) {
              // Email actualizado directamente (desde un email inválido)
              toast.success(
                "Email actualizado exitosamente. Tu email ha sido cambiado directamente.",
                { duration: 5000 }
              );
            } else {
              // Email actualizado con confirmación (desde un email válido)
              toast.success(
                "Se ha enviado un correo de confirmación al nuevo email. Tu email actual no cambiará hasta que confirmes desde el correo.",
                { duration: 8000 }
              );
            }
          } else {
            toast.success("Perfil actualizado exitosamente");
          }
          // Limpiar campos editados después de guardar
          setCamposEditados(new Set());
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
        <div className="relative">
          {camposEditados.has('nombreCompleto') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full border-2 border-crm-card dark:border-crm-bg-primary" title="Campo modificado" />
          )}
          <FormInput
            id="nombreCompleto"
            label="Nombre Completo"
            type="text"
            required
            value={nombreCompleto}
          onChange={(e) => {
            const nuevoValor = e.target.value;
            setNombreCompleto(nuevoValor);
            if (errors.nombreCompleto) {
              setErrors({ ...errors, nombreCompleto: undefined });
            }
            // Marcar como editado si cambió
            if (nuevoValor !== (perfil.nombre_completo || '')) {
              setCamposEditados(prev => new Set(prev).add('nombreCompleto'));
            } else {
              setCamposEditados(prev => {
                const nuevo = new Set(prev);
                nuevo.delete('nombreCompleto');
                return nuevo;
              });
            }
          }}
            error={errors.nombreCompleto}
            placeholder="Ej: Juan Pérez García"
            disabled={isPending}
          />
        </div>

        {/* DNI */}
        <div className="relative">
          {camposEditados.has('dni') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full border-2 border-crm-card dark:border-crm-bg-primary" title="Campo modificado" />
          )}
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
            // Marcar como editado si cambió
            if (value !== (perfil.dni || '')) {
              setCamposEditados(prev => new Set(prev).add('dni'));
            } else {
              setCamposEditados(prev => {
                const nuevo = new Set(prev);
                nuevo.delete('dni');
                return nuevo;
              });
            }
          }}
            error={errors.dni}
            placeholder="Ej: 12345678"
            disabled={isPending}
            helperText="8 dígitos"
          />
        </div>

        {/* Teléfono */}
        <div className="relative">
          {camposEditados.has('telefono') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full border-2 border-crm-card dark:border-crm-bg-primary" title="Campo modificado" />
          )}
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
            // Marcar como editado si cambió
            if (e.target.value !== (perfil.telefono || '')) {
              setCamposEditados(prev => new Set(prev).add('telefono'));
            } else {
              setCamposEditados(prev => {
                const nuevo = new Set(prev);
                nuevo.delete('telefono');
                return nuevo;
              });
            }
          }}
            error={errors.telefono}
            placeholder="Ej: 987654321"
            disabled={isPending}
            helperText="Visible para otros miembros del equipo"
          />
        </div>

        {/* Email */}
        <div className="relative">
          {camposEditados.has('email') && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-500 dark:bg-yellow-400 rounded-full border-2 border-crm-card dark:border-crm-bg-primary" title="Campo modificado" />
          )}
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
            // Marcar como editado si cambió
            if (e.target.value !== currentEmail) {
              setCamposEditados(prev => new Set(prev).add('email'));
            } else {
              setCamposEditados(prev => {
                const nuevo = new Set(prev);
                nuevo.delete('email');
                return nuevo;
              });
            }
          }}
            error={errors.email}
            placeholder="Ej: usuario@ejemplo.com"
            disabled={isPending}
            helperText="Se enviará un correo de confirmación si cambias tu email"
          />
        </div>
      </div>

      {/* Indicador de campos editados */}
      {camposEditados.size > 0 && (
        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-center gap-2">
          <div className="w-2 h-2 bg-yellow-500 dark:bg-yellow-400 rounded-full"></div>
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            Tienes {camposEditados.size} campo{camposEditados.size > 1 ? 's' : ''} modificado{camposEditados.size > 1 ? 's' : ''}. No olvides guardar los cambios.
          </p>
        </div>
      )}

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
