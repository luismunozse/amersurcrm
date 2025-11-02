import { useEffect, useState } from 'react';

export type NotificationPermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

/**
 * Hook para manejar los permisos de notificaciones del navegador
 * @returns {NotificationPermissionState} - Estado actual del permiso
 * @returns {() => Promise<NotificationPermissionState>} - Función para solicitar permiso
 */
export function useNotificationPermission() {
  const [permission, setPermission] = useState<NotificationPermissionState>('default');

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
    if (permission === 'unsupported') {
      return 'unsupported';
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
      return permission;
    }
  };

  return {
    permission,
    requestPermission,
    isGranted: permission === 'granted',
    isDenied: permission === 'denied',
    isDefault: permission === 'default',
    isUnsupported: permission === 'unsupported',
  };
}
