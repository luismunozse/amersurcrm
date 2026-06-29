import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MasterplanViewer } from "./MasterplanViewer";

const lotes = [
  { id: "a", codigo: "A1", estado: "disponible", precio: 1000, moneda: "PEN", poly: [[0, 0], [0.1, 0], [0.1, 0.1]] as [number, number][] },
  { id: "b", codigo: "B2", estado: "vendido", precio: 2000, moneda: "PEN", poly: null },
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
});
