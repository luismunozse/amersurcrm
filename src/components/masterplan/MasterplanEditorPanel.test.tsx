import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const guardarMasterplanProyecto = vi.fn().mockResolvedValue({ ok: true });
vi.mock("@/app/dashboard/proyectos/_actions", () => ({
  guardarMasterplanProyecto: (...a: any[]) => guardarMasterplanProyecto(...a),
}));

const uploadProyectoAsset = vi.fn().mockResolvedValue({
  publicUrl: "https://cdn.example.com/masterplan-1.png",
  path: "proyectos/p1/masterplan-1.png",
  nombre: "plano.png",
});
const removeProyectoAssets = vi.fn().mockResolvedValue(undefined);
// `validateProyectoImage` se deja real (pura, sin I/O) para ejercitar el
// mensaje formal de rechazo tal cual lo produce el código de producción.
vi.mock("@/lib/storage/proyectoUpload.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/proyectoUpload.client")>();
  return {
    ...actual,
    uploadProyectoAsset: (...a: any[]) => uploadProyectoAsset(...a),
    removeProyectoAssets: (...a: any[]) => removeProyectoAssets(...a),
  };
});

const rasterizeFirstPageToPng = vi.fn();
// `aspectRatioChanged` se deja real (pura) para ejercitar la guardia de
// proporción con la lógica de negocio verdadera, no una reimplementación.
vi.mock("@/lib/masterplan/rasterize.client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/masterplan/rasterize.client")>();
  return {
    ...actual,
    rasterizeFirstPageToPng: (...a: any[]) => rasterizeFirstPageToPng(...a),
  };
});

vi.mock("@/lib/supabase.client", () => ({
  createClient: () => ({}) as any,
}));

// El editor de polígonos no es objeto de esta suite (cubierto en
// MasterplanEditor.test.tsx); se reemplaza por un stub liviano para no
// arrastrar su propio árbol de dependencias dentro de estas pruebas del panel.
vi.mock("next/dynamic", () => ({
  default: () =>
    function MasterplanEditorStub() {
      return null;
    },
}));

import { MasterplanEditorPanel } from "./MasterplanEditorPanel";
import type { Masterplan } from "@/types/proyectos";

// jsdom (este repo) no implementa `URL.createObjectURL` y no decodifica
// imágenes reales vía `<img>`: se controla `naturalWidth/naturalHeight` con
// un stub de `Image` que dispara `onload` en un microtask. Ver engram #436
// sobre gaps similares de jsdom ya documentados en este repo (PointerEvent,
// getBoundingClientRect).
let nextImageDims = { w: 800, h: 600 };
let imageShouldError = false;

class MockImage {
  naturalWidth = 0;
  naturalHeight = 0;
  onload: ((ev?: unknown) => void) | null = null;
  onerror: ((ev?: unknown) => void) | null = null;

