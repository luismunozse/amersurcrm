import { createServerOnlyClient } from "@/lib/supabase.server";

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre?: string;
  dni?: string;
  rol?: {
    id: string;
    nombre: string;
    descripcion?: string;
    permisos: string[];
  };
  meta_mensual_ventas?: number;
  comision_porcentaje?: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export async function obtenerPerfilUsuario(): Promise<UsuarioPerfil | null> {
  try {
    const supabase = await createServerOnlyClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return null;
    }

        // Obtener perfil del usuario
        const { data: perfil, error: perfilError } = await supabase
          .schema('crm')
          .from('usuario_perfil')
          .select('*, dni')
          .eq('id', user.id)
          .single();

    if (perfilError) {
      console.error('Error obteniendo perfil:', perfilError);
      return null;
    }

    // Obtener rol por separado para evitar conflictos de relaciones
    let rol = null;
    if (perfil.rol_id) {
      const { data: rolData } = await supabase
        .schema('crm')
        .from('rol')
        .select('id, nombre, descripcion, permisos')
        .eq('id', perfil.rol_id)
        .single();
      
      rol = rolData;
    }

        return {
          id: perfil.id,
          email: user.email || '',
          nombre: perfil.nombre_completo,
          dni: perfil.dni,
          rol: rol ? {
            id: rol.id,
            nombre: rol.nombre,
            descripcion: rol.descripcion,
            permisos: rol.permisos || []
          } : undefined,
          meta_mensual_ventas: perfil.meta_mensual_ventas,
          comision_porcentaje: perfil.comision_porcentaje,
          activo: perfil.activo,
          created_at: perfil.created_at,
          updated_at: perfil.updated_at
        };

  } catch (error) {
    console.error('Error obteniendo perfil de usuario:', error);
    return null;
  }
}

export async function tienePermiso(permiso: string): Promise<boolean> {
  try {
    const perfil = await obtenerPerfilUsuario();
    if (!perfil || !perfil.rol) {
      return false;
    }

    return perfil.rol.permisos.includes(permiso);
  } catch (error) {
    console.error('Error verificando permiso:', error);
    return false;
  }
}

export async function esAdmin(): Promise<boolean> {
  try {
    const perfil = await obtenerPerfilUsuario();
    return perfil?.rol?.nombre === 'ROL_ADMIN';
  } catch (error) {
    console.error('Error verificando si es admin:', error);
    return false;
  }
}

export async function esVendedor(): Promise<boolean> {
  try {
    const perfil = await obtenerPerfilUsuario();
    return perfil?.rol?.nombre === 'ROL_VENDEDOR';
  } catch (error) {
    console.error('Error verificando si es vendedor:', error);
    return false;
  }
}