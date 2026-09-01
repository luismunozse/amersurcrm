/**
 * Helpers para construir filtros de PostgREST a mano.
 *
 * `.or()` no recibe parámetros: recibe un string con su propia gramática
 * (`columna.op.valor,columna.op.valor`, con paréntesis para agrupar). Todo lo
 * que se interpole ahí adentro es sintaxis, no dato — a diferencia de `.eq()`
 * o `.ilike()`, donde supabase-js manda el valor aparte.
 */

// La coma separa condiciones, los paréntesis agrupan, y comilla/backslash son
// los delimitadores de valor: cualquiera de estos caracteres, viniendo de un
// input del usuario, cambia la estructura del filtro o rompe la query.
// El `%` se descarta aparte: es el comodín del ilike y no lo maneja el usuario.
const CARACTERES_RESERVADOS = /[%,()"\\]/g;

/**
 * Deja un término de búsqueda seguro para interpolar dentro de un `.or()`.
 * Reemplaza los caracteres reservados por espacio en vez de borrarlos, para no
 * pegar palabras que estaban separadas ("Juan,Pérez" no se vuelve "JuanPérez").
 */
export function sanitizarTerminoBusqueda(termino: string | null | undefined): string {
  return (termino ?? "").replace(CARACTERES_RESERVADOS, " ").trim();
}
