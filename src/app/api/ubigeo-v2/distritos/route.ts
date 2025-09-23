import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const prov = (searchParams.get("prov") || "").trim();
    
    if (!prov) {
      return NextResponse.json([], { 
        headers: { "Cache-Control": "public, max-age=86400" } 
      });
    }
    
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .schema('crm')
      .from('distritos')
      .select('code, name')
      .eq('provincia_code', prov)
      .order('name');
    
    if (error) {
      console.error("Error en /api/ubigeo-v2/distritos:", error);
      return NextResponse.json({ error: "Error obteniendo distritos" }, { status: 500 });
    }
    
    const distritos = data.map(dist => ({
      code: dist.code,
      nombre: dist.name
    }));
    
    return NextResponse.json(distritos, { 
      headers: { "Cache-Control": "public, max-age=86400" } 
    });
  } catch (error: unknown) {
    console.error("Error en /api/ubigeo-v2/distritos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}