"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  NAV_GROUPS,
  byHref,
  useCanAccess,
} from "@/components/SidebarShadcn";
import type { NavItem } from "@/config/navigation";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();
  const { canAccessNavItem } = useCanAccess();

  // Atajo Cmd/Ctrl+K + evento global para abrir desde otros componentes
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    const onCustom = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("command-palette:open", onCustom);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("command-palette:open", onCustom);
    };
  }, []);

  const go = React.useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const resolvedGroups = React.useMemo(
    () =>
      NAV_GROUPS.map((group) => ({
        label: group.label ?? "Principal",
        items: group.hrefs
          .map(byHref)
          .filter((item): item is NavItem => !!item)
          .filter(canAccessNavItem),
      })).filter((g) => g.items.length > 0),
    [canAccessNavItem]
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar módulo, ruta, acción…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        {resolvedGroups.map((group, idx) => (
          <React.Fragment key={group.label}>
            {idx > 0 && <CommandSeparator />}
            <CommandGroup heading={group.label}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={`${group.label} ${item.name}`}
                  onSelect={() => go(item.href)}
                >
                  <span className="mr-2 flex h-4 w-4 items-center justify-center [&_svg]:h-4 [&_svg]:w-4">
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                  {item.badge && (
                    <CommandShortcut>{item.badge}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </React.Fragment>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
