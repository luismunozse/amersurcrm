/**
 * Guided tours for Proyectos module using Driver.js
 *
 * To install driver.js:
 * npm install driver.js
 *
 * To use in a component:
 * import { startProyectosTour } from '@/lib/tours/proyectosTour';
 * startProyectosTour();
 */

// Types for driver.js (will be available once installed)
type DriveStep = {
  element?: string;
  popover?: {
    title?: string;
    description: string;
    side?: 'left' | 'right' | 'top' | 'bottom';
    align?: 'start' | 'center' | 'end';
  };
};

type DriverConfig = {
  showProgress?: boolean;
  showButtons?: string[];
  steps: DriveStep[];
  onDestroyed?: () => void;
};

// ============================================================================
// TOUR DEFINITIONS
// ============================================================================

/**
 * Main tour for the Proyectos list page
 */
export const proyectosListTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Bienvenido a Proyectos',
      description: 'Esta es la vista principal de proyectos. Aquí puedes ver todos tus proyectos de desarrollo inmobiliario y gestionarlos.',
      side: 'left',
      align: 'start',
    },
  },
  {
    element: '[data-tour="new-project-button"]',
    popover: {
      title: 'Crear Nuevo Proyecto',
      description: 'Haz clic aquí para crear un nuevo proyecto. Podrás definir el nombre, ubicación, tipo de terreno y otros detalles.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="search-filter"]',
    popover: {
      title: 'Buscar y Filtrar',
      description: 'Utiliza el buscador y filtros para encontrar proyectos específicos por nombre, ubicación, estado o tipo de terreno.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="project-card"]',
    popover: {
      title: 'Tarjeta de Proyecto',
      description: 'Cada tarjeta muestra información resumida del proyecto: nombre, ubicación, número de lotes y estadísticas de ventas.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="project-stats"]',
    popover: {
      title: 'Estadísticas del Proyecto',
      description: 'Aquí puedes ver rápidamente cuántos lotes están disponibles, reservados y vendidos en cada proyecto.',
      side: 'top',
    },
  },
];

/**
 * Tour for the Proyecto detail page
 */
export const proyectoDetailTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Vista de Detalle del Proyecto',
      description: 'Aquí puedes ver toda la información del proyecto y gestionar sus lotes.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="project-header"]',
    popover: {
      title: 'Información del Proyecto',
      description: 'Nombre, ubicación y descripción del proyecto. Puedes editar estos datos haciendo clic en el botón de edición.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="stats-grid"]',
    popover: {
      title: 'Estadísticas Generales',
      description: 'Visualización rápida de métricas clave: total de lotes, ventas realizadas, ingresos y porcentaje de ocupación.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="tabs-navigation"]',
    popover: {
      title: 'Navegación por Pestañas',
      description: 'Las pestañas te permiten navegar entre diferentes vistas: Lista de Lotes, Mapeo en Plano, Ventas y Reportes.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="lotes-table"]',
    popover: {
      title: 'Tabla de Lotes',
      description: 'Todos los lotes del proyecto con su información detallada. Puedes ordenar, filtrar, editar y cambiar el estado de cada lote.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="new-lote-button"]',
    popover: {
      title: 'Crear Nuevo Lote',
      description: 'Haz clic aquí para agregar un nuevo lote al proyecto. Podrás definir código, área, precio y otras características.',
      side: 'bottom',
    },
  },
];

/**
 * Tour for the Mapeo tab
 */
export const mapeoTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Sistema de Mapeo de Lotes',
      description: 'Esta herramienta te permite ubicar los lotes visualmente sobre el plano del proyecto.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="upload-plano"]',
    popover: {
      title: 'Subir Plano',
      description: 'Primero debes subir una imagen del plano del proyecto (PNG, JPG o PDF). Este será la base para mapear los lotes.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="google-map"]',
    popover: {
      title: 'Mapa Interactivo',
      description: 'El mapa de Google te permite ubicar geográficamente tu proyecto y ajustar la posición del plano sobre el terreno real.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="lotes-sidebar"]',
    popover: {
      title: 'Lista de Lotes',
      description: 'Aquí ves todos los lotes del proyecto. Puedes arrastrar un lote hacia el mapa para ubicarlo en el plano.',
      side: 'right',
    },
  },
  {
    element: '[data-tour="map-controls"]',
    popover: {
      title: 'Controles del Mapa',
      description: 'Usa estos controles para rotar el plano, ajustar la opacidad, activar modo de dibujo y guardar las coordenadas.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="drawing-mode"]',
    popover: {
      title: 'Modo de Dibujo',
      description: 'Activa el modo dibujo para marcar polígonos sobre los lotes. Esto te permite definir su ubicación exacta en el plano.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="save-coordinates"]',
    popover: {
      title: 'Guardar Cambios',
      description: 'No olvides guardar las coordenadas después de ubicar o redibujar los lotes. Los cambios no se guardan automáticamente.',
      side: 'bottom',
    },
  },
];

/**
 * Tour for creating a new lote
 */
export const createLoteTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Crear Nuevo Lote',
      description: 'Completa el formulario para agregar un nuevo lote al proyecto.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="lote-codigo"]',
    popover: {
      title: 'Código del Lote',
      description: 'Código único que identifica el lote (ej: A-001, Mz B Lt 5). Debe ser único dentro del proyecto.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="lote-area"]',
    popover: {
      title: 'Área del Lote',
      description: 'Superficie del lote en metros cuadrados (m²).',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="lote-precio"]',
    popover: {
      title: 'Precio del Lote',
      description: 'Precio de lista y precio de venta. El precio de venta no puede ser mayor al precio de lista.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="lote-estado"]',
    popover: {
      title: 'Estado del Lote',
      description: 'Estado actual: Disponible (para venta), Reservado (apartado) o Vendido.',
      side: 'bottom',
    },
  },
];

/**
 * Tour for sales and reservations
 */
export const ventasReservasTourSteps: DriveStep[] = [
  {
    popover: {
      title: 'Gestión de Ventas y Reservas',
      description: 'Aquí puedes registrar reservas y ventas de lotes, y hacer seguimiento del proceso comercial.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="new-reserva-button"]',
    popover: {
      title: 'Nueva Reserva',
      description: 'Registra una nueva reserva cuando un cliente aparte un lote. Esto cambiará automáticamente el estado del lote a "Reservado".',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="reserva-to-venta"]',
    popover: {
      title: 'Convertir a Venta',
      description: 'Puedes convertir una reserva activa en venta cuando el cliente complete el proceso de compra.',
      side: 'bottom',
    },
  },
  {
    element: '[data-tour="ventas-table"]',
    popover: {
      title: 'Registro de Ventas',
      description: 'Todas las ventas realizadas con información del cliente, lote, modalidad de pago y fechas.',
      side: 'left',
    },
  },
  {
    element: '[data-tour="generar-proforma"]',
    popover: {
      title: 'Generar Proforma',
      description: 'Genera una proforma (cotización formal) en PDF para enviar al cliente antes de concretar la venta.',
      side: 'bottom',
    },
  },
];

// ============================================================================
// TOUR LAUNCHER FUNCTIONS
// ============================================================================

/**
 * Starts the main proyectos list tour
 */
export function startProyectosListTour(): void {
  if (typeof window === 'undefined') return;

  // Dynamic import to avoid SSR issues
  import('driver.js').then(({ driver }) => {
    import('driver.js/dist/driver.css');

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: proyectosListTourSteps,
      onDestroyed: () => {
        // Save tour completion to localStorage
        localStorage.setItem('proyectos-list-tour-completed', 'true');
      },
    });

    driverObj.drive();
  }).catch((error) => {
    console.error('Error loading driver.js:', error);
    console.warn('Please install driver.js: npm install driver.js');
  });
}

/**
 * Starts the proyecto detail tour
 */
export function startProyectoDetailTour(): void {
  if (typeof window === 'undefined') return;

  import('driver.js').then(({ driver }) => {
    import('driver.js/dist/driver.css');

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: proyectoDetailTourSteps,
      onDestroyed: () => {
        localStorage.setItem('proyecto-detail-tour-completed', 'true');
      },
    });

    driverObj.drive();
  }).catch((error) => {
    console.error('Error loading driver.js:', error);
  });
}

/**
 * Starts the mapeo tour
 */
export function startMapeoTour(): void {
  if (typeof window === 'undefined') return;

  import('driver.js').then(({ driver }) => {
    import('driver.js/dist/driver.css');

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: mapeoTourSteps,
      onDestroyed: () => {
        localStorage.setItem('mapeo-tour-completed', 'true');
      },
    });

    driverObj.drive();
  }).catch((error) => {
    console.error('Error loading driver.js:', error);
  });
}

/**
 * Starts the create lote tour
 */
export function startCreateLoteTour(): void {
  if (typeof window === 'undefined') return;

  import('driver.js').then(({ driver }) => {
    import('driver.js/dist/driver.css');

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: createLoteTourSteps,
    });

    driverObj.drive();
  }).catch((error) => {
    console.error('Error loading driver.js:', error);
  });
}

/**
 * Starts the ventas/reservas tour
 */
export function startVentasReservasTour(): void {
  if (typeof window === 'undefined') return;

  import('driver.js').then(({ driver }) => {
    import('driver.js/dist/driver.css');

    const driverObj = driver({
      showProgress: true,
      showButtons: ['next', 'previous', 'close'],
      steps: ventasReservasTourSteps,
      onDestroyed: () => {
        localStorage.setItem('ventas-reservas-tour-completed', 'true');
      },
    });

    driverObj.drive();
  }).catch((error) => {
    console.error('Error loading driver.js:', error);
  });
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Checks if a tour has been completed
 */
export function isTourCompleted(tourName: string): boolean {
  if (typeof window === 'undefined') return true;
  return localStorage.getItem(`${tourName}-tour-completed`) === 'true';
}

/**
 * Resets tour completion status
 */
export function resetTour(tourName: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(`${tourName}-tour-completed`);
}

/**
 * Resets all tours
 */
export function resetAllTours(): void {
  if (typeof window === 'undefined') return;
  const tours = ['proyectos-list', 'proyecto-detail', 'mapeo', 'ventas-reservas'];
  tours.forEach(resetTour);
}

/**
 * Shows tour button component with auto-start on first visit
 */
export function shouldAutoStartTour(tourName: string): boolean {
  if (typeof window === 'undefined') return false;

  // Check if it's the user's first visit
  const firstVisit = !localStorage.getItem(`${tourName}-visited`);

  if (firstVisit) {
    localStorage.setItem(`${tourName}-visited`, 'true');
    return !isTourCompleted(tourName);
  }

  return false;
}
