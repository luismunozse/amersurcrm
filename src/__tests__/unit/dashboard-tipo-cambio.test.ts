import { describe, it, expect, vi, afterEach } from "vitest";
import { getTipoCambioUsdPen } from "@/lib/dashboard/tipo-cambio.server";

function mockFetchResolvedValue(value: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(value),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getTipoCambioUsdPen", () => {
  it("returns the PEN rate on a successful response", async () => {
    mockFetchResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "success", rates: { PEN: 3.72, EUR: 0.92 } }),
    });

    const resultado = await getTipoCambioUsdPen();

    expect(resultado).toEqual({ venta: 3.72 });
  });

  it("returns null when the response is not ok", async () => {
    mockFetchResolvedValue({
      ok: false,
      json: () => Promise.resolve({ rates: { PEN: 3.72 } }),
    });

    const resultado = await getTipoCambioUsdPen();

    expect(resultado).toBeNull();
  });

  it("returns null when rates.PEN is missing from the response", async () => {
    mockFetchResolvedValue({
      ok: true,
      json: () => Promise.resolve({ result: "success", rates: { EUR: 0.92 } }),
    });

    const resultado = await getTipoCambioUsdPen();

    expect(resultado).toBeNull();
  });

  it("returns null when fetch throws (network error)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    const resultado = await getTipoCambioUsdPen();

    expect(resultado).toBeNull();
  });
});
