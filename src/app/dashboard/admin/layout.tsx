import type { ReactNode } from "react";
import { headers } from "next/headers";
import { soloAdmins, soloAdminsYGerentes } from "@/lib/permissions/middleware";
import { esRutaGestionUsuarios } from "@/lib/permissions/route-matchers";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Todo /dashboard/admin/* es exclusivo de ROL_ADMIN, salvo
  // /dashboard/admin/usuarios, que ROL_GERENTE puede ver en modo
  // solo-lectura (las mutaciones siguen exigiendo ROL_ADMIN en server
  // actions/API routes, y la UI oculta esos controles para gerente).
  const pathname = (await headers()).get("x-pathname");

  if (esRutaGestionUsuarios(pathname)) {
    await soloAdminsYGerentes();
  } else {
    await soloAdmins();
  }

  return <>{children}</>;
}