  set src(_v: string) {
    queueMicrotask(() => {
      if (imageShouldError) {
        this.onerror?.(new Event("error"));
        return;
      }
      this.naturalWidth = nextImageDims.w;
      this.naturalHeight = nextImageDims.h;
      this.onload?.(new Event("load"));
    });
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  nextImageDims = { w: 800, h: 600 };
  imageShouldError = false;
  vi.stubGlobal("Image", MockImage as unknown as typeof Image);
  URL.createObjectURL = vi.fn(() => "blob:mock-url");
  URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function pdfFile(name = "plano.pdf") {
  return new File(["%PDF-1.4 dummy"], name, { type: "application/pdf" });
}

function pngFile(name = "plano.png", bytes = "png-bytes") {
  return new File([bytes], name, { type: "image/png" });
}

function getFileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

describe("MasterplanEditorPanel — onFile", () => {
  it("una imagen válida se sube y persiste solo el masterplan (sin claves legacy)", async () => {
    nextImageDims = { w: 640, h: 480 };
    const onSaved = vi.fn();
    const archivo = pngFile();
    const { container } = render(
      <MasterplanEditorPanel proyectoId="p1" masterplan={null} lotes={[]} onSaved={onSaved} />,
    );

    fireEvent.change(getFileInput(container), { target: { files: [archivo] } });

    await waitFor(() => expect(guardarMasterplanProyecto).toHaveBeenCalledTimes(1));

    expect(rasterizeFirstPageToPng).not.toHaveBeenCalled();
    expect(uploadProyectoAsset).toHaveBeenCalledWith(expect.anything(), "p1", archivo, "masterplan");

    const [proyectoId, payload] = guardarMasterplanProyecto.mock.calls[0];
    expect(proyectoId).toBe("p1");
    expect(Object.keys(payload).sort()).toEqual(["height", "path", "url", "width"]);
    expect(payload).toEqual({
      url: "https://cdn.example.com/masterplan-1.png",
      path: "proyectos/p1/masterplan-1.png",
      width: 640,
      height: 480,
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("un PDF se rasteriza antes de subir el PNG resultante", async () => {
    const original = pdfFile();
    const rasterizado = pngFile("plano.png");
    rasterizeFirstPageToPng.mockResolvedValueOnce(rasterizado);
    nextImageDims = { w: 1200, h: 900 };
    const onSaved = vi.fn();

    const { container } = render(
      <MasterplanEditorPanel proyectoId="p1" masterplan={null} lotes={[]} onSaved={onSaved} />,
    );
    fireEvent.change(getFileInput(container), { target: { files: [original] } });

    await waitFor(() => expect(guardarMasterplanProyecto).toHaveBeenCalledTimes(1));

    expect(rasterizeFirstPageToPng).toHaveBeenCalledTimes(1);
    expect(rasterizeFirstPageToPng).toHaveBeenCalledWith(original);
    expect(uploadProyectoAsset).toHaveBeenCalledWith(expect.anything(), "p1", rasterizado, "masterplan");
    expect(guardarMasterplanProyecto).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ width: 1200, height: 900 }),
    );
  });

  it("un tipo de archivo no soportado se rechaza con el mensaje formal en español y no sube nada", async () => {
    const archivo = new File(["doc"], "plano.docx", {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    const onSaved = vi.fn();

    const { container } = render(
      <MasterplanEditorPanel proyectoId="p1" masterplan={null} lotes={[]} onSaved={onSaved} />,
    );
    fireEvent.change(getFileInput(container), { target: { files: [archivo] } });

    await waitFor(() => {
      expect(screen.getByText("Masterplan: formato no permitido (usa JPG, PNG o WEBP)")).toBeInTheDocument();
    });

    expect(rasterizeFirstPageToPng).not.toHaveBeenCalled();
    expect(uploadProyectoAsset).not.toHaveBeenCalled();
    expect(guardarMasterplanProyecto).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});

describe("MasterplanEditorPanel — guardia de proporción al reemplazar el plano", () => {
  const masterplanActual: Masterplan = {
    url: "https://cdn.example.com/masterplan-old.png",
    path: "proyectos/p1/masterplan-old.png",
    width: 1000,
    height: 500,
  };

  it("un cambio de proporción muestra el ConfirmDialog y Cancelar aborta el guardado", async () => {
    nextImageDims = { w: 1000, h: 1000 }; // ratio 1 vs. original ratio 2: excede la tolerancia
    const archivo = pngFile("nuevo.png");
    const onSaved = vi.fn();

    const { container } = render(
      <MasterplanEditorPanel proyectoId="p1" masterplan={masterplanActual} lotes={[]} onSaved={onSaved} />,
    );
    fireEvent.change(getFileInput(container), { target: { files: [archivo] } });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    expect(screen.getByText("El nuevo plano tiene otra proporción")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(screen.queryByRole("dialog")).toBeNull();
    expect(guardarMasterplanProyecto).not.toHaveBeenCalled();
    expect(uploadProyectoAsset).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it("confirmar en el ConfirmDialog persiste el nuevo plano", async () => {
    nextImageDims = { w: 1000, h: 1000 };
    const archivo = pngFile("nuevo.png");
    const onSaved = vi.fn();

    const { container } = render(
      <MasterplanEditorPanel proyectoId="p1" masterplan={masterplanActual} lotes={[]} onSaved={onSaved} />,
    );
    fireEvent.change(getFileInput(container), { target: { files: [archivo] } });

    await waitFor(() => expect(screen.getByRole("dialog")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));

    await waitFor(() => expect(guardarMasterplanProyecto).toHaveBeenCalledTimes(1));

    expect(uploadProyectoAsset).toHaveBeenCalledWith(expect.anything(), "p1", archivo, "masterplan");
    expect(guardarMasterplanProyecto).toHaveBeenCalledWith(
      "p1",
      expect.objectContaining({ width: 1000, height: 1000 }),
    );
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
