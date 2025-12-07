"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { es } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type DateTimePickerProps = {
  value?: string;
  onChange: (isoString: string) => void;
  disabled?: boolean;
};

const minuteStep = 5;
const hours = Array.from({ length: 24 }, (_, i) => i);
const minuteOptions = Array.from({ length: 60 / minuteStep }, (_, i) => i * minuteStep);
const weekDayLabels = ["L", "M", "X", "J", "V", "S", "D"];

function normalizeDate(value?: string): Date {
  if (!value) return new Date();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export default function DateTimePicker({ value, onChange, disabled }: DateTimePickerProps) {
  const initialDate = normalizeDate(value);
  const [open, setOpen] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({});
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate);
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(initialDate));
  const [selectedHour, setSelectedHour] = useState(initialDate.getHours());
  const [selectedMinute, setSelectedMinute] = useState(initialDate.getMinutes() - (initialDate.getMinutes() % minuteStep));
  const containerRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const parsed = normalizeDate(value);
    setSelectedDate(parsed);
    setCurrentMonth(startOfMonth(parsed));
    setSelectedHour(parsed.getHours());
    setSelectedMinute(parsed.getMinutes() - (parsed.getMinutes() % minuteStep));
  }, [value]);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const spacing = 8;
    const width = 320;
    const height = 380;
    let top = rect.bottom + spacing;
    let left = rect.right - width;
    if (top + height > window.innerHeight - spacing) {
      top = rect.top - height - spacing;
    }
    if (left < spacing) {
      left = spacing;
    }
    if (left + width > window.innerWidth - spacing) {
      left = window.innerWidth - spacing - width;
    }
    setPopoverStyle({
      top: Math.max(spacing, top),
      left,
      maxHeight: `${Math.min(height, window.innerHeight - spacing * 2)}px`,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const daysInMonth = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const formattedValue = useMemo(() => {
    if (!selectedDate) return "Selecciona una fecha";
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(selectedDate);
  }, [selectedDate]);

  const updateValue = (date: Date, hour = selectedHour, minute = selectedMinute) => {
    const updated = new Date(date);
    updated.setHours(hour);
    updated.setMinutes(minute);
    updated.setSeconds(0, 0);
    onChange(updated.toISOString());
  };

  const handleDaySelect = (day: Date) => {
    setSelectedDate(day);
    updateValue(day);
  };

  const handleHourChange = (hour: number) => {
    setSelectedHour(hour);
    updateValue(selectedDate, hour, selectedMinute);
  };

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    updateValue(selectedDate, selectedHour, minute);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className={cn(
          "w-full px-3 py-2 border rounded-lg flex items-center gap-2 text-left transition-colors",
          "bg-crm-card border-crm-border text-crm-text-primary hover:border-crm-primary focus:outline-none focus:ring-2 focus:ring-crm-primary",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        disabled={disabled}
        ref={triggerRef}
      >
        <Calendar className="h-4 w-4 text-crm-primary" />
        <span className="flex-1 text-sm">{formattedValue}</span>
      </button>

      {open && (
        <div
          className="fixed z-50 w-80 rounded-xl border border-crm-border bg-crm-card shadow-xl p-4"
          style={popoverStyle}
        >
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              className="p-1 rounded-full hover:bg-crm-bg-muted text-crm-text-muted"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <p className="text-sm font-medium text-crm-text-primary">
              {format(currentMonth, "MMMM yyyy", { locale: es })}
            </p>
            <button
              type="button"
              className="p-1 rounded-full hover:bg-crm-bg-muted text-crm-text-muted"
              onClick={() => setCurrentMonth((prev) => addMonths(prev, 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-xs text-center text-crm-text-muted mb-2">
            {weekDayLabels.map((day, index) => (
              <span key={`${day}-${index}`} className="py-1">
                {day}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 text-sm">
            {daysInMonth.map((day) => {
              const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
              const isSelected = isSameDay(day, selectedDate);
              const isToday = isSameDay(day, new Date());

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleDaySelect(day)}
                  className={cn(
                    "h-9 rounded-lg transition-colors",
                    isSelected
                      ? "bg-crm-primary text-white font-semibold"
                      : "text-crm-text-primary hover:bg-crm-primary/10",
                    !isCurrentMonth && "text-crm-text-muted/40 hover:bg-transparent",
                    isToday && !isSelected && "border border-crm-primary/50"
                  )}
                >
                  {day.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-4 space-y-2">
            <div className="text-xs font-medium text-crm-text-muted flex items-center gap-2 uppercase tracking-wide">
              <Clock className="h-3.5 w-3.5 text-crm-primary" />
              Selecciona hora
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-crm-text-muted mb-1">Hora</p>
                <select
                  value={selectedHour}
                  onChange={(e) => handleHourChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary appearance-none transition-colors"
                >
                  {hours.map((hour) => (
                    <option key={hour} value={hour}>
                      {hour.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <p className="text-xs text-crm-text-muted mb-1">Minutos</p>
                <select
                  value={selectedMinute}
                  onChange={(e) => handleMinuteChange(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-crm-border bg-crm-card text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary appearance-none transition-colors"
                >
                  {minuteOptions.map((minute) => (
                    <option key={minute} value={minute}>
                      {minute.toString().padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
