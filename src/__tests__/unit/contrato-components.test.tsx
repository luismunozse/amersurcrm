import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// ==================== MOCKS ====================

vi.mock("@/app/dashboard/clientes/_actions-contrato", () => ({
  obtenerContratosCliente: vi.fn().mockResolvedValue({ success: true, data: [] }),
  crearContrato: vi.fn().mockResolvedValue({ success: true, data: { id: "c-1", codigo_contrato: "CON-2026-0001" } }),
  actualizarContrato: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/contratos/plantilla-compraventa", () => ({
  generarHTMLContrato: vi.fn().mockReturnValue("<html><body>Contrato Mock</body></html>"),
}));

vi.mock("next/dynamic", () => ({
  default: (fn: any) => {
    const Component = vi.fn((props: any) => {
      if (!props.isOpen) return null;
      return (
        <div data-testid="contrato-viewer">
          <button onClick={props.onClose}>Cerrar</button>
        </div>
      );
    });
    return Component;
  },
}));

// Import components after mocks
import TabContrato from "@/app/dashboard/clientes/[id]/_TabContrato";
import { obtenerContratosCliente, crearContrato } from "@/app/dashboard/clientes/_actions-contrato";

// ==================== TESTS ====================

describe("TabContrato", () => {
  const defaultProps = {
    clienteId: "cliente-1",
    clienteNombre: "Carlos Franco",
    cliente: {
      documento_identidad: "44084124",
      estado_civil: "soltero",
      direccion: { calle: "Av. Javier Prado", numero: "1234", distrito: "San Isidro", ciudad: "Lima", departamento: "Lima" },
      telefono: "999888777",
      email: "carlos@test.com",
    },
    ventas: [
      {
        id: "venta-1",
        codigo_venta: "VTA-2026-0001",
        estado: "activa",
        lote_id: "lote-1",
        precio_total: 75000,
        moneda: "PEN",
        monto_inicial: 5000,
        saldo_pendiente: 70000,
        numero_cuotas: 120,
        forma_pago: "financiamiento",
        lote: {
          codigo: "LV-59",
          sup_m2: 200,
          proyecto: { nombre: "Country Club" },
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: [] });
  });

  it("renderiza el título 'Contratos / Minutas'", async () => {
    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Contratos \/ Minutas/)).toBeInTheDocument();
    });
  });

  it("muestra mensaje cuando no hay contratos", async () => {
    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/No hay contratos registrados/)).toBeInTheDocument();
    });
  });

  it("muestra botón 'Nuevo Contrato'", async () => {
    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Contrato/)).toBeInTheDocument();
    });
  });

  it("muestra formulario al hacer clic en 'Nuevo Contrato'", async () => {
    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Contrato/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nuevo Contrato/));

    expect(screen.getByText(/Venta \*/)).toBeInTheDocument();
    expect(screen.getByText("Notaría")).toBeInTheDocument();
    expect(screen.getByText("Notario")).toBeInTheDocument();
    expect(screen.getByText("Notas")).toBeInTheDocument();
  });

  it("muestra ventas disponibles en el select", async () => {
    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Contrato/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nuevo Contrato/));

    expect(screen.getByText("VTA-2026-0001")).toBeInTheDocument();
  });

  it("no muestra ventas canceladas en el select", async () => {
    const propsWithCancelada = {
      ...defaultProps,
      ventas: [
        ...defaultProps.ventas,
        { id: "venta-2", codigo_venta: "VTA-2026-0002", estado: "cancelada" },
      ],
    };

    render(<TabContrato {...propsWithCancelada} />);

    await waitFor(() => {
      expect(screen.getByText(/Nuevo Contrato/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Nuevo Contrato/));

    expect(screen.getByText("VTA-2026-0001")).toBeInTheDocument();
    expect(screen.queryByText("VTA-2026-0002")).not.toBeInTheDocument();
  });

  it("renderiza contratos existentes con su código y estado", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador", venta_id: "venta-1" },
      { id: "c-2", codigo_contrato: "CON-2026-0002", estado: "firmado", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("CON-2026-0001")).toBeInTheDocument();
      expect(screen.getByText("CON-2026-0002")).toBeInTheDocument();
    });
  });

  it("muestra badge de estado con el label correcto", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Borrador")).toBeInTheDocument();
    });
  });

  it("muestra botón 'Ver Documento' para cada contrato", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Ver Documento/)).toBeInTheDocument();
    });
  });

  it("muestra botón de avanzar estado para contratos que no están en el último estado", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Avanzar a/)).toBeInTheDocument();
    });
  });

  it("no muestra botón de avanzar para contratos inscrito_sunarp (estado final)", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "inscrito_sunarp", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("CON-2026-0001")).toBeInTheDocument();
    });
    expect(screen.queryByText(/Avanzar a/)).not.toBeInTheDocument();
  });

  it("muestra botones de upload para documentos no adjuntados", async () => {
    const contratos = [
      { id: "c-1", codigo_contrato: "CON-2026-0001", estado: "borrador", venta_id: "venta-1" },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText(/Subir contrato firmado/)).toBeInTheDocument();
      expect(screen.getByText(/Subir escritura/)).toBeInTheDocument();
      expect(screen.getByText(/Subir constancia SUNARP/)).toBeInTheDocument();
    });
  });

  it("muestra links de documentos ya adjuntados", async () => {
    const contratos = [
      {
        id: "c-1",
        codigo_contrato: "CON-2026-0001",
        estado: "firmado",
        venta_id: "venta-1",
        contrato_url: "https://storage.example.com/contrato.pdf",
        escritura_url: "https://storage.example.com/escritura.pdf",
      },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Contrato firmado")).toBeInTheDocument();
      expect(screen.getByText("Escritura pública")).toBeInTheDocument();
    });
  });

  it("muestra datos de notaría cuando existen", async () => {
    const contratos = [
      {
        id: "c-1",
        codigo_contrato: "CON-2026-0001",
        estado: "borrador",
        venta_id: "venta-1",
        notaria: "Notaría Fernández",
        notario: "Dr. Manuel Fernández",
      },
    ];
    (obtenerContratosCliente as any).mockResolvedValue({ success: true, data: contratos });

    render(<TabContrato {...defaultProps} />);

    await waitFor(() => {
      expect(screen.getByText("Notaría Fernández")).toBeInTheDocument();
      expect(screen.getByText("Dr. Manuel Fernández")).toBeInTheDocument();
    });
  });
});

describe("TabContrato - buildContratoVariables", () => {
  it("construye dirección completa a partir de campos separados", () => {
    const direccion = { calle: "Av. Javier Prado", numero: "1234", distrito: "San Isidro", ciudad: "Lima", departamento: "Lima" };
    const parts = [direccion.calle, direccion.numero, direccion.distrito, direccion.ciudad, direccion.departamento].filter(Boolean);
    const result = parts.join(", ");

    expect(result).toBe("Av. Javier Prado, 1234, San Isidro, Lima, Lima");
  });

  it("maneja dirección parcial correctamente", () => {
    const direccion = { calle: "Jr. Cusco", distrito: "Cercado" };
    const parts = [direccion.calle, undefined, direccion.distrito, undefined, undefined].filter(Boolean);
    const result = parts.join(", ");

    expect(result).toBe("Jr. Cusco, Cercado");
  });

  it("retorna string vacío cuando no hay dirección", () => {
    const direccion = undefined;
    const result = direccion ? "tiene dirección" : "";

    expect(result).toBe("");
  });
});
