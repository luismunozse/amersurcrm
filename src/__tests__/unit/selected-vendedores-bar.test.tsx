import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SelectedVendedoresBar from "@/components/SelectedVendedoresBar";

describe("SelectedVendedoresBar", () => {
  const build = (n: number) =>
    Array.from({ length: n }, (_, i) => ({ id: `v${i + 1}`, nombre: `Vendedor ${i + 1}` }));

  it("renders a chip with the name for each seleccionado", () => {
    render(
      <SelectedVendedoresBar
        seleccionados={build(2)}
        onQuitar={vi.fn()}
        onLimpiar={vi.fn()}
        onAsignar={vi.fn()}
      />
    );

    expect(screen.getByText("Vendedor 1")).toBeInTheDocument();
    expect(screen.getByText("Vendedor 2")).toBeInTheDocument();
    expect(screen.getByText(/2 vendedores seleccionados/i)).toBeInTheDocument();
  });

  it("calls onQuitar with the id when a chip's remove button is clicked", async () => {
    const user = userEvent.setup();
    const onQuitar = vi.fn();
    render(
      <SelectedVendedoresBar
        seleccionados={build(2)}
        onQuitar={onQuitar}
        onLimpiar={vi.fn()}
        onAsignar={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /quitar a vendedor 1/i }));

    expect(onQuitar).toHaveBeenCalledWith("v1");
  });

  it("collapses chips beyond the threshold of 8 into a '+N más' indicator", () => {
    render(
      <SelectedVendedoresBar
        seleccionados={build(10)}
        onQuitar={vi.fn()}
        onLimpiar={vi.fn()}
        onAsignar={vi.fn()}
      />
    );

    for (let i = 1; i <= 8; i++) {
      expect(screen.getByText(`Vendedor ${i}`)).toBeInTheDocument();
    }
    expect(screen.queryByText("Vendedor 9")).not.toBeInTheDocument();
    expect(screen.queryByText("Vendedor 10")).not.toBeInTheDocument();
    expect(screen.getByText("+2 más")).toBeInTheDocument();
  });

  it("calls onLimpiar when 'Limpiar' is clicked", async () => {
    const user = userEvent.setup();
    const onLimpiar = vi.fn();
    render(
      <SelectedVendedoresBar
        seleccionados={build(1)}
        onQuitar={vi.fn()}
        onLimpiar={onLimpiar}
        onAsignar={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /limpiar selección/i }));

    expect(onLimpiar).toHaveBeenCalledTimes(1);
  });

  it("calls onAsignar when 'Asignar coordinador' is clicked", async () => {
    const user = userEvent.setup();
    const onAsignar = vi.fn();
    render(
      <SelectedVendedoresBar
        seleccionados={build(1)}
        onQuitar={vi.fn()}
        onLimpiar={vi.fn()}
        onAsignar={onAsignar}
      />
    );

    await user.click(screen.getByRole("button", { name: /asignar coordinador/i }));

    expect(onAsignar).toHaveBeenCalledTimes(1);
  });

  it("uses singular wording for a single seleccionado", () => {
    render(
      <SelectedVendedoresBar
        seleccionados={build(1)}
        onQuitar={vi.fn()}
        onLimpiar={vi.fn()}
        onAsignar={vi.fn()}
      />
    );

    expect(screen.getByText(/1 vendedor seleccionado\b/i)).toBeInTheDocument();
  });
});
