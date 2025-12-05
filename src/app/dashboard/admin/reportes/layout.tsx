import type { ReactNode } from "react";
import { PERMISOS } from "@/lib/permissions";
import { protegerRuta } from "@/lib/permissions/middleware";

export default async function AdminReportesLayout({ children }: { children: ReactNode }) {
  await protegerRuta({ permiso: PERMISOS.REPORTES.GLOBALES });
  return <>{children}</>;
}
