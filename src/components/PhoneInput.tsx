"use client";

import { useState, useEffect } from "react";

interface Country {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

const COUNTRIES: Country[] = [
  { code: "PE", name: "Perú", dialCode: "+51", flag: "🇵🇪" },
  { code: "AR", name: "Argentina", dialCode: "+54", flag: "🇦🇷" },
  { code: "CL", name: "Chile", dialCode: "+56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "+57", flag: "🇨🇴" },
  { code: "EC", name: "Ecuador", dialCode: "+593", flag: "🇪🇨" },
  { code: "BO", name: "Bolivia", dialCode: "+591", flag: "🇧🇴" },
  { code: "UY", name: "Uruguay", dialCode: "+598", flag: "🇺🇾" },
  { code: "PY", name: "Paraguay", dialCode: "+595", flag: "🇵🇾" },
  { code: "VE", name: "Venezuela", dialCode: "+58", flag: "🇻🇪" },
  { code: "BR", name: "Brasil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "México", dialCode: "+52", flag: "🇲🇽" },
  { code: "US", name: "Estados Unidos", dialCode: "+1", flag: "🇺🇸" },
  { code: "ES", name: "España", dialCode: "+34", flag: "🇪🇸" },
  { code: "IT", name: "Italia", dialCode: "+39", flag: "🇮🇹" },
  { code: "FR", name: "Francia", dialCode: "+33", flag: "🇫🇷" },
  { code: "DE", name: "Alemania", dialCode: "+49", flag: "🇩🇪" },
  { code: "GB", name: "Reino Unido", dialCode: "+44", flag: "🇬🇧" },
  { code: "CA", name: "Canadá", dialCode: "+1", flag: "🇨🇦" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "JP", name: "Japón", dialCode: "+81", flag: "🇯🇵" },
  { code: "CN", name: "China", dialCode: "+86", flag: "🇨🇳" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "RU", name: "Rusia", dialCode: "+7", flag: "🇷🇺" },
  { code: "ZA", name: "Sudáfrica", dialCode: "+27", flag: "🇿🇦" },
];

interface PhoneInputProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
  required?: boolean;
  className?: string;
  onValueChange?: (fullNumber: string) => void;
}

export default function PhoneInput({
  name,
  defaultValue = "",
  placeholder = "Número de teléfono",
  disabled = false,
  label,
  required = false,
  className = "",
  onValueChange,
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(COUNTRIES[0]); // Perú por defecto
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Parsear el valor inicial si viene con código de país
  useEffect(() => {
    if (defaultValue) {
      const country = COUNTRIES.find(c => defaultValue.startsWith(c.dialCode));
      if (country) {
        setSelectedCountry(country);
        setPhoneNumber(defaultValue.replace(country.dialCode, "").trim());
      } else {
        setPhoneNumber(defaultValue);
      }
    }
  }, [defaultValue]);

  // Filtrar países por búsqueda
  const filteredCountries = COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    country.dialCode.includes(searchTerm) ||
    country.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsOpen(false);
    setSearchTerm("");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, ""); // Solo números
    setPhoneNumber(value);
    if (onValueChange) {
      const full = value ? `${selectedCountry.dialCode}${value}` : "";
      onValueChange(full);
    }
  };

  const formatPhoneNumber = (number: string) => {
    // Formatear según el país seleccionado
    if (selectedCountry.code === "PE") {
      // Formato peruano: 987 654 321
      return number.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
    } else if (selectedCountry.code === "AR") {
      // Formato argentino: 11 1234-5678
      return number.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2-$3");
    } else if (selectedCountry.code === "US" || selectedCountry.code === "CA") {
      // Formato norteamericano: (123) 456-7890
      return number.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3");
    }
    // Formato genérico
    return number;
  };

  const getFullPhoneNumber = () => {
    if (!phoneNumber) return "";
    return `${selectedCountry.dialCode}${phoneNumber.replace(/\D/g, '')}`;
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <label className="block text-xs font-medium text-crm-text-primary">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <div className="flex">
          {/* Selector de país */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              disabled={disabled}
              className="flex items-center space-x-1.5 px-2.5 py-2 border border-crm-border rounded-l-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all min-w-[100px]"
            >
              <span className="text-sm">{selectedCountry.flag}</span>
              <span className="text-xs font-medium">{selectedCountry.dialCode}</span>
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Dropdown de países */}
            {isOpen && (
              <div className="absolute top-full left-0 z-50 w-72 bg-crm-card border border-crm-border rounded-lg shadow-crm-xl mt-1 max-h-60 overflow-hidden">
                {/* Búsqueda */}
                <div className="p-2 border-b border-crm-border">
                  <input
                    type="text"
                    placeholder="Buscar país..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-crm-border rounded-md focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary"
                  />
                </div>

                {/* Lista de países */}
                <div className="max-h-48 overflow-y-auto">
                  {filteredCountries.map((country) => (
                    <button
                      key={country.code}
                      type="button"
                      onClick={() => handleCountrySelect(country)}
                      className="w-full flex items-center space-x-2 px-3 py-2 text-left hover:bg-crm-card-hover transition-colors"
                    >
                      <span className="text-sm">{country.flag}</span>
                      <div className="flex-1">
                        <div className="text-xs font-medium text-crm-text-primary">
                          {country.name}
                        </div>
                        <div className="text-[10px] text-crm-text-muted">
                          {country.dialCode}
                        </div>
                      </div>
                      {selectedCountry.code === country.code && (
                        <svg className="w-3 h-3 text-crm-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Input de número */}
          <input
            type="tel"
            name={name}
            autoComplete="tel"
            value={formatPhoneNumber(phoneNumber)}
            onChange={handlePhoneChange}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            className="flex-1 px-3 py-2 border border-crm-border rounded-r-lg text-xs focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent bg-crm-card text-crm-text-primary disabled:opacity-50 transition-all"
          />

          {/* Input oculto con el número completo para el formulario */}
          <input
            type="hidden"
            name={`${name}_full`}
            value={getFullPhoneNumber()}
          />
        </div>
      </div>

      {/* Overlay para cerrar dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
