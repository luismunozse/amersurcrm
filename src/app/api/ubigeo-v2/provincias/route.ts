import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const dep = (searchParams.get("dep") || "").trim();
    
    if (!dep) {
      return NextResponse.json([], { 
        headers: { "Cache-Control": "public, max-age=86400" } 
      });
    }
    
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .schema('crm')
      .from('provincias')
      .select('code, name')
      .eq('departamento_code', dep)
      .order('name');
    
    if (error) {
      console.error("Error en /api/ubigeo-v2/provincias:", error);
      return NextResponse.json({ error: "Error obteniendo provincias" }, { status: 500 });
    }
    
    const provincias = data.map(prov => ({
      code: prov.code,
      nombre: prov.name
    }));
    
    return NextResponse.json(provincias, { 
      headers: { "Cache-Control": "public, max-age=86400" } 
    });
  } catch (error: unknown) {
    console.error("Error en /api/ubigeo-v2/provincias:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}