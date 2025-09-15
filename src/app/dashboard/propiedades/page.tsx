import { createServerOnlyClient } from "@/lib/supabase.server";
import PropiedadesList from "./_PropiedadesList";
import NewPropiedadForm from "./_NewPropiedadForm";

export default async function PropiedadesPage() {
  const supabase = await createServerOnlyClient();
  
  // Obtener todas las propiedades
  const { data: propiedades, error: ePropiedades } = await supabase
    .from("propiedad")
    .select(`
      id,
      codigo,
      tipo,
      identificacion_interna,
      ubicacion,
      superficie,
      estado_comercial,
      precio,
      moneda,
      marketing,
      data,
      created_at,
      proyecto:proyecto_id (
        id,
        nombre,
        ubicacion,
        estado
      )
    `)
    .order("created_at", { ascending: false });

  if (ePropiedades) throw ePropiedades;

  // Obtener todos los proyectos para el selector
  const { data: proyectos, error: eProyectos } = await supabase
    .from("proyecto")
    .select("id,nombre,ubicacion,estado")
    .order("nombre", { ascending: true });

  if (eProyectos) throw eProyectos;

  return (
    <div className="w-full p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-crm-text-primary">Propiedades</h1>
          <p className="text-crm-text-muted mt-1">
            Gestiona todas las propiedades inmobiliarias
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-sm text-crm-text-muted">
            {propiedades?.length || 0} propiedades
          </div>
        </div>
      </div>

      {/* Filtros y búsqueda */}
      <div className="crm-card p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Buscar
            </label>
            <input
              type="text"
              placeholder="Código, identificación..."
              className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Tipo
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary">
              <option value="">Todos los tipos</option>
              <option value="lote">Lote</option>
              <option value="casa">Casa</option>
              <option value="departamento">Departamento</option>
              <option value="oficina">Oficina</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Estado
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary">
              <option value="">Todos los estados</option>
              <option value="disponible">Disponible</option>
              <option value="reservado">Reservado</option>
              <option value="vendido">Vendido</option>
              <option value="bloqueado">Bloqueado</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-crm-text-primary mb-2">
              Proyecto
            </label>
            <select className="w-full px-3 py-2 border border-crm-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary">
              <option value="">Todos los proyectos</option>
              {proyectos?.map((proyecto) => (
                <option key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Formulario de nueva propiedad */}
      <NewPropiedadForm proyectos={proyectos || []} />

      {/* Lista de propiedades */}
      <PropiedadesList propiedades={propiedades || []} />
    </div>
  );
}
