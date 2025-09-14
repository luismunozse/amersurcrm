"use client";
import { useSearchParams, useRouter } from "next/navigation";

export default function Pagination({ total, page, perPage }: { total: number; page: number; perPage: number; }) {
  const router = useRouter();
  const params = useSearchParams();
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const q = params.get("q") || "";

  const go = (p: number) => {
    const sp = new URLSearchParams(params.toString());
    if (q) sp.set("q", q); else sp.delete("q");
    sp.set("page", String(p));
    router.push(`/dashboard/clientes?${sp.toString()}`);
  };

  return (
    <div className="flex items-center justify-between mt-4">
      <button className="btn" disabled={page <= 1} onClick={() => go(page - 1)}>← Anterior</button>
      <div className="text-sm text-text-muted">Página {page} de {lastPage}</div>
      <button className="btn" disabled={page >= lastPage} onClick={() => go(page + 1)}>Siguiente →</button>
    </div>
  );
}
