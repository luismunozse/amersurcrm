"use client";

import { useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function EmailConfirmationToast() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'email_confirmed') {
      toast.success('¡Email confirmado! Tu dirección de correo ha sido actualizada exitosamente.', {
        duration: 6000,
      });
      // Refrescar los datos del servidor y luego limpiar la URL
      router.refresh();
      setTimeout(() => {
        router.replace('/dashboard/perfil');
      }, 100);
    }

    if (error === 'confirmation_failed') {
      toast.error('Error al confirmar el cambio de email. El enlace puede haber expirado.', {
        duration: 6000,
      });
      // Limpiar los parámetros de la URL
      router.replace('/dashboard/perfil');
    }
  }, [searchParams, router]);

  return null;
}
