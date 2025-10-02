import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();
  const limit_rows = Number(searchParams.get("limit") || 20);
  if (!q) return NextResponse.json({ error: "q requerido" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("api_search_ubigeo", { q, limit_rows });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=3600" } });
}
