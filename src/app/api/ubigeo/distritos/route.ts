import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function pad4(v: string) { return v.padStart(4, "0").slice(0,4); }

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const prov = pad4(searchParams.get("prov") || "");
  if (!/^\d{4}$/.test(prov)) return NextResponse.json({ error: "prov (4 dígitos) requerido" }, { status: 400 });

  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("api_get_distritos", { prov });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "public, max-age=86400" } });
}
