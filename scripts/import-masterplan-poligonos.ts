/**
 * Importa polígonos de masterplan a crm.lote.data.masterplan_poly
 *
 * Los polígonos están normalizados (0-1) respecto a la imagen
 * arboledas-ii-masterplan.png (2057x1453). Esa misma imagen tiene que ser
 * el masterplan del proyecto, si no los polígonos no calzan.
 *
 * Por defecto corre en modo prueba (no escribe). Para guardar: --apply
 *
 * Uso:
 *   npx tsx scripts/import-masterplan-poligonos.ts --proyecto=<ID> \
 *     --archivo=data/arboledas-ii-poligonos.json [--apply] [--sobrescribir]
 */
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!URL || !KEY) {
  console.error("❌ Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en .env.local");
  process.exit(1);
}

const args = process.argv.slice(2);
const arg = (k: string) => args.find((a) => a.startsWith(`--${k}=`))?.split("=")[1];
const proyectoId = arg("proyecto");
const archivo = arg("archivo") ?? "data/arboledas-ii-poligonos.json";
const aplicar = args.includes("--apply");
const sobrescribir = args.includes("--sobrescribir");
if (!proyectoId) {
  console.error("❌ Falta --proyecto=<ID>");
  process.exit(1);
}

type Punto = [number, number];
interface Archivo {
  imagen: { ancho: number; alto: number };
  lotes: Record<string, Punto[]>;
}

/** "13-A", "13 a", "13A" -> "13A";  "SC-12", "Lote 12", "MZ A - 12" -> "12" */
function claveDesdeCodigo(codigo: string): string {
  const c = codigo.toUpperCase().replace(/\s+/g, "");
  const m = c.match(/(\d+)-?([A-Z])?$/);
  return m ? `${Number(m[1])}${m[2] ?? ""}` : c;
}
const claveDesdeArchivo = (k: string) => k.toUpperCase().replace(/[\s-]/g, "");

async function main() {
  const supabase = createClient(URL, KEY, { db: { schema: "crm" } });
  const datos: Archivo = JSON.parse(fs.readFileSync(path.resolve(archivo), "utf8"));

  const { data: proyecto, error: pErr } = await supabase
    .from("proyecto").select("id,nombre,masterplan").eq("id", proyectoId).maybeSingle();
  if (pErr || !proyecto) throw pErr ?? new Error("Proyecto no encontrado");
  console.log(`📐 Proyecto: ${proyecto.nombre}`);

  const mp = proyecto.masterplan as { width?: number; height?: number } | null;
  if (!mp?.width) {
    console.warn("⚠️  El proyecto todavía no tiene masterplan subido. Subí arboledas-ii-masterplan.png antes de usarlo.");
  } else {
    const r1 = mp.width / mp.height!, r2 = datos.imagen.ancho / datos.imagen.alto;
    if (Math.abs(r1 - r2) > 0.01) {
      console.warn(`⚠️  La proporción del masterplan (${mp.width}x${mp.height}) no coincide con la de los polígonos (${datos.imagen.ancho}x${datos.imagen.alto}). Los polígonos no van a calzar.`);
    }
  }

  const { data: lotes, error: lErr } = await supabase
    .from("lote").select("id,codigo,data").eq("proyecto_id", proyectoId);
  if (lErr) throw lErr;

  const porClave = new Map<string, { id: string; codigo: string; data: any }[]>();
  for (const l of lotes ?? []) {
    const k = claveDesdeCodigo(l.codigo);
    porClave.set(k, [...(porClave.get(k) ?? []), l]);
  }

  let ok = 0, salteados = 0;
  const faltantes: string[] = [], ambiguos: string[] = [];
  for (const [num, poly] of Object.entries(datos.lotes)) {
    const k = claveDesdeArchivo(num);
    const hits = porClave.get(k) ?? [];
    if (hits.length === 0) { faltantes.push(num); continue; }
    if (hits.length > 1) { ambiguos.push(`${num} → ${hits.map((h) => h.codigo).join(", ")}`); continue; }
    const lote = hits[0];
    const base = lote.data && typeof lote.data === "object" && !Array.isArray(lote.data) ? { ...lote.data } : {};
    if (base.masterplan_poly && !sobrescribir) { salteados++; continue; }
    const limpio = poly.map(([x, y]) => [Math.min(1, Math.max(0, x)), Math.min(1, Math.max(0, y))]);
    if (aplicar) {
      const { error } = await supabase.from("lote")
        .update({ data: { ...base, masterplan_poly: limpio } }).eq("id", lote.id);
      if (error) { console.error(`❌ ${lote.codigo}: ${error.message}`); continue; }
    }
    ok++;
  }

  console.log(`\n${aplicar ? "✅ Guardados" : "🧪 Se guardarían"}: ${ok} de ${Object.keys(datos.lotes).length}`);
  if (salteados) console.log(`⏭️  Ya tenían polígono (usá --sobrescribir): ${salteados}`);
  if (faltantes.length) console.log(`❓ Sin lote en el CRM: ${faltantes.join(", ")}`);
  if (ambiguos.length) console.log(`⚠️  Ambiguos (más de un lote con ese número):\n   ${ambiguos.join("\n   ")}`);
  if (!aplicar) console.log("\nModo prueba: no se escribió nada. Agregá --apply para guardar.");
}

main().catch((e) => { console.error(e); process.exit(1); });
