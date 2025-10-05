"use client";

import { useMemo, useState } from "react";
import { ExchangeRate } from "@/lib/exchange";
import { Calculator } from "lucide-react";

interface CurrencyConverterProps {
  exchangeRates: ExchangeRate[];
}

export default function CurrencyConverter({ exchangeRates }: CurrencyConverterProps) {
  const usdRate = useMemo(() => exchangeRates.find(rate => rate.currency === "USD") ?? { currency: "USD", buy: null, sell: null, date: null }, [exchangeRates]);
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'usdToPen' | 'penToUsd'>('usdToPen');
  const [amount, setAmount] = useState('');

  const rateValue = useMemo(() => {
    if (mode === 'usdToPen') return usdRate.sell ?? usdRate.buy;
    return usdRate.buy ?? usdRate.sell;
  }, [usdRate, mode]);

  const result = useMemo(() => {
    const value = parseFloat(amount.replace(',', '.'));
    if (!rateValue || Number.isNaN(value)) return '';
    if (mode === 'usdToPen') {
      return (value * rateValue).toFixed(2);
    }
    if (rateValue === 0) return '';
    return (value / rateValue).toFixed(2);
  }, [amount, rateValue, mode]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(prev => !prev)}
        className="inline-flex items-center gap-1 rounded-full border border-crm-border bg-crm-card px-3 py-1 text-xs font-medium text-crm-text-primary shadow-sm hover:bg-crm-card-hover"
      >
        <Calculator className="h-4 w-4" />
        <span>Conversor</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-16 sm:top-auto mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-72 rounded-2xl border border-crm-border/70 bg-crm-card/95 p-4 text-sm text-crm-text-primary shadow-xl backdrop-blur z-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-crm-text-primary">Conversor USD ⇄ PEN</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-crm-text-muted hover:text-crm-text-primary"
            >
              ✕
            </button>
          </div>

          <div className="mt-3 flex gap-2 rounded-full bg-crm-card-hover p-1">
            <button
              type="button"
              onClick={() => setMode('usdToPen')}
              className={`flex-1 rounded-full py-1 text-xs font-semibold transition-colors ${mode === 'usdToPen' ? 'bg-crm-primary text-white' : 'text-crm-text-muted hover:text-crm-text-primary'}`}
            >
              USD → PEN
            </button>
            <button
              type="button"
              onClick={() => setMode('penToUsd')}
              className={`flex-1 rounded-full py-1 text-xs font-semibold transition-colors ${mode === 'penToUsd' ? 'bg-crm-primary text-white' : 'text-crm-text-muted hover:text-crm-text-primary'}`}
            >
              PEN → USD
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <label className="text-xs font-medium text-crm-text-muted">Monto</label>
            <input
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={mode === 'usdToPen' ? 'Monto en USD' : 'Monto en PEN'}
              className="w-full rounded-lg border border-crm-border bg-crm-card px-3 py-2 text-sm focus:border-crm-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
            />
          </div>

          <div className="mt-4 rounded-lg bg-crm-card-hover px-3 py-2">
            <p className="text-xs text-crm-text-muted">Resultado</p>
            <p className="text-lg font-semibold text-crm-text-primary">
              {result ? `${mode === 'usdToPen' ? 'S/ ' : '$ '}${result}` : '--'}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between text-xs text-crm-text-muted">
            <span>Tipo de cambio {mode === 'usdToPen' ? 'venta' : 'compra'}:</span>
            <span className="font-medium text-crm-text-primary">{rateValue ? rateValue.toFixed(3) : '--'}</span>
          </div>

          {usdRate.date && (
            <p className="mt-2 text-[11px] text-crm-text-muted">Fuente SUNAT · {usdRate.date}</p>
          )}

          {!rateValue && (
            <p className="mt-2 text-[11px] text-crm-danger">
              No se pudo obtener el tipo de cambio. Intenta más tarde o actualiza la página.
            </p>
          )}
        </div>
        </>
      )}
    </div>
  );
}
