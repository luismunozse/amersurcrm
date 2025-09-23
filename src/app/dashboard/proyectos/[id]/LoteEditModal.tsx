"use client";

import { useEffect, useMemo, useState } from "react";

type Lote = {
  id: string;
  codigo: string;
  sup_m2: number | null;
  precio: number | null;
  moneda: string | null;
  estado: "disponible" | "reservado" | "vendido";
};

interface Props {
  open: boolean;
  onClose: () => void;
  lote: Lote | null;
  onSave: (payload: {
    id: string;
    codigo?: string;
    sup_m2?: number | null;
    precio?: number | null;
    moneda?: string | null;
    estado?: Lote["estado"];
  }) => Promise<boolean>;
}

export default function LoteEditModal({ open, onClose, lote, onSave }: Props) {
  const [codigo, setCodigo] = useState("");
  const [sup, setSup] = useState("");
  const [precio, setPrecio] = useState("");
  const [moneda, setMoneda] = useState("PEN");
  const [estado, setEstado] = useState<Lote["estado"]>("disponible");

  const initial = useMemo(() => ({
    codigo: lote?.codigo ?? "",
    sup: lote?.sup_m2 != null ? String(lote.sup_m2) : "",
    precio: lote?.precio != null ? String(lote.precio) : "",
    moneda: lote?.moneda ?? "PEN",
    estado: lote?.estado ?? "disponible",
  }), [lote]);

  useEffect(() => {
    if (open && lote) {
      setCodigo(initial.codigo);
      setSup(initial.sup);
      setPrecio(initial.precio);
      setMoneda(initial.moneda);
      setEstado(initial.estado as Lote["estado"]);
    }
  }, [open, lote, initial]);

  if (!open || !lote) return null;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { id: lote.id };
    if (codigo !== initial.codigo) payload.codigo = codigo;
    if (sup !== initial.sup) payload.sup_m2 = sup === "" ? null : Number(sup);
    if (precio !== initial.precio) payload.precio = precio === "" ? null : Number(precio);
    if (moneda !== initial.moneda) payload.moneda = moneda;
    if (estado !== initial.estado) payload.estado = estado;

    if (Object.keys(payload).length === 1) {
      onClose();
      return;
    }

    const ok = await onSave(payload);
    if (ok) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-crm-card border border-crm-border rounded-xl shadow-crm-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-crm-border">
          <h3 className="text-lg font-semibold text-crm-text-primary">Editar lote {lote.codigo}</h3>
          <button onClick={onClose} className="text-crm-text-muted hover:text-crm-text-primary">✕</button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Código *</label>
              <input value={codigo} onChange={(e)=>setCodigo(e.target.value)} required className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Superficie (m²)</label>
              <input type="number" step="0.01" value={sup} onChange={(e)=>setSup(e.target.value)} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Precio</label>
              <input type="number" step="0.01" value={precio} onChange={(e)=>setPrecio(e.target.value)} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Moneda</label>
              <select value={moneda ?? "PEN"} onChange={(e)=>setMoneda(e.target.value)} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
                <option value="PEN">PEN</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-crm-text-primary mb-2">Estado</label>
              <select value={estado} onChange={(e)=>setEstado(e.target.value as any)} className="w-full px-3 py-2 border border-crm-border rounded-lg bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-crm-primary">
                <option value="disponible">Disponible</option>
                <option value="reservado">Reservado</option>
                <option value="vendido">Vendido</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-crm-text-muted hover:text-crm-text-primary border border-crm-border rounded-lg transition-colors">Cancelar</button>
            <button type="submit" className="crm-button-primary px-4 py-2 rounded-lg text-sm font-medium">Guardar cambios</button>
          </div>
        </form>
      </div>
    </div>
  );
}


