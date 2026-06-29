import { describe, it, expect, vi, beforeEach } from "vitest";
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
  { id: "a", codigo: "A1", estado: "disponible", precio: 1, moneda: "PEN", poly: null },
  { id: "b", codigo: "B2", estado: "vendido", precio: 2, moneda: "PEN", poly: [[0, 0], [0.1, 0], [0.1, 0.1]] as [number, number][] },
];

beforeEach(() => vi.clearAllMocks());

describe("MasterplanEditor", () => {
  it("lista los lotes marcando cuáles ya tienen polígono", () => {
    render(<MasterplanEditor proyectoId="p1" imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    expect(screen.getByText("A1")).toBeInTheDocument();
    expect(screen.getByTestId("borrar-poly-B2")).toBeInTheDocument();
  });

  it("borra el polígono de un lote llamando a la action", async () => {
    render(<MasterplanEditor proyectoId="p1" imageUrl="x.jpg" lotes={lotes} onSaved={() => {}} />);
    fireEvent.click(screen.getByTestId("borrar-poly-B2"));
    expect(eliminarPoligonoLote).toHaveBeenCalledWith("b");
  });
});
