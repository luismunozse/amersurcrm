"use client";

import { useMemo, useState } from "react";
import { ExchangeRate } from "@/lib/exchange";
import { Calculator, X } from "lucide-react";

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
        aria-label="Conversor de divisas"
        title="Conversor USD ⇄ PEN"
        className="inline-flex items-center justify-center gap-1 rounded-full border border-crm-border bg-crm-card text-xs font-medium text-crm-text-primary shadow-sm hover:bg-crm-card-hover sm:px-3 sm:py-1 w-9 h-9 sm:w-auto sm:h-auto"
      >
        <Calculator className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Conversor</span>
      </button>

      {isOpen && (
        <>
          {/* Overlay para cerrar al hacer click fuera */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />

          <div className="fixed sm:absolute left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0 top-16 sm:top-auto mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-72 rounded-2xl border border-crm-border/70 bg-crm-card p-4 text-sm text-crm-text-primary shadow-xl backdrop-blur z-50">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-crm-text-primary">Conversor USD ⇄ PEN</h3>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar"
              className="text-crm-text-muted hover:text-crm-text-primary"
            >
              <X className="w-4 h-4" />
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
              type="text"
              inputMode="decimal"
              pattern="[0-9]*[.,]?[0-9]*"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={mode === 'usdToPen' ? 'Monto en USD' : 'Monto en PEN'}
              className="w-full rounded-lg border border-crm-border bg-crm-card px-3 py-2.5 text-sm focus:border-crm-primary focus:outline-none focus:ring-2 focus:ring-crm-primary/20"
            />
          </div>

          <div className="mt-4 rounded-lg bg-crm-card-hover px-3 py-2">
            <p className="text-xs text-crm-text-muted">Resultado</p>
            <p className="text-lg font-semibold text-crm-text-primary">
              {result ? `${mode === 'usdToPen' ? 'S/ ' : '$ '}${result}` : '--'}
            </p>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-crm-card-hover p-2 text-xs">
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-crm-text-muted">Compra</span>
              <span className="font-semibold text-crm-text-primary">
                {usdRate.buy ? usdRate.buy.toFixed(3) : '--'}
              </span>
            </div>
            <div className="flex flex-col leading-tight">
              <span className="text-[10px] uppercase tracking-wide text-crm-text-muted">Venta</span>
              <span className="font-semibold text-crm-text-primary">
                {usdRate.sell ? usdRate.sell.toFixed(3) : '--'}
              </span>
            </div>
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
