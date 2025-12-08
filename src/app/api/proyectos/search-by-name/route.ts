import { NextRequest, NextResponse } from "next/server";
import { createServerOnlyClient } from "@/lib/supabase.server";

/**
 * POST /api/proyectos/search-by-name
 *
 * Busca un proyecto por nombre con fuzzy matching
 * Para uso en importación masiva de clientes
 */
export async function POST(request: NextRequest) {
  try {
    const { nombre } = await request.json();

    if (!nombre || typeof nombre !== 'string') {
      return NextResponse.json({
        error: "Nombre es requerido y debe ser texto"
      }, { status: 400 });
    }

    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // Normalizar búsqueda
    const searchTerm = nombre.trim().toLowerCase();

    // Búsqueda con fuzzy matching
    // 1. Búsqueda exacta (case insensitive)
    const { data: exactMatch } = await supabase
      .from("proyecto")
      .select("id, nombre, descripcion, estado")
      .ilike("nombre", searchTerm)
      .limit(1)
      .single();

    if (exactMatch) {
      return NextResponse.json({
        found: true,
        proyecto: {
          id: exactMatch.id,
          nombre: exactMatch.nombre,
          descripcion: exactMatch.descripcion,
          estado: exactMatch.estado,
          matchType: 'exact'
        }
      });
    }

    // 2. Búsqueda con LIKE (contiene)
    const { data: containsMatches } = await supabase
      .from("proyecto")
      .select("id, nombre, descripcion, estado")
      .ilike("nombre", `%${searchTerm}%`)
      .limit(5);

    if (containsMatches && containsMatches.length > 0) {
      // Si solo hay uno, retornarlo
      if (containsMatches.length === 1) {
        return NextResponse.json({
          found: true,
          proyecto: {
            id: containsMatches[0].id,
            nombre: containsMatches[0].nombre,
            descripcion: containsMatches[0].descripcion,
            estado: containsMatches[0].estado,
            matchType: 'contains'
          }
        });
      }

      // Si hay múltiples, intentar fuzzy matching más inteligente
      const bestMatch = findBestMatch(searchTerm, containsMatches);

      if (bestMatch) {
        return NextResponse.json({
          found: true,
          proyecto: {
            id: bestMatch.id,
            nombre: bestMatch.nombre,
            descripcion: bestMatch.descripcion,
            estado: bestMatch.estado,
            matchType: 'fuzzy'
          },
          alternatives: containsMatches
            .filter(p => p.id !== bestMatch.id)
            .slice(0, 3)
            .map(p => ({ id: p.id, nombre: p.nombre }))
        });
      }
    }

    // 3. Búsqueda por palabras clave
    const keywords = searchTerm.split(/\s+/).filter(w => w.length > 2);

    if (keywords.length > 0) {
      // Construir query para buscar proyectos que contengan alguna de las palabras
      const query = supabase
        .from("proyecto")
        .select("id, nombre, descripcion, estado");

      // Buscar proyectos que contengan al menos una palabra clave
      const orConditions = keywords.map(keyword => `nombre.ilike.%${keyword}%`).join(',');

      const { data: keywordMatches } = await query
        .or(orConditions)
        .limit(5);

      if (keywordMatches && keywordMatches.length > 0) {
        const bestMatch = findBestMatch(searchTerm, keywordMatches);

        if (bestMatch) {
          return NextResponse.json({
            found: true,
            proyecto: {
              id: bestMatch.id,
              nombre: bestMatch.nombre,
              descripcion: bestMatch.descripcion,
              estado: bestMatch.estado,
              matchType: 'keyword'
            },
            alternatives: keywordMatches
              .filter(p => p.id !== bestMatch.id)
              .slice(0, 3)
              .map(p => ({ id: p.id, nombre: p.nombre }))
          });
        }
      }
    }

    // No se encontró ningún proyecto
    return NextResponse.json({
      found: false,
      searchTerm: nombre,
      message: `No se encontró proyecto con nombre "${nombre}"`
    });

  } catch (error) {
    console.error("Search proyecto error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: String(error)
    }, { status: 500 });
  }
}

/**
 * Encuentra el mejor match usando similaridad de strings
 */
function findBestMatch(
  searchTerm: string,
  proyectos: Array<{ id: string; nombre: string; descripcion?: string; estado?: string }>
) {
  if (!proyectos || proyectos.length === 0) return null;

  // Calcular score de similaridad para cada proyecto
  const scored = proyectos.map(proyecto => ({
    proyecto,
    score: calculateSimilarity(searchTerm, proyecto.nombre.toLowerCase())
  }));

  // Ordenar por score descendente
  scored.sort((a, b) => b.score - a.score);

  // Retornar el de mayor score (si es razonable)
  return scored[0].score > 0.3 ? scored[0].proyecto : null;
}

/**
 * Calcula similaridad entre dos strings usando Levenshtein distance simplificado
 */
function calculateSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  // Verificar si shorter está contenido en longer
  if (longer.includes(shorter)) {
    return 0.8; // Alta similaridad si está contenido
  }

  // Verificar palabras en común
  const words1 = str1.split(/\s+/);
  const words2 = str2.split(/\s+/);

  const commonWords = words1.filter(w1 =>
    words2.some(w2 => w2.includes(w1) || w1.includes(w2))
  );

  const wordSimilarity = commonWords.length / Math.max(words1.length, words2.length);

  // Levenshtein distance simplificado
  const distance = levenshteinDistance(shorter, longer);
  const lengthSimilarity = (longer.length - distance) / longer.length;

  // Combinar ambas métricas
  return (wordSimilarity * 0.6) + (lengthSimilarity * 0.4);
}

/**
 * Calcula Levenshtein distance entre dos strings
 */
function levenshteinDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}
