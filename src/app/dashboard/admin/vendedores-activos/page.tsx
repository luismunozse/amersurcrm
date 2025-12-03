"use client";

import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useAdminPermissions } from "@/hooks/useAdminPermissions";
import EliminarVendedorActivoModal from "@/components/EliminarVendedorActivoModal";
import CambiarEstadoVendedorActivoModal from "@/components/CambiarEstadoVendedorActivoModal";
import EliminarVendedoresMultipleModal from "@/components/EliminarVendedoresMultipleModal";

interface VendedorActivo {
  id: string;
  vendedor_id: string;
  orden: number;
  activo: boolean;
  fecha_configuracion: string;
  usuario_perfil: {
    id: string;
    username: string;
    nombre_completo: string;
    telefono: string;
    email: string;
  };
}

interface VendedorDisponible {
  id: string;
  username: string;
  nombre_completo: string;
  email: string;
  telefono: string;
}

export default function VendedoresActivosPage() {
  const { isAdmin, loading: authLoading } = useAdminPermissions();
  const [vendedores, setVendedores] = useState<VendedorActivo[]>([]);
  const [vendedoresDisponibles, setVendedoresDisponibles] = useState<VendedorDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [proximoIndice, setProximoIndice] = useState(0);

  // Estados para modales
  const [eliminarModalOpen, setEliminarModalOpen] = useState(false);
  const [vendedorAEliminar, setVendedorAEliminar] = useState<VendedorActivo | null>(null);
  const [cambiarEstadoModalOpen, setCambiarEstadoModalOpen] = useState(false);
  const [vendedorACambiarEstado, setVendedorACambiarEstado] = useState<VendedorActivo | null>(null);
  const [eliminarMultipleModalOpen, setEliminarMultipleModalOpen] = useState(false);

  // Estados para selección múltiple
  const [vendedoresSeleccionados, setVendedoresSeleccionados] = useState<Set<string>>(new Set());
  const [vendedoresDisponiblesSeleccionados, setVendedoresDisponiblesSeleccionados] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && isAdmin) {
      cargarVendedores();
      cargarVendedoresDisponibles();
    }
  }, [authLoading, isAdmin]);

  const cargarVendedores = async () => {
    try {
      setCargando(true);
      const response = await fetch("/api/admin/vendedores-activos");
      const data = await response.json();

      if (data.success) {
        setVendedores(data.vendedores || []);
        setProximoIndice(data.proximo_indice || 0);
      } else {
        toast.error("Error cargando vendedores activos");
      }
    } catch (error) {
      console.error("Error cargando vendedores:", error);
      toast.error("Error cargando vendedores activos");
    } finally {
      setCargando(false);
    }
  };

  const cargarVendedoresDisponibles = async () => {
    try {
      const response = await fetch("/api/admin/usuarios");
      const data = await response.json();

      if (data.success) {
        // Filtrar solo vendedores activos
        const vendedores = (data.usuarios || []).filter(
          (u: any) => u.rol?.nombre === "ROL_VENDEDOR" && u.activo
        );
        setVendedoresDisponibles(vendedores);
      }
    } catch (error) {
      console.error("Error cargando vendedores disponibles:", error);
    }
  };

  const agregarVendedor = async (vendedorId: string) => {
    try {
      const response = await fetch("/api/admin/vendedores-activos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedor_id: vendedorId }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Vendedor agregado exitosamente");
        await cargarVendedores();
        setMostrarAgregar(false);
      } else {
        toast.error(data.error || "Error al agregar vendedor");
      }
    } catch (error) {
      console.error("Error agregando vendedor:", error);
      toast.error("Error al agregar vendedor");
    }
  };

  const abrirModalEliminar = (vendedor: VendedorActivo) => {
    setVendedorAEliminar(vendedor);
    setEliminarModalOpen(true);
  };

  const confirmarEliminarVendedor = async () => {
    if (!vendedorAEliminar) return;

    try {
      const response = await fetch(`/api/admin/vendedores-activos?id=${vendedorAEliminar.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Vendedor eliminado exitosamente");
        await cargarVendedores();
      } else {
        toast.error(data.error || "Error al eliminar vendedor");
      }
    } catch (error) {
      console.error("Error eliminando vendedor:", error);
      toast.error("Error al eliminar vendedor");
    } finally {
      setEliminarModalOpen(false);
      setVendedorAEliminar(null);
    }
  };

  const abrirModalCambiarEstado = (vendedor: VendedorActivo) => {
    setVendedorACambiarEstado(vendedor);
    setCambiarEstadoModalOpen(true);
  };

  const confirmarCambiarEstado = async () => {
    if (!vendedorACambiarEstado) return;

    try {
      const response = await fetch("/api/admin/vendedores-activos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: vendedorACambiarEstado.id, activo: !vendedorACambiarEstado.activo }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await cargarVendedores();
      } else {
        toast.error(data.error || "Error al actualizar vendedor");
      }
    } catch (error) {
      console.error("Error actualizando vendedor:", error);
      toast.error("Error al actualizar vendedor");
    } finally {
      setCambiarEstadoModalOpen(false);
      setVendedorACambiarEstado(null);
    }
  };

  const moverVendedor = async (index: number, direccion: "arriba" | "abajo") => {
    const newVendedores = [...vendedores];
    const targetIndex = direccion === "arriba" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newVendedores.length) {
      return;
    }

    // Intercambiar posiciones
    [newVendedores[index], newVendedores[targetIndex]] = [
      newVendedores[targetIndex],
      newVendedores[index],
    ];

    // Actualizar orden en el servidor
    try {
      const response = await fetch("/api/admin/vendedores-activos", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendedores: newVendedores }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Orden actualizado");
        await cargarVendedores();
      } else {
        toast.error(data.error || "Error al actualizar orden");
      }
    } catch (error) {
      console.error("Error actualizando orden:", error);
      toast.error("Error al actualizar orden");
    }
  };

  // ============= FUNCIONES DE SELECCIÓN MÚLTIPLE =============

  const toggleSeleccionVendedor = (id: string) => {
    const nuevaSeleccion = new Set(vendedoresSeleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setVendedoresSeleccionados(nuevaSeleccion);
  };

  const toggleSeleccionDisponible = (id: string) => {
    const nuevaSeleccion = new Set(vendedoresDisponiblesSeleccionados);
    if (nuevaSeleccion.has(id)) {
      nuevaSeleccion.delete(id);
    } else {
      nuevaSeleccion.add(id);
    }
    setVendedoresDisponiblesSeleccionados(nuevaSeleccion);
  };

  const seleccionarTodosVendedores = () => {
    if (vendedoresSeleccionados.size === vendedores.length) {
      setVendedoresSeleccionados(new Set());
    } else {
      setVendedoresSeleccionados(new Set(vendedores.map(v => v.id)));
    }
  };

  const seleccionarTodosDisponibles = () => {
    if (vendedoresDisponiblesSeleccionados.size === vendedoresFiltrados.length) {
      setVendedoresDisponiblesSeleccionados(new Set());
    } else {
      setVendedoresDisponiblesSeleccionados(new Set(vendedoresFiltrados.map(v => v.id)));
    }
  };

  const abrirModalEliminarMultiple = () => {
    if (vendedoresSeleccionados.size === 0) return;
    setEliminarMultipleModalOpen(true);
  };

  const confirmarEliminarSeleccionados = async () => {
    if (vendedoresSeleccionados.size === 0) return;

    try {
      const promesas = Array.from(vendedoresSeleccionados).map(id =>
        fetch(`/api/admin/vendedores-activos?id=${id}`, {
          method: "DELETE",
        })
      );

      const resultados = await Promise.all(promesas);
      const errores = resultados.filter(r => !r.ok);

      if (errores.length === 0) {
        toast.success(`${vendedoresSeleccionados.size} vendedor(es) eliminado(s) exitosamente`);
        setVendedoresSeleccionados(new Set());
        await cargarVendedores();
      } else {
        toast.error(`Error al eliminar ${errores.length} vendedor(es)`);
      }
    } catch (error) {
      console.error("Error eliminando vendedores:", error);
      toast.error("Error al eliminar vendedores");
    } finally {
      setEliminarMultipleModalOpen(false);
    }
  };

  const agregarSeleccionados = async () => {
    if (vendedoresDisponiblesSeleccionados.size === 0) return;

    try {
      const promesas = Array.from(vendedoresDisponiblesSeleccionados).map(vendedorId =>
        fetch("/api/admin/vendedores-activos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vendedor_id: vendedorId }),
        })
      );

      const resultados = await Promise.all(promesas);
      const errores = resultados.filter(r => !r.ok);

      if (errores.length === 0) {
        toast.success(`${vendedoresDisponiblesSeleccionados.size} vendedor(es) agregado(s) exitosamente`);
        setVendedoresDisponiblesSeleccionados(new Set());
        await cargarVendedores();
        setMostrarAgregar(false);
      } else {
        toast.error(`Error al agregar ${errores.length} vendedor(es)`);
      }
    } catch (error) {
      console.error("Error agregando vendedores:", error);
      toast.error("Error al agregar vendedores");
    }
  };

  // Filtrar vendedores disponibles que NO estén ya en la lista activa
  const vendedoresFiltrados = vendedoresDisponibles.filter(
    (v) => !vendedores.some((va) => va.vendedor_id === v.id)
  );

  const calcularProximoVendedor = () => {
    const vendedoresActivos = vendedores.filter((v) => v.activo);
    if (vendedoresActivos.length === 0) return null;

    const indice = proximoIndice % vendedoresActivos.length;
    return vendedoresActivos[indice];
  };

  const proximoVendedor = calcularProximoVendedor();

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600">No tienes permisos de administrador</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Configuración de Asignación Automática
        </h1>
        <p className="text-gray-600">
          Gestiona la lista de vendedores que recibirán leads automáticamente desde WhatsApp Web
        </p>
      </div>

      {/* Información del próximo vendedor */}
      {proximoVendedor && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-blue-900 mb-1">Próximo vendedor a asignar:</h3>
          <p className="text-blue-700">
            {proximoVendedor.usuario_perfil.nombre_completo} (@{proximoVendedor.usuario_perfil.username})
          </p>
        </div>
      )}

      {/* Botón agregar */}
      <div className="mb-6">
        <button
          onClick={() => setMostrarAgregar(!mostrarAgregar)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Agregar Vendedor
        </button>
      </div>

      {/* Modal agregar vendedor */}
      {mostrarAgregar && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Seleccionar Vendedores</h3>
            {vendedoresFiltrados.length > 0 && (
              <button
                onClick={seleccionarTodosDisponibles}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                {vendedoresDisponiblesSeleccionados.size === vendedoresFiltrados.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </button>
            )}
          </div>

          {vendedoresFiltrados.length === 0 ? (
            <p className="text-gray-600">No hay más vendedores disponibles para agregar</p>
          ) : (
            <>
              <div className="space-y-2 mb-4">
                {vendedoresFiltrados.map((vendedor) => (
                  <div
                    key={vendedor.id}
                    className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg p-3"
                  >
                    <input
                      type="checkbox"
                      checked={vendedoresDisponiblesSeleccionados.has(vendedor.id)}
                      onChange={() => toggleSeleccionDisponible(vendedor.id)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{vendedor.nombre_completo}</p>
                      <p className="text-sm text-gray-600">@{vendedor.username}</p>
                    </div>
                  </div>
                ))}
              </div>

              {vendedoresDisponiblesSeleccionados.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                  <p className="text-sm text-blue-800">
                    {vendedoresDisponiblesSeleccionados.size} vendedor(es) seleccionado(s)
                  </p>
                </div>
              )}
            </>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => {
                setMostrarAgregar(false);
                setVendedoresDisponiblesSeleccionados(new Set());
              }}
              className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
            >
              Cancelar
            </button>
            {vendedoresDisponiblesSeleccionados.size > 0 && (
              <button
                onClick={agregarSeleccionados}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Agregar {vendedoresDisponiblesSeleccionados.size} vendedor(es)
              </button>
            )}
          </div>
        </div>
      )}

      {/* Lista de vendedores activos */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {vendedores.length > 0 && (
              <input
                type="checkbox"
                checked={vendedoresSeleccionados.size === vendedores.length && vendedores.length > 0}
                onChange={seleccionarTodosVendedores}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
            )}
            <h2 className="font-semibold text-gray-900">
              Vendedores Activos ({vendedores.filter((v) => v.activo).length})
            </h2>
          </div>

          {vendedoresSeleccionados.size > 0 && (
            <button
              onClick={abrirModalEliminarMultiple}
              className="flex items-center gap-2 text-red-600 hover:text-red-800 px-3 py-1 rounded hover:bg-red-50 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Eliminar {vendedoresSeleccionados.size}
            </button>
          )}
        </div>

        {cargando ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : vendedores.length === 0 ? (
          <div className="p-8 text-center text-gray-600">
            No hay vendedores configurados. Agrega vendedores para comenzar la asignación automática.
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {vendedores.map((vendedor, index) => (
              <div
                key={vendedor.id}
                className={`px-6 py-4 flex items-center justify-between ${
                  !vendedor.activo ? "bg-gray-50 opacity-60" : ""
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <input
                    type="checkbox"
                    checked={vendedoresSeleccionados.has(vendedor.id)}
                    onChange={() => toggleSeleccionVendedor(vendedor.id)}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <div className="font-bold text-gray-400 text-lg w-8">{vendedor.orden}.</div>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">
                      {vendedor.usuario_perfil.nombre_completo}
                    </p>
                    <p className="text-sm text-gray-600">@{vendedor.usuario_perfil.username}</p>
                  </div>
                  <div>
                    {vendedor.activo ? (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs px-2 py-1 rounded">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Inactivo
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  {/* Botones de orden */}
                  <button
                    onClick={() => moverVendedor(index, "arriba")}
                    disabled={index === 0}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover arriba"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => moverVendedor(index, "abajo")}
                    disabled={index === vendedores.length - 1}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title="Mover abajo"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Toggle activo */}
                  <button
                    onClick={() => abrirModalCambiarEstado(vendedor)}
                    className={`px-3 py-1 rounded text-sm ${
                      vendedor.activo
                        ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                        : "bg-green-100 text-green-800 hover:bg-green-200"
                    }`}
                  >
                    {vendedor.activo ? "Desactivar" : "Activar"}
                  </button>

                  {/* Eliminar */}
                  <button
                    onClick={() => abrirModalEliminar(vendedor)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Eliminar"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Información adicional */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2">¿Cómo funciona?</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Los leads capturados desde WhatsApp Web se asignan automáticamente siguiendo el orden de esta lista</li>
          <li>• El sistema usa rotación round-robin: cada lead se asigna al siguiente vendedor activo</li>
          <li>• Solo los vendedores marcados como "Activo" recibirán leads</li>
          <li>• Puedes reordenar, activar/desactivar o eliminar vendedores en cualquier momento</li>
        </ul>
      </div>

      {/* Modales */}
      <EliminarVendedorActivoModal
        open={eliminarModalOpen}
        onClose={() => {
          setEliminarModalOpen(false);
          setVendedorAEliminar(null);
        }}
        vendedorNombre={vendedorAEliminar?.usuario_perfil.nombre_completo || ""}
        onConfirm={confirmarEliminarVendedor}
      />

      <CambiarEstadoVendedorActivoModal
        open={cambiarEstadoModalOpen}
        onClose={() => {
          setCambiarEstadoModalOpen(false);
          setVendedorACambiarEstado(null);
        }}
        vendedorNombre={vendedorACambiarEstado?.usuario_perfil.nombre_completo || ""}
        estadoActual={vendedorACambiarEstado?.activo || false}
        onConfirm={confirmarCambiarEstado}
      />

      <EliminarVendedoresMultipleModal
        open={eliminarMultipleModalOpen}
        onClose={() => setEliminarMultipleModalOpen(false)}
        cantidad={vendedoresSeleccionados.size}
        onConfirm={confirmarEliminarSeleccionados}
      />
    </div>
  );
}
