"use client";

import React, { useState } from "react";
import { Popover, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
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
} from "date-fns";
import { es } from "date-fns/locale";

interface DatePickerProps {
  value: string; // formato YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  className?: string;
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
  disabled = false,
  minDate,
  maxDate,
  className = "",
}: DatePickerProps) {
  const [currentMonth, setCurrentMonth] = useState<Date>(() => {
    if (value) {
      const parsed = parse(value, "yyyy-MM-dd", new Date());
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    }
    return new Date();
  });

  const selectedDate = value ? parse(value, "yyyy-MM-dd", new Date()) : null;

  const handleDateSelect = (date: Date, close: () => void) => {
    onChange(format(date, "yyyy-MM-dd"));
    close();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const handleGoToToday = (close: () => void) => {
    const today = new Date();
    setCurrentMonth(today);
    onChange(format(today, "yyyy-MM-dd"));
    close();
  };

  const renderDays = (close: () => void) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
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
          onClick={() => !isDisabled && isCurrentMonth && handleDateSelect(currentDay, close)}
          className={`
            w-9 h-9 rounded-lg text-sm font-medium transition-all duration-150
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
    ? format(selectedDate, "dd/MM/yyyy", { locale: es })
    : "";

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
            <Popover.Panel className="absolute z-50 mt-2 w-72 origin-top-left">
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
                      className="w-9 h-8 flex items-center justify-center text-xs font-semibold text-crm-text-secondary"
                    >
                      {dayName}
                    </div>
                  ))}
                </div>

                {/* Calendario */}
                <div className="grid grid-cols-7 gap-1 p-3">
                  {renderDays(close)}
                </div>

                {/* Footer - Botón Hoy */}
                <div className="px-3 py-2 border-t border-crm-border bg-crm-card-hover/30">
                  <button
                    type="button"
                    onClick={() => handleGoToToday(close)}
                    className="w-full py-1.5 text-sm font-medium text-crm-primary hover:bg-crm-primary/10 rounded-lg transition-colors"
                  >
                    Hoy
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
