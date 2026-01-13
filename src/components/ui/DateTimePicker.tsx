"use client";

import React, { useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Calendar, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  parse,
  setHours,
  setMinutes,
} from "date-fns";
import { es } from "date-fns/locale";

interface DateTimePickerProps {
  value: string; // formato YYYY-MM-DDTHH:mm
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export default function DateTimePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha y hora",
  disabled = false,
  minDate,
  maxDate,
  className = "",
}: DateTimePickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd'T'HH:mm", new Date());
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  const selectedDate = value ? parse(value, "yyyy-MM-dd'T'HH:mm", new Date()) : null;
  const selectedHour = selectedDate ? format(selectedDate, "HH") : "09";
  const selectedMinute = selectedDate ? format(selectedDate, "mm") : "00";

  const handleDateSelect = (date: Date) => {
    const newDate = setMinutes(setHours(date, parseInt(selectedHour)), parseInt(selectedMinute));
    onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
  };

  const handleTimeChange = (hour: string, minute: string) => {
    if (selectedDate) {
      const newDate = setMinutes(setHours(selectedDate, parseInt(hour)), parseInt(minute));
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    } else {
      const newDate = setMinutes(setHours(new Date(), parseInt(hour)), parseInt(minute));
      onChange(format(newDate, "yyyy-MM-dd'T'HH:mm"));
    }
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleGoToNow = (close: () => void) => {
    const now = new Date();
    setCurrentMonth(now);
    onChange(format(now, "yyyy-MM-dd'T'HH:mm"));
    close();
  };

  const renderDays = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const days: React.ReactNode[] = [];
    let day = startDate;

    while (day <= endDate) {
      const currentDay = day;
      const isCurrentMonth = isSameMonth(day, monthStart);
      const isSelected = selectedDate && isSameDay(day, selectedDate);
      const isTodayDate = isToday(day);
      const isDisabled =
        (minDate && day < minDate) || (maxDate && day > maxDate);

      days.push(
        <button
          key={day.toISOString()}
          type="button"
          disabled={isDisabled || !isCurrentMonth}
          onClick={() => !isDisabled && isCurrentMonth && handleDateSelect(currentDay)}
          className={`
            w-8 h-8 rounded-lg text-sm font-medium transition-all duration-150
            ${!isCurrentMonth
              ? "text-crm-text-muted/30 cursor-default"
              : isDisabled
                ? "text-crm-text-muted/50 cursor-not-allowed"
                : isSelected
                  ? "bg-crm-primary text-white shadow-md"
                  : isTodayDate
                    ? "bg-crm-primary/20 text-crm-primary font-bold ring-1 ring-crm-primary/50"
                    : "text-crm-text-primary hover:bg-crm-card-hover"
            }
          `}
        >
          {format(day, "d")}
        </button>
      );

      day = addDays(day, 1);
    }

    return days;
  };

  const displayValue = selectedDate
    ? format(selectedDate, "dd/MM/yyyy HH:mm", { locale: es })
    : "";

  // Generar opciones de hora
  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
  const minutes = ["00", "15", "30", "45"];

  return (
    <Popover className="relative">
      {({ close }) => (
        <>
          <Popover.Button
            disabled={disabled}
            className={`
              w-full flex items-center gap-2 px-3 py-2
              bg-crm-card border border-crm-border rounded-lg
              text-left text-sm
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent
              disabled:opacity-50 disabled:cursor-not-allowed
              hover:border-crm-border-hover
              ${className}
            `}
          >
            <Calendar className="w-4 h-4 text-crm-text-muted flex-shrink-0" />
            <span className={displayValue ? "text-crm-text-primary" : "text-crm-text-muted"}>
              {displayValue || placeholder}
            </span>
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-200"
            enterFrom="opacity-0 translate-y-1"
            enterTo="opacity-100 translate-y-0"
            leave="transition ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0"
            leaveTo="opacity-0 translate-y-1"
          >
            <Popover.Panel className="absolute z-50 mt-2 w-80 origin-top-left">
              <div className="bg-crm-card border border-crm-border rounded-xl shadow-xl overflow-hidden">
                {/* Header - Mes y navegación */}
                <div className="flex items-center justify-between px-4 py-3 bg-crm-primary/5 border-b border-crm-border">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg hover:bg-crm-card-hover transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5 text-crm-text-primary" />
                  </button>

                  <h3 className="text-sm font-semibold text-crm-text-primary capitalize">
                    {format(currentMonth, "MMMM yyyy", { locale: es })}
                  </h3>

                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg hover:bg-crm-card-hover transition-colors"
                  >
                    <ChevronRight className="w-5 h-5 text-crm-text-primary" />
                  </button>
                </div>

                {/* Días de la semana */}
                <div className="grid grid-cols-7 gap-1 px-3 py-2 border-b border-crm-border bg-crm-card-hover/50">
                  {["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"].map((dayName) => (
                    <div
                      key={dayName}
                      className="w-8 h-7 flex items-center justify-center text-xs font-semibold text-crm-text-secondary"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Calendario */}
                <div className="grid grid-cols-7 gap-1 p-3">
                  {renderDays()}
                </div>

                {/* Selector de hora */}
                <div className="px-3 py-3 border-t border-crm-border bg-crm-card-hover/30">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-crm-text-muted" />
                    <span className="text-sm font-medium text-crm-text-secondary">Hora:</span>
                    <select
                      value={selectedHour}
                      onChange={(e) => handleTimeChange(e.target.value, selectedMinute)}
                      className="px-2 py-1.5 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    >
                      {hours.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                    <span className="text-crm-text-muted font-bold">:</span>
                    <select
                      value={selectedMinute}
                      onChange={(e) => handleTimeChange(selectedHour, e.target.value)}
                      className="px-2 py-1.5 bg-crm-card border border-crm-border rounded-lg text-sm text-crm-text-primary focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    >
                      {minutes.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Footer - Botón Ahora */}
                <div className="px-3 py-2 border-t border-crm-border">
                  <button
                    type="button"
                    onClick={() => handleGoToNow(close)}
                    className="w-full py-1.5 text-sm font-medium text-crm-primary hover:bg-crm-primary/10 rounded-lg transition-colors"
                  >
                    Ahora
                  </button>
                </div>
              </div>
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}
