import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const guardarPoligonoLote = vi.fn().mockResolvedValue({ ok: true });
const eliminarPoligonoLote = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/app/dashboard/proyectos/_actions", () => ({
  guardarPoligonoLote: (...a: any[]) => guardarPoligonoLote(...a),
  eliminarPoligonoLote: (...a: any[]) => eliminarPoligonoLote(...a),
  guardarMasterplanProyecto: vi.fn().mockResolvedValue({ ok: true }),
}));

import { MasterplanEditor } from "./MasterplanEditor";

const lotes = [
  { id: "a", codigo: "A1", estado: "disponible" as const, area: 120, manzana: "A", etapa: "1", poly: null },
  {
    id: "b",
    codigo: "B2",
    estado: "vendido" as const,
    area: 80,
    manzana: "B",
    etapa: "1",
    poly: [[0, 0], [0.1, 0], [0.1, 0.1]] as [number, number][],
  },
];

beforeEach(() => vi.clearAllMocks());

describe("MasterplanEditor", () => {
  it("lista los lotes marcando cuáles ya tienen polígono", () => {
    render(<MasterplanEditor imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByTestId("borrar-poly-B2")).toBeInTheDocument();
  });

  it("borra el polígono de un lote llamando a la action", async () => {
    render(<MasterplanEditor imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    fireEvent.click(screen.getByTestId("borrar-poly-B2"));
    expect(eliminarPoligonoLote).toHaveBeenCalledWith("b");
  });
});

describe("MasterplanEditor — edición de vértices (zoom/pan + Navegar/Dibujar)", () => {
  beforeEach(() => {
    // jsdom no calcula layout real: fijamos un rect estable de 100x100 para
    // que pixelANormalizado produzca coordenadas normalizadas predecibles.
    vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({
      width: 100,
      height: 100,
      top: 0,
      left: 0,
      right: 100,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function dibujarPoligono(puntos: Array<[number, number]>) {
    fireEvent.click(screen.getByRole("button", { name: "Dibujar" }));
    const img = screen.getByAltText("Masterplan (edición)");
    puntos.forEach(([clientX, clientY]) => {
      fireEvent.click(img, { clientX, clientY });
    });
  }

  it("arrastrar un vértice actualiza solo sus coordenadas", () => {
    render(<MasterplanEditor imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    dibujarPoligono([[10, 10], [60, 10], [60, 60], [10, 60]]);

    const vertice1 = screen.getByTestId("vertice-1");
    fireEvent.mouseDown(vertice1, { clientX: 60, clientY: 10 });
    fireEvent.mouseMove(window, { clientX: 80, clientY: 80 });
    fireEvent.mouseUp(window);

    const poligono = screen.getByTestId("dibujo-poligono");
    expect(poligono.getAttribute("points")).toBe("0.1,0.1 0.8,0.8 0.6,0.6 0.1,0.6");
  });

  it("eliminar un vértice está bloqueado cuando el polígono tiene exactamente 3", () => {
    render(<MasterplanEditor imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    dibujarPoligono([[10, 10], [60, 10], [60, 60]]);

    const vertice1 = screen.getByTestId("vertice-1");
    fireEvent.doubleClick(vertice1);

    const poligono = screen.getByTestId("dibujo-poligono");
    expect(poligono.getAttribute("points")).toBe("0.1,0.1 0.6,0.1 0.6,0.6");
  });

  it("deshacer revierte la última acción (agregar vértice)", () => {
    render(<MasterplanEditor imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    dibujarPoligono([[10, 10], [60, 10], [60, 60], [10, 60]]);

    fireEvent.click(screen.getByRole("button", { name: "Deshacer" }));

    const poligono = screen.getByTestId("dibujo-poligono");
    expect(poligono.getAttribute("points")).toBe("0.1,0.1 0.6,0.1 0.6,0.6");
  });
});
