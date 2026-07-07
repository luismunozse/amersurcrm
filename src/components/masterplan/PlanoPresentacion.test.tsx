import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PlanoPresentacion } from "./PlanoPresentacion";
import type { PlanoPresentacionDTO } from "@/lib/masterplan/dto";

const dto: PlanoPresentacionDTO = {
  imageUrl: "https://cdn.example.com/masterplan.png",
  width: 800,
  height: 600,
  lotes: [
    {
      id: "a",
      codigo: "A1",
      estado: "disponible",
      area: 120,
      manzana: "A",
      etapa: "1",
      poly: [[0, 0], [0.1, 0], [0.1, 0.1]],
    },
    {
      id: "b",
      codigo: "B2",
      estado: "reservado",
      area: 90,
      manzana: "B",
      etapa: "1",
      poly: [[0.2, 0.2], [0.3, 0.2], [0.3, 0.3]],
    },
    {
      id: "c",
      codigo: "C3",
      estado: "vendido",
      area: 200,
      manzana: "C",
      etapa: "2",
      poly: null,
    },
  ],
};

describe("PlanoPresentacion", () => {
  it("el DTO consumido no declara precio/moneda en ningún lote (contrato estructural)", () => {
    dto.lotes.forEach((l) => {
      expect(Object.keys(l)).toEqual(["id", "codigo", "estado", "area", "manzana", "etapa", "poly"]);
    });
  });

  it("muestra la leyenda con los tres estados y sin cifras monetarias", () => {
    const { container } = render(<PlanoPresentacion dto={dto} />);
    expect(screen.getByText("Disponible")).toBeInTheDocument();
    expect(screen.getByText("Reservado")).toBeInTheDocument();
    expect(screen.getByText("Vendido")).toBeInTheDocument();
    expect(container.innerHTML.toLowerCase()).not.toContain("precio");
    expect(container.innerHTML.toLowerCase()).not.toContain("moneda");
    expect(container.innerHTML).not.toContain("S/");
  });

  it("al tocar un lote abre el panel de detalle con área y manzana/etapa, sin precio", () => {
    render(<PlanoPresentacion dto={dto} />);
    fireEvent.click(screen.getByTestId("lote-poly-A1"));

    const panel = screen.getByTestId("detalle-lote-panel");
    expect(panel).toBeInTheDocument();
    expect(panel.textContent).toContain("120");
    expect(panel.textContent).toContain("A");
    expect(panel.textContent).toContain("1");
    expect(panel.textContent?.toLowerCase()).not.toContain("precio");
    expect(panel.textContent?.toLowerCase()).not.toContain("moneda");
  });

  it("cierra el panel de detalle al presionar cerrar", () => {
    render(<PlanoPresentacion dto={dto} />);
    fireEvent.click(screen.getByTestId("lote-poly-A1"));
    expect(screen.getByTestId("detalle-lote-panel")).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cerrar-detalle-lote"));
    expect(screen.queryByTestId("detalle-lote-panel")).toBeNull();
  });

  it("renderiza un estado vacío formal cuando dto es null, sin intentar dibujar el plano", () => {
    render(<PlanoPresentacion dto={null} />);
    expect(screen.getByText(/Aún no hay un masterplan cargado/i)).toBeInTheDocument();
    expect(screen.queryByTestId("lote-poly-A1")).toBeNull();
  });
});
