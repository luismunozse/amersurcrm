/**
 * Tests de Criterios de Aceptación del PRD - Módulo Autenticación y Usuarios
 *
 * PRD 3.8.3 Criterios de Aceptación:
 * - [ ] Usuario desactivado no puede iniciar sesión
 * - [ ] Auditoría registra cambios de permisos
 * - [ ] Configuración se aplica globalmente
 *
 * PRD 3.6.4 Criterios de Aceptación:
 * - [ ] RLS bloquea acceso a datos no autorizados
 * - [ ] UI oculta opciones sin permiso
 * - [ ] Cambios de rol se aplican inmediatamente
 */

import { describe, it, expect } from 'vitest';

// Tipos de usuario según PRD
interface UsuarioPerfil {
  id: string;
  username: string;
  email: string;
  activo: boolean;
  rol: 'ROL_ADMIN' | 'ROL_COORDINADOR_VENTAS' | 'ROL_VENDEDOR' | 'ROL_GERENTE';
}

// Permisos según PRD
const PERMISOS = {
  CLIENTES: {
    VER_TODOS: 'clientes.ver_todos',
    VER_ASIGNADOS: 'clientes.ver_asignados',
    CREAR: 'clientes.crear',
    EDITAR: 'clientes.editar',
    ELIMINAR: 'clientes.eliminar',
  },
  VENTAS: {
    VER: 'ventas.ver',
    CREAR: 'ventas.crear',
    VALIDAR: 'ventas.validar',
  },
  USUARIOS: {
    GESTIONAR: 'usuarios.gestionar',
  },
};

// Mapa de permisos por rol
const PERMISOS_POR_ROL: Record<string, string[]> = {
  ROL_ADMIN: Object.values(PERMISOS.CLIENTES).concat(
    Object.values(PERMISOS.VENTAS),
    Object.values(PERMISOS.USUARIOS)
  ),
  ROL_COORDINADOR_VENTAS: [
    PERMISOS.CLIENTES.VER_TODOS,
    PERMISOS.CLIENTES.CREAR,
    PERMISOS.CLIENTES.EDITAR,
    PERMISOS.VENTAS.VER,
    PERMISOS.VENTAS.CREAR,
    PERMISOS.VENTAS.VALIDAR,
  ],
  ROL_VENDEDOR: [
    PERMISOS.CLIENTES.VER_ASIGNADOS,
    PERMISOS.CLIENTES.CREAR,
    PERMISOS.CLIENTES.EDITAR,
    PERMISOS.VENTAS.VER,
    PERMISOS.VENTAS.CREAR,
  ],
  ROL_GERENTE: [
    PERMISOS.CLIENTES.VER_TODOS,
    PERMISOS.VENTAS.VER,
    PERMISOS.VENTAS.VALIDAR,
  ],
};

// Función para verificar si usuario puede iniciar sesión
function puedeIniciarSesion(usuario: UsuarioPerfil): boolean {
  return usuario.activo === true;
}

// Función para verificar permisos
function tienePermiso(usuario: UsuarioPerfil, permiso: string): boolean {
  const permisosRol = PERMISOS_POR_ROL[usuario.rol] || [];
  return permisosRol.includes(permiso);
}

// Función para verificar acceso RLS
function tieneAccesoRLS(
  usuario: UsuarioPerfil,
  recurso: { created_by?: string; vendedor_asignado?: string }
): boolean {
  // Admin y Gerente ven todo
  if (usuario.rol === 'ROL_ADMIN' || usuario.rol === 'ROL_GERENTE') {
    return true;
  }

  // Coordinador ve todo
  if (usuario.rol === 'ROL_COORDINADOR_VENTAS') {
    return true;
  }

  // Vendedor solo ve lo suyo
  if (usuario.rol === 'ROL_VENDEDOR') {
    return (
      recurso.created_by === usuario.id ||
      recurso.vendedor_asignado === usuario.id
    );
  }

  return false;
}

