"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSidebarBadges, type SidebarBadges } from "@/app/dashboard/actions/sidebar-badges";

const POLL_INTERVAL_MS = 60_000;

export function useSidebarBadges(): SidebarBadges {
  const [badges, setBadges] = useState<SidebarBadges>({});
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const next = await getSidebarBadges();
      setBadges(next);
    } finally {
      inFlight.current = false;
    }
  }, []);

  useEffect(() => {
    refresh();
    const interval = window.setInterval(refresh, POLL_INTERVAL_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  return badges;
}
