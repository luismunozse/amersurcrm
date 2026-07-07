import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasterplanViewer } from "./MasterplanViewer";
import type { PlanoLoteDTO } from "@/lib/masterplan/dto";

const lotes: PlanoLoteDTO[] = [
  {
    id: "a",
    codigo: "A1",
    estado: "disponible",
    area: 120,
    manzana: "A",
    etapa: "1",
    poly: [[0, 0], [0.1, 0], [0.1, 0.1]],
  },
  { id: "b", codigo: "B2", estado: "vendido", area: 80, manzana: "B", etapa: "1", poly: null },
];

describe("MasterplanViewer", () => {
  it("dibuja un polígono solo por lote con poly y dispara onLoteClick", () => {
    const onClick = vi.fn();
    render(<MasterplanViewer imageUrl="x.jpg" lotes={lotes} onLoteClick={onClick} />);
    const poly = screen.getByTestId("lote-poly-A1");
    expect(poly).toBeInTheDocument();
    expect(screen.queryByTestId("lote-poly-B2")).toBeNull();
    fireEvent.click(poly);
    expect(onClick).toHaveBeenCalledWith("a");
  });

  it("colorea el polígono según el estado", () => {
    render(<MasterplanViewer imageUrl="x.jpg" lotes={lotes} onLoteClick={() => {}} />);
    const fill = screen.getByTestId("lote-poly-A1").getAttribute("fill");
    expect(fill).toContain("34,197,94");
  });

  it("nunca renderiza precio en ningún atributo o texto (DTO price-free)", () => {
    const { container } = render(<MasterplanViewer imageUrl="x.jpg" lotes={lotes} onLoteClick={() => {}} />);
    expect(container.innerHTML.toLowerCase()).not.toContain("precio");
    expect(container.innerHTML.toLowerCase()).not.toContain("moneda");
    expect(container.innerHTML).not.toContain("120");
  });
});
