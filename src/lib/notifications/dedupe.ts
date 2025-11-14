import type { NotificacionNoLeida } from '@/types/crm';

export function dedupeNotifications(notifs: NotificacionNoLeida[]) {
  const seen = new Set<string>();
  return notifs.filter((notif) => {
    const key = notif.id ?? `${notif.tipo}-${notif.created_at}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