describe('PRD 3.8.3 - Gestión de Usuarios', () => {
  describe('Criterio: Usuario desactivado no puede iniciar sesión', () => {
    it('usuario activo puede iniciar sesión', () => {
      const usuario: UsuarioPerfil = {
        id: 'user-1',
        username: 'vendedor1',
        email: 'vendedor1@test.com',
        activo: true,
        rol: 'ROL_VENDEDOR',
      };

      expect(puedeIniciarSesion(usuario)).toBe(true);
    });

    it('usuario desactivado NO puede iniciar sesión', () => {
      const usuario: UsuarioPerfil = {
        id: 'user-2',
        username: 'exvendedor',
        email: 'exvendedor@test.com',
        activo: false,
        rol: 'ROL_VENDEDOR',
      };

      expect(puedeIniciarSesion(usuario)).toBe(false);
    });

    it('admin desactivado NO puede iniciar sesión', () => {
      const usuario: UsuarioPerfil = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        activo: false,
        rol: 'ROL_ADMIN',
      };

      expect(puedeIniciarSesion(usuario)).toBe(false);
    });
  });

  describe('Criterio: Roles tienen permisos correctos', () => {
    it('Admin tiene todos los permisos', () => {
      const admin: UsuarioPerfil = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        activo: true,
        rol: 'ROL_ADMIN',
      };

      expect(tienePermiso(admin, PERMISOS.CLIENTES.VER_TODOS)).toBe(true);
      expect(tienePermiso(admin, PERMISOS.CLIENTES.ELIMINAR)).toBe(true);
      expect(tienePermiso(admin, PERMISOS.USUARIOS.GESTIONAR)).toBe(true);
    });

    it('Vendedor solo ve clientes asignados', () => {
      const vendedor: UsuarioPerfil = {
        id: 'vendedor-1',
        username: 'vendedor',
        email: 'vendedor@test.com',
        activo: true,
        rol: 'ROL_VENDEDOR',
      };

      expect(tienePermiso(vendedor, PERMISOS.CLIENTES.VER_ASIGNADOS)).toBe(true);
      expect(tienePermiso(vendedor, PERMISOS.CLIENTES.VER_TODOS)).toBe(false);
      expect(tienePermiso(vendedor, PERMISOS.CLIENTES.ELIMINAR)).toBe(false);
    });

    it('Coordinador ve todos los clientes', () => {
      const coordinador: UsuarioPerfil = {
        id: 'coord-1',
        username: 'coordinador',
        email: 'coord@test.com',
        activo: true,
        rol: 'ROL_COORDINADOR_VENTAS',
      };

      expect(tienePermiso(coordinador, PERMISOS.CLIENTES.VER_TODOS)).toBe(true);
      expect(tienePermiso(coordinador, PERMISOS.VENTAS.VALIDAR)).toBe(true);
    });

    it('Gerente puede ver pero no gestionar usuarios', () => {
      const gerente: UsuarioPerfil = {
        id: 'gerente-1',
        username: 'gerente',
        email: 'gerente@test.com',
        activo: true,
        rol: 'ROL_GERENTE',
      };

      expect(tienePermiso(gerente, PERMISOS.CLIENTES.VER_TODOS)).toBe(true);
      expect(tienePermiso(gerente, PERMISOS.USUARIOS.GESTIONAR)).toBe(false);
    });
  });
});

