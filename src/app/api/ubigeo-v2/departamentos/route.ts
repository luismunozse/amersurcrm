import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await supabaseServer();
    
    const { data, error } = await supabase
      .schema('crm')
      .from('departamentos')
      .select('code, name')
      .order('name');
    
    if (error) {
      console.error("Error en /api/ubigeo-v2/departamentos:", error);
      return NextResponse.json({ error: "Error obteniendo departamentos" }, { status: 500 });
    }
    
    const departamentos = data.map(dept => ({
      code: dept.code,
      nombre: dept.name
    }));
    
    return NextResponse.json(departamentos, { 
      headers: { "Cache-Control": "public, max-age=86400" } 
    });
  } catch (error: unknown) {
    console.error("Error en /api/ubigeo-v2/departamentos:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}