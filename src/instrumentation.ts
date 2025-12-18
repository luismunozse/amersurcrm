export async function register() {
  // Solo en desarrollo y solo en Node.js runtime
  if (process.env.NODE_ENV === "development" && process.env.NEXT_RUNTIME === "nodejs") {
    const originalConsoleError = console.error;

    // Filtrar errores de HMR ping (conflicto entre Turbopack y Supabase Realtime)
    console.error = (...args: unknown[]) => {
      const message = args[0];
      if (
        typeof message === "string" &&
        (message.includes('unrecognized HMR message') ||
         message.includes('{"event":"ping"}'))
      ) {
        return; // Suprimir este error específico
      }

      // También filtrar el objeto Error si viene como primer argumento
      if (
        message instanceof Error &&
        message.message?.includes('unrecognized HMR message')
      ) {
        return;
      }

      originalConsoleError.apply(console, args);
    };
  }
}
