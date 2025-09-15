export function normalizeRole(raw?: string | null) {
  const v = (raw || "").toLowerCase().trim().replace(/^rol[_-]/, "");
  if (["admin","administrator","superadmin","super_admin"].includes(v)) return "admin";
  if (["manager","gestor"].includes(v)) return "manager";
  if (["vendedor","seller","sales"].includes(v)) return "vendedor";
  return v || "user";
}

export function isAdmin(perfil: { rol_nombre?: string | null; permisos?: string[] }) {
  const role = normalizeRole(perfil.rol_nombre);
  return role === "admin"
      || perfil.permisos?.includes("gestionar_usuarios")
      || perfil.permisos?.includes("ver_reportes_globales");
}
