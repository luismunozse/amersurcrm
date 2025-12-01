import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

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

    // Buscar teléfonos existentes usando la columna normalizada
    const { data: existingClients, error } = await supabase
      .from("cliente")
      .select("phone_normalized")
      .in("phone_normalized", phones)
      .not("phone_normalized", "is", null);

    if (error) {
      console.error("Error checking phones:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const existingPhones = new Set(
      existingClients?.map((c) => c.phone_normalized).filter(Boolean) || []
    );

    return NextResponse.json({
      existingPhones: Array.from(existingPhones)
    });

  } catch (error) {
    console.error("Check phones error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}
