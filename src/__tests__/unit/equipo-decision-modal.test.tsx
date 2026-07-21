import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EquipoDecisionModal from "@/components/EquipoDecisionModal";

describe("EquipoDecisionModal", () => {
  const coordinadoresDisponibles = [
    { id: "coord-2", username: "jperez", nombre_completo: "Juan Pérez" },
    { id: "coord-3", username: "mgarcia", nombre_completo: "María García" },
  ];

  const baseProps = {
    open: true,
    coordinadorNombre: "Ana Torres",
    equipoSize: 4,
    coordinadoresDisponibles,
    onConfirm: vi.fn().mockResolvedValue(undefined),
    onClose: vi.fn(),
  };

  it("renders nothing when closed", () => {
    const { container } = render(<EquipoDecisionModal {...baseProps} open={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("shows the coordinador name and team size", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    expect(screen.getByText("Ana Torres")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("lists only the coordinadores passed in (removed coordinador already excluded by caller)", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    expect(screen.getByText(/Juan Pérez/)).toBeInTheDocument();
    expect(screen.getByText(/María García/)).toBeInTheDocument();
  });

  it("disables confirm by default (transferir selected but no coordinador chosen yet)", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("keeps confirm disabled when transferir is chosen but no destination coordinador is selected", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/transferir el equipo/i));
    expect(screen.getByRole("button", { name: /confirmar/i })).toBeDisabled();
  });

  it("enables confirm once a destination coordinador is selected, and confirms with transferirA", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<EquipoDecisionModal {...baseProps} onConfirm={onConfirm} />);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "coord-2" } });
    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith({ transferirA: "coord-2" });
  });

  it("enables confirm when 'dejar sin coordinador' is chosen and confirms with dejarSinCoordinador", async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    render(<EquipoDecisionModal {...baseProps} onConfirm={onConfirm} />);

    fireEvent.click(screen.getByLabelText(/sin coordinador/i));
    const confirmButton = screen.getByRole("button", { name: /confirmar/i });
    expect(confirmButton).not.toBeDisabled();

    fireEvent.click(confirmButton);
    expect(onConfirm).toHaveBeenCalledWith({ dejarSinCoordinador: true });
  });

  it("shows a warning that orphaned vendedores are only visible to admins/gerentes when 'dejar sin coordinador' is chosen", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    fireEvent.click(screen.getByLabelText(/sin coordinador/i));
    expect(screen.getByText(/administrador/i)).toBeInTheDocument();
    expect(screen.getByText(/gerente/i)).toBeInTheDocument();
  });

  it("does not offer a skip/omit path — there is no button other than Cancelar and Confirmar", () => {
    render(<EquipoDecisionModal {...baseProps} />);
    const buttons = screen.getAllByRole("button").map((b) => b.textContent?.trim().toLowerCase());
    expect(buttons.some((t) => t?.includes("omitir"))).toBe(false);
  });

  it("calls onClose without invoking onConfirm when Cancelar is clicked", () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    render(<EquipoDecisionModal {...baseProps} onConfirm={onConfirm} onClose={onClose} />);

    fireEvent.click(screen.getByRole("button", { name: /cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
