import { supabaseServer } from "@/lib/supabaseServer";
import NewClienteForm from "./_NewClienteForm";

export default async function ClientesPage() {
  const supabase = supabaseServer();
  const { data: clientes, error } = await supabase
    .from("crm.cliente")           // usa tu tabla (con RLS ON)
    .select("id,nombre,email,telefono,created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) return <pre className="text-red-600">{error.message}</pre>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Clientes</h1>
      <NewClienteForm />
      <ul className="divide-y border rounded">
        {(clientes ?? []).map((c) => (
          <li key={c.id} className="p-3">
            <div className="font-medium">{c.nombre}</div>
            <div className="text-sm opacity-75">{c.email} · {c.telefono}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
