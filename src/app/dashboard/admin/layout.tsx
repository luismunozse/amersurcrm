import type { ReactNode } from "react";
import { soloAdmins } from "@/lib/permissions/middleware";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await soloAdmins();
  return <>{children}</>;
}