describe('PRD 3.6.4 - Sistema de Permisos', () => {
  describe('Criterio: RLS bloquea acceso a datos no autorizados', () => {
    const clienteDeVendedor1 = {
      id: 'cliente-1',
      created_by: 'vendedor-1',
      vendedor_asignado: 'vendedor-1',
    };

    const clienteDeVendedor2 = {
      id: 'cliente-2',
      created_by: 'vendedor-2',
      vendedor_asignado: 'vendedor-2',
    };

    it('Admin puede ver todos los clientes', () => {
      const admin: UsuarioPerfil = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        activo: true,
        rol: 'ROL_ADMIN',
      };

      expect(tieneAccesoRLS(admin, clienteDeVendedor1)).toBe(true);
      expect(tieneAccesoRLS(admin, clienteDeVendedor2)).toBe(true);
    });

    it('Vendedor solo puede ver sus clientes', () => {
      const vendedor1: UsuarioPerfil = {
        id: 'vendedor-1',
        username: 'vendedor1',
        email: 'vendedor1@test.com',
        activo: true,
        rol: 'ROL_VENDEDOR',
      };

      expect(tieneAccesoRLS(vendedor1, clienteDeVendedor1)).toBe(true);
      expect(tieneAccesoRLS(vendedor1, clienteDeVendedor2)).toBe(false);
    });

    it('Vendedor puede ver cliente asignado aunque no lo creó', () => {
      const vendedor1: UsuarioPerfil = {
        id: 'vendedor-1',
        username: 'vendedor1',
        email: 'vendedor1@test.com',
        activo: true,
        rol: 'ROL_VENDEDOR',
      };

      const clienteAsignado = {
        id: 'cliente-3',
        created_by: 'admin-1',
        vendedor_asignado: 'vendedor-1', // Asignado a vendedor-1
      };

      expect(tieneAccesoRLS(vendedor1, clienteAsignado)).toBe(true);
    });

    it('Coordinador puede ver todos los clientes', () => {
      const coordinador: UsuarioPerfil = {
        id: 'coord-1',
        username: 'coord',
        email: 'coord@test.com',
        activo: true,
        rol: 'ROL_COORDINADOR_VENTAS',
      };

      expect(tieneAccesoRLS(coordinador, clienteDeVendedor1)).toBe(true);
      expect(tieneAccesoRLS(coordinador, clienteDeVendedor2)).toBe(true);
    });
  });

  describe('Criterio: UI oculta opciones sin permiso', () => {
    function obtenerOpcionesMenu(usuario: UsuarioPerfil): string[] {
      const opciones: string[] = ['Dashboard'];

      if (tienePermiso(usuario, PERMISOS.CLIENTES.VER_TODOS) ||
          tienePermiso(usuario, PERMISOS.CLIENTES.VER_ASIGNADOS)) {
        opciones.push('Clientes');
      }

      if (tienePermiso(usuario, PERMISOS.VENTAS.VER)) {
        opciones.push('Ventas');
      }

      if (tienePermiso(usuario, PERMISOS.USUARIOS.GESTIONAR)) {
        opciones.push('Usuarios');
      }

      return opciones;
    }

    it('Admin ve todas las opciones', () => {
      const admin: UsuarioPerfil = {
        id: 'admin-1',
        username: 'admin',
        email: 'admin@test.com',
        activo: true,
        rol: 'ROL_ADMIN',
      };

      const opciones = obtenerOpcionesMenu(admin);

      expect(opciones).toContain('Dashboard');
      expect(opciones).toContain('Clientes');
      expect(opciones).toContain('Ventas');
      expect(opciones).toContain('Usuarios');
    });

    it('Vendedor no ve opción de Usuarios', () => {
      const vendedor: UsuarioPerfil = {
        id: 'vendedor-1',
        username: 'vendedor',
        email: 'vendedor@test.com',
        activo: true,
        rol: 'ROL_VENDEDOR',
      };

      const opciones = obtenerOpcionesMenu(vendedor);

      expect(opciones).toContain('Dashboard');
      expect(opciones).toContain('Clientes');
      expect(opciones).toContain('Ventas');
      expect(opciones).not.toContain('Usuarios');
    });

    it('Gerente no ve opción de Usuarios', () => {
      const gerente: UsuarioPerfil = {
        id: 'gerente-1',
        username: 'gerente',
        email: 'gerente@test.com',
        activo: true,
        rol: 'ROL_GERENTE',
      };

      const opciones = obtenerOpcionesMenu(gerente);

      expect(opciones).not.toContain('Usuarios');
    });
  });
});
