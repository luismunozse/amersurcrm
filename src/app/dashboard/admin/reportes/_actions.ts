/**
 * Backward-compatible barrel.
 *
 * Sólo re-exporta `./actions` (single source of truth). Mantiene
 * compatibilidad con imports históricos `from "@/.../reportes/_actions"`.
 *
 * Note: `"use server"` se declara en cada archivo individual de actions
 * (barrel files con re-exports no pueden tener "use server" en Next.js 15).
 */

export * from "./actions";
