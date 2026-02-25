"use server";

/**
 * Server action para detección de clientes duplicados.
 */

import { createServerActionClient } from "@/lib/supabase.server-actions";

// ============================================================
// Detección de duplicados
// ============================================================

import type { DuplicadoEncontrado } from "./_actions-helpers";

export async function detectarDuplicados(params: {
  nombre: string;
  telefono?: string;
  email?: string;
  excludeId?: string;
}): Promise<{ duplicados: DuplicadoEncontrado[] }> {
  const supabase = await createServerActionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { duplicados: [] };

  const duplicados: DuplicadoEncontrado[] = [];
  const idsVistos = new Set<string>();

  const addDuplicado = (
    cliente: { id: string; nombre: string; codigo_cliente: string; telefono: string | null; email: string | null },
    matchType: DuplicadoEncontrado["matchType"],
  ) => {
    if (idsVistos.has(cliente.id)) return;
    if (params.excludeId && cliente.id === params.excludeId) return;
    idsVistos.add(cliente.id);
    duplicados.push({ ...cliente, matchType });
  };

  // Construir queries en paralelo
  const selectCols = "id, nombre, codigo_cliente, telefono, email";

  const telefonoNorm = params.telefono ? params.telefono.replace(/\D/g, "") : "";
  const emailLower = params.email ? params.email.toLowerCase().trim() : "";
  const palabras = params.nombre && params.nombre.trim().length >= 3
    ? params.nombre.trim().split(/\s+/).filter((p) => p.length >= 2)
    : [];

  function buildNameQuery() {
    let query = supabase.from("cliente").select(selectCols);
    for (const palabra of palabras) {
      query = query.ilike("nombre", `%${palabra}%`);
    }
    return query.limit(5);
  }

  const [phoneResult, emailResult, nameResult] = await Promise.all([
    telefonoNorm.length >= 6
      ? supabase.from("cliente").select(selectCols)
          .or(`telefono.ilike.%${telefonoNorm}%,telefono_whatsapp.ilike.%${telefonoNorm}%`)
          .limit(5)
      : Promise.resolve({ data: [] as never[] }),
    emailLower && emailLower.includes("@")
      ? supabase.from("cliente").select(selectCols).ilike("email", emailLower).limit(5)
      : Promise.resolve({ data: [] as never[] }),
    palabras.length > 0
      ? buildNameQuery()
      : Promise.resolve({ data: [] as never[] }),
  ]);

  (phoneResult.data || []).forEach((c) => addDuplicado(c, "telefono"));
  (emailResult.data || []).forEach((c) => addDuplicado(c, "email"));
  (nameResult.data || []).forEach((c) => addDuplicado(c, "nombre"));

  return { duplicados: duplicados.slice(0, 5) };
}
