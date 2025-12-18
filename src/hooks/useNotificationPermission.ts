import { useEffect, useState } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Hook para manejar los permisos de notificaciones del navegador
 * Usa null como estado inicial para evitar problemas de hidratación
 */
export function useNotificationPermission() {
  // null = aún no determinado (para evitar hydration mismatch)
  const [permission, setPermission] = useState<NotificationPermissionState | null>(null);

  useEffect(() => {
    // Verificar si el navegador soporta notificaciones
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    // Obtener el permiso actual
    setPermission(Notification.permission as NotificationPermissionState);

    // Escuchar cambios en el permiso (algunos navegadores lo soportan)
    const handlePermissionChange = () => {
      setPermission(Notification.permission as NotificationPermissionState);
    };

    // Intentar detectar cambios (no todos los navegadores lo soportan)
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'notifications' as PermissionName }).then((permissionStatus) => {
        permissionStatus.addEventListener('change', handlePermissionChange);
      }).catch(() => {
        // Algunos navegadores no soportan query de notifications
      });
    }

    return () => {
      if ('permissions' in navigator) {
        navigator.permissions.query({ name: 'notifications' as PermissionName }).then((permissionStatus) => {
          permissionStatus.removeEventListener('change', handlePermissionChange);
        }).catch(() => {
          // Ignorar error
        });
      }
    };
  }, []);

  /**
   * Solicitar permiso para mostrar notificaciones
   */
  const requestPermission = async (): Promise<NotificationPermissionState> => {
    if (permission === 'unsupported' || permission === null) {
      return permission ?? 'unsupported';
    }

    if (permission === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      setPermission(result as NotificationPermissionState);
      return result as NotificationPermissionState;
    } catch (error) {
      console.error('Error al solicitar permiso de notificaciones:', error);
      return permission ?? 'default';
    }
  };

  return {
    permission,
    requestPermission,
    // isReady indica que ya determinamos el estado real del permiso
    isReady: permission !== null,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    isUnsupported: permission === 'unsupported',
  };
}
