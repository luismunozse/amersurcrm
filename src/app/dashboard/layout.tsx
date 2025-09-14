import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabaseServer";
import Header from "@/components/Header"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  /*return (
    <div className="min-h-dvh">
      <header className="border-b p-4 flex items-center gap-3">
        <div className="font-semibold">AMERSUR CRM</div>
        <nav className="text-sm">
          <a className="mr-4" href="/dashboard">Dashboard</a>
          <a className="mr-4" href="/dashboard/proyectos">Proyectos</a>
          <a className="mr-4" href="/dashboard/clientes">Clientes</a>
        </nav>
        <form action="/logout" className="ml-auto">
          <button className="text-sm border px-3 py-1 rounded" formAction="/logout">Salir</button>
        </form>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );*/

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl p-6">{children}</main>
    </>
  );
}
