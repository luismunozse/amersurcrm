import {
  LayoutDashboard,
  Users,
  Building2,
  Home,
  Calendar,
  Folder,
  MessageSquare,
  BookOpen,
  BarChart3,
  UserCheck,
  Megaphone,
  Settings,
  Banknote,
  Truck,
  Headphones,
  Target,
  ShoppingCart,
  KanbanSquare,
} from "lucide-react";
import { PERMISOS } from "@/lib/permissions";
import type { PermisoCodigo, RolNombre } from "@/lib/permissions";

export type NavItem = {
  name: string;
  href: string;
  icon: React.ReactNode;
  permisos?: PermisoCodigo[];
  roles?: RolNombre[];
  badge?: string;
  children?: NavItem[];
};

export const navigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: "Clientes", href: "/dashboard/clientes", permisos: [PERMISOS.CLIENTES.VER_TODOS, PERMISOS.CLIENTES.VER_ASIGNADOS], icon: <Users className="w-5 h-5" /> },
  { name: "Pipeline", href: "/dashboard/pipeline", permisos: [PERMISOS.CLIENTES.VER_TODOS, PERMISOS.CLIENTES.VER_ASIGNADOS], icon: <KanbanSquare className="w-5 h-5" /> },
  { name: "Proyectos", href: "/dashboard/proyectos", permisos: [PERMISOS.PROYECTOS.VER], icon: <Building2 className="w-5 h-5" /> },
  { name: "Propiedades", href: "/dashboard/propiedades", permisos: [PERMISOS.LOTES.VER], icon: <Home className="w-5 h-5" /> },
  {
    name: "Adquisición",
    href: "/dashboard/adquisicion",
    icon: <ShoppingCart className="w-5 h-5" />,
    permisos: [PERMISOS.VENTAS.VER_TODAS, PERMISOS.VENTAS.VER_PROPIAS],
  },
  {
    name: "Control de Pagos",
    href: "/dashboard/cobranza",
    icon: <Banknote className="w-5 h-5" />,
    permisos: [PERMISOS.PAGOS.VER_TODOS, PERMISOS.PAGOS.VER_PROPIOS],
  },
  {
    name: "Entregas",
    href: "/dashboard/entregas",
    icon: <Truck className="w-5 h-5" />,
    permisos: [PERMISOS.VENTAS.VER_TODAS, PERMISOS.VENTAS.VER_PROPIAS],
  },
  {
    name: "Post-Venta",
    href: "/dashboard/postventa",
    icon: <Headphones className="w-5 h-5" />,
    permisos: [PERMISOS.VENTAS.VER_TODAS, PERMISOS.VENTAS.VER_PROPIAS],
  },
  { name: "Agenda", href: "/dashboard/agenda", icon: <Calendar className="w-5 h-5" /> },
  { name: "Documentos", href: "/dashboard/documentos", permisos: [PERMISOS.DOCUMENTOS.VER_TODOS, PERMISOS.DOCUMENTOS.VER_ASIGNADOS], icon: <Folder className="w-5 h-5" /> },
  { name: "AmersurChat", href: "/dashboard/extension", icon: <MessageSquare className="w-5 h-5" /> },
  { name: "Centro de Ayuda", href: "/dashboard/ayuda", icon: <BookOpen className="w-5 h-5" /> },
  { name: "Mis Reportes", href: "/dashboard/vendedor/reportes", roles: ['ROL_VENDEDOR'], icon: <BarChart3 className="w-5 h-5" /> },
];

export const adminNavigation: NavItem[] = [
  { name: "Usuarios", href: "/dashboard/admin/usuarios", permisos: [PERMISOS.USUARIOS.VER], roles: ['ROL_ADMIN', 'ROL_COORDINADOR_VENTAS'], icon: <UserCheck className="w-5 h-5" /> },
  { name: "Marketing", href: "/dashboard/admin/marketing", roles: ['ROL_ADMIN'], icon: <Megaphone className="w-5 h-5" /> },
  { name: "Reportes", href: "/dashboard/admin/reportes", permisos: [PERMISOS.REPORTES.GLOBALES], icon: <BarChart3 className="w-5 h-5" /> },
  { name: "Metas", href: "/dashboard/admin/metas", permisos: [PERMISOS.METAS.ASIGNAR], icon: <Target className="w-5 h-5" /> },
  { name: "Configuración", href: "/dashboard/admin/configuracion", permisos: [PERMISOS.CONFIGURACION.SISTEMA], icon: <Settings className="w-5 h-5" /> },
];
