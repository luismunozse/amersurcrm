import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";
import { normalizePhoneE164 } from "@/lib/utils/phone";

const FALLBACK_BATCH_LIMIT = 100;

export async function POST(request: NextRequest) {
  try {
    const { phones } = await request.json();

    if (!Array.isArray(phones)) {
      return NextResponse.json({ error: "phones must be an array" }, { status: 400 });
    }

    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const normalizedPhones = phones
      .map((value) => normalizePhoneE164(value))
      .filter((value): value is string => Boolean(value));

    if (normalizedPhones.length === 0) {
      return NextResponse.json({ existingPhones: [] });
    }

    // Intentar usar la columna telefono_e164 (nueva versión)
    const { data: existingClients, error } = await supabase
      .from("cliente")
      .select("telefono_e164")
      .in("telefono_e164", normalizedPhones)
      .not("telefono_e164", "is", null);

    if (!error) {
      const existingPhones = new Set(
        existingClients?.map((c) => c.telefono_e164).filter(Boolean) || []
      );

      return NextResponse.json({
        existingPhones: Array.from(existingPhones),
      });
    }

    if (error?.code !== "42703") {
      console.error("Error checking phones:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    console.warn("[CheckPhones] Columna telefono_e164 no existe. Usando fallback.");

    const existingFallback = new Set<string>();
    const chunks = chunkArray(normalizedPhones, FALLBACK_BATCH_LIMIT);

    for (const chunk of chunks) {
      const orFilters: string[] = [];
      chunk.forEach((phone) => {
        const withPlus = phone.startsWith("+") ? phone : `+${phone}`;
        orFilters.push(
          `telefono.eq.${phone}`,
          `telefono.eq.${withPlus}`,
          `telefono_whatsapp.eq.${phone}`,
          `telefono_whatsapp.eq.${withPlus}`,
        );
      });

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("cliente")
        .select("telefono, telefono_whatsapp")
        .or(orFilters.join(","));

      if (fallbackError) {
        console.error("[CheckPhones] Error en fallback:", fallbackError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }

      (fallbackData || []).forEach((row) => {
        const tel = normalizePhoneE164(row?.telefono);
        const telWp = normalizePhoneE164(row?.telefono_whatsapp);
        if (tel) existingFallback.add(tel);
        if (telWp) existingFallback.add(telWp);
      });
    }

    return NextResponse.json({
      existingPhones: Array.from(existingFallback),
    });

  } catch (error) {
    console.error("Check phones error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: String(error),
      },
      { status: 500 },
    );
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
