import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function pad2(v: string) { return v.padStart(2, "0").slice(0,2); }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dep = pad2(searchParams.get("dep") || "");
  if (!/^\d{2}$/.test(dep)) return NextResponse.json({ error: "dep (2 dígitos) requerido" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("api_get_provincias", { dep });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=86400" } });
}
