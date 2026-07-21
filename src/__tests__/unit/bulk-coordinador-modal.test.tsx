import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BulkCoordinadorModal from "@/components/BulkCoordinadorModal";

describe("BulkCoordinadorModal", () => {
  const coordinadores = [
    { id: "coord-1", username: "mgarcia", nombre_completo: "María García" },
  ];

  it("renders nothing when closed", () => {
    const { container } = render(
      <BulkCoordinadorModal
        open={false}
        onClose={vi.fn()}
        selectedCount={3}
        coordinadores={coordinadores}
        onConfirm={vi.fn()}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the selected count and calls onConfirm with the chosen coordinadorId", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <BulkCoordinadorModal
        open={true}
        onClose={vi.fn()}
        selectedCount={3}
        coordinadores={coordinadores}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByText(/3 vendedores/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/coordinador/i), { target: { value: "coord-1" } });
    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledWith("coord-1");
  });

  it("calls onConfirm with null when 'Sin coordinador asignado' stays selected (bulk unassign)", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(
      <BulkCoordinadorModal
        open={true}
        onClose={vi.fn()}
        selectedCount={2}
        coordinadores={coordinadores}
        onConfirm={onConfirm}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledWith(null);
  });
});
