# Ejemplos de Código para Transiciones de Sidebar

## 🎯 Mejora Recomendada: Drawer Over Content + Spring Animation

Esta es la implementación más moderna y profesional, combinando lo mejor de varias técnicas.

---

## 📝 Opción 1: Mejoras Simples (Sin cambios estructurales)

### A. Mejorar el easing actual

En tu `Sidebar.tsx`, línea 251, cambia:

**ANTES**:
```tsx
className={cn(
  "transition-[width] duration-300",
  // ...
)}
```

**DESPUÉS** (más natural):
```tsx
className={cn(
  "transition-[width] duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]",
  // ...
)}
```

### B. Añadir soporte para Reduced Motion

Agrega al inicio del componente:

```tsx
export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // ✨ NUEVO: Detectar preferencia de reduced motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  // ... resto del código
```

Luego usa en el aside:

```tsx
<aside
  className={cn(
    "fixed inset-y-0 left-0 z-50",
    prefersReducedMotion
      ? "transition-none" // Sin animaciones si el usuario lo prefiere
      : "transition-all duration-300 ease-[cubic-bezier(0.4,0.0,0.2,1)]",
    // ... resto
  )}
>
```

### C. Mejorar el overlay móvil con blur

**ANTES** (línea ~242):
```tsx
{isOpen && (
  <button
    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
    onClick={onClose}
  />
)}
```

**DESPUÉS**:
```tsx
{isOpen && (
  <button
    className="fixed inset-0 bg-gradient-to-r from-black/50 to-black/30
               backdrop-blur-md z-40 lg:hidden
               animate-in fade-in-0 duration-300
               cursor-default"
    onClick={onClose}
    aria-label="Cerrar menú"
  />
)}
```

### D. Añadir efecto de rebote sutil al botón hamburguesa

En el botón de colapsar (línea ~301), añade:

```tsx
<button
  type="button"
  onClick={() => handleCollapseChange(true)}
  className="hidden lg:flex items-center justify-center ml-3 w-10 h-10
             rounded-xl bg-white/5 backdrop-blur-sm border border-white/10
             text-white/70 hover:text-white hover:bg-white/10
             hover:border-white/20
             transition-all duration-300
             hover:scale-110 active:scale-95  /* ✨ NUEVO */
             group"
  aria-label="Colapsar sidebar"
>
```

---

## 📝 Opción 2: Drawer Over Content (Cambios Moderados)

### Paso 1: Modificar el layout principal

En `src/app/dashboard/layout.tsx`:

**ANTES**:
```tsx
<div className="flex h-dvh overflow-hidden bg-crm-bg-primary">
  <Sidebar {...props} />
  <main className="flex-1 overflow-y-auto">
```

**DESPUÉS**:
```tsx
<div className="relative min-h-screen bg-crm-bg-primary">
  {/* Sidebar ahora es flotante */}
  <Sidebar {...props} />

  {/* Main con padding dinámico */}
  <main className={cn(
    "min-h-screen overflow-y-auto transition-all duration-300 ease-out",
    "lg:ml-[var(--sidebar-w)]" // Se ajusta automáticamente
  )}>
```

### Paso 2: Añadir sombra profunda al sidebar

En `Sidebar.tsx`, añade clase al aside:

```tsx
<aside
  className={cn(
    "fixed inset-y-0 left-0 z-50 bg-crm-sidebar",
    "shadow-2xl shadow-black/30", // ✨ NUEVO: Sombra más pronunciada
    "lg:border-r lg:border-crm-sidebar-hover/30", // ✨ NUEVO: Borde sutil
    // ... resto
  )}
>
```

### Paso 3: Mejorar animación de entrada (mobile)

```tsx
<aside
  className={cn(
    // ...
    isOpen
      ? "translate-x-0 opacity-100 scale-100" // ✨ NUEVO: scale
      : "-translate-x-full opacity-0 scale-95", // ✨ NUEVO: scale + opacity
    "transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]", // ✨ Easing con rebote
  )}
>
```

---

## 📝 Opción 3: Framer Motion (Cambios Avanzados)

### Instalación

```bash
npm install framer-motion
```

### Implementación completa

Reemplaza tu componente Sidebar completo con esta versión mejorada:

```tsx
"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import * as Tooltip from "@radix-ui/react-tooltip";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"; // ✨ NUEVO

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  onCollapseChange?: (collapsed: boolean) => void;
}

// ... (navigation y adminNavigation igual)

export function Sidebar({ isOpen, onClose, collapsed: externalCollapsed, onCollapseChange }: SidebarProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [internalCollapsed, setInternalCollapsed] = useState(false);

  // ✨ NUEVO: Detectar reduced motion
  const shouldReduceMotion = useReducedMotion();

  const collapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  // ... (resto del código de estado igual)

  return (
    <>
      {/* Overlay con AnimatePresence */}
      <AnimatePresence>
        {isOpen && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-gradient-to-r from-black/50 to-black/30
                       backdrop-blur-md z-40 lg:hidden cursor-default"
            onClick={onClose}
            aria-label="Cerrar menú"
          />
        )}
      </AnimatePresence>

      {/* Sidebar con motion */}
      <motion.aside
        initial={false}
        animate={{
          x: isOpen ? 0 : -280,
          width: collapsed ? 88 : 280,
          opacity: isOpen ? 1 : 0,
        }}
        transition={{
          x: {
            type: shouldReduceMotion ? "tween" : "spring",
            damping: 25,
            stiffness: 200,
            duration: shouldReduceMotion ? 0 : undefined,
          },
          width: {
            duration: shouldReduceMotion ? 0 : 0.3,
            ease: "easeInOut",
          },
          opacity: {
            duration: shouldReduceMotion ? 0 : 0.2,
          },
        }}
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-crm-sidebar",
          "shadow-2xl shadow-black/30",
          "lg:translate-x-0 lg:sticky lg:top-0 lg:h-dvh lg:z-40",
          "overflow-hidden"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header igual */}
          <div className={cn(
            "flex items-center h-20 px-6 border-b border-crm-sidebar-hover",
            collapsed ? "lg:justify-center lg:px-3" : "justify-between"
          )}>
            {/* ... header content igual ... */}
          </div>

          {/* Navigation con stagger */}
          <motion.nav
            className="flex-1 px-4 sm:px-6 py-6 space-y-1.5 overflow-y-auto"
            variants={{
              visible: {
                transition: {
                  staggerChildren: shouldReduceMotion ? 0 : 0.05,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {navigation.map((item, i) => (
              <motion.div
                key={item.name}
                variants={{
                  hidden: { x: -20, opacity: 0 },
                  visible: {
                    x: 0,
                    opacity: 1,
                    transition: {
                      type: shouldReduceMotion ? "tween" : "spring",
                      damping: 20,
                      stiffness: 300,
                    },
                  },
                }}
              >
                <NavLink
                  href={item.href}
                  active={isActive(item.href)}
                  onClick={onClose}
                  collapsed={collapsed}
                  label={item.name}
                >
                  <span className="shrink-0 grid place-items-center w-8 h-8">
                    {item.icon}
                  </span>
                  <AnimatePresence>
                    {!collapsed && (
                      <motion.span
                        initial={{ opacity: 0, x: -10, maxWidth: 0 }}
                        animate={{ opacity: 1, x: 0, maxWidth: 200 }}
                        exit={{ opacity: 0, x: -10, maxWidth: 0 }}
                        transition={{
                          duration: shouldReduceMotion ? 0 : 0.2,
                          ease: "easeOut",
                        }}
                        className="whitespace-nowrap overflow-hidden"
                      >
                        {item.name}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </NavLink>
              </motion.div>
            ))}

            {/* Separador animado */}
            {!loading && isAdmin && (
              <motion.div
                initial={{ scaleX: 0, opacity: 0 }}
                animate={{ scaleX: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.3 }}
                className="relative my-6"
              >
                <div className="border-t border-crm-sidebar-hover/50" />
              </motion.div>
            )}

            {/* Admin navigation igual pero con motion */}
            {!loading && isAdmin && adminNavigation.map((item, i) => (
              <motion.div
                key={item.name}
                variants={{
                  hidden: { x: -20, opacity: 0 },
                  visible: {
                    x: 0,
                    opacity: 1,
                    transition: {
                      type: "spring",
                      damping: 20,
                      stiffness: 300,
                    },
                  },
                }}
              >
                {/* ... NavLink igual ... */}
              </motion.div>
            ))}
          </motion.nav>
        </div>
      </motion.aside>
    </>
  );
}
```

---

## 📝 Opción 4: Efectos Micro-Interactivos

### A. Magnetic Button (Botón Magnético)

Añade esto al botón hamburguesa de expandir:

```tsx
import { useRef } from "react";

export function Sidebar({ ... }) {
  const magneticButtonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!magneticButtonRef.current) return;

    const rect = magneticButtonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    magneticButtonRef.current.style.transform =
      `translate(${x * 0.3}px, ${y * 0.3}px) scale(1.05)`;
  };

  const handleMouseLeave = () => {
    if (!magneticButtonRef.current) return;
    magneticButtonRef.current.style.transform = 'translate(0, 0) scale(1)';
  };

  return (
    // ...
    <button
      ref={magneticButtonRef}
      type="button"
      onClick={() => handleCollapseChange(false)}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="hidden lg:flex items-center justify-center w-14 h-14
                 rounded-2xl bg-gradient-to-br from-crm-primary/30 to-crm-accent/30
                 transition-all duration-200 ease-out" // ✨ duration más corta para efecto magnético
      style={{ transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <Bars3Icon className="w-7 h-7" />
    </button>
  );
}
```

### B. Ripple Effect en NavLink

```tsx
function NavLink({ ... }) {
  const [ripples, setRipples] = useState<Array<{ x: number; y: number; id: number }>>([]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple = { x, y, id: Date.now() };
    setRipples([...ripples, newRipple]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newRipple.id));
    }, 600);

    onClick?.();
  };

  return (
    <Link
      onClick={handleClick}
      className="relative overflow-hidden ..." // importante: overflow-hidden
    >
      {/* Ripples */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute rounded-full bg-white/20 animate-ping"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: 20,
            height: 20,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}

      {/* Contenido normal */}
      <div className="relative z-10">
        {children}
      </div>
    </Link>
  );
}
```

### C. Skeleton Loading para items

Mientras `loading === true`:

```tsx
{loading ? (
  <div className="space-y-2 px-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div
        key={i}
        className="h-11 bg-crm-sidebar-hover/50 rounded-xl animate-pulse"
        style={{ animationDelay: `${i * 100}ms` }}
      />
    ))}
  </div>
) : (
  <nav>
    {/* Navigation normal */}
  </nav>
)}
```

---

## 🎨 Efectos CSS Adicionales

### 1. Glow Pulse en Active Link

Añade al NavLink cuando `active={true}`:

```tsx
{active && (
  <>
    {/* Glow pulsante */}
    <div className="absolute inset-0 bg-crm-primary/20 rounded-xl
                    animate-pulse blur-xl -z-10" />

    {/* Borde animado */}
    <div className="absolute inset-0 rounded-xl border-2 border-crm-primary/40
                    animate-[border-pulse_2s_ease-in-out_infinite]" />
  </>
)}
```

Añade a tu `tailwind.config.ts`:

```ts
extend: {
  keyframes: {
    'border-pulse': {
      '0%, 100%': { borderColor: 'rgba(var(--crm-primary-rgb), 0.4)' },
      '50%': { borderColor: 'rgba(var(--crm-primary-rgb), 0.8)' },
    },
  },
}
```

### 2. Gradient Shift en Hover

```tsx
<Link className="relative group ...">
  {/* Gradient que se mueve en hover */}
  <div className="absolute inset-0 bg-gradient-to-r from-crm-primary/0
                  via-crm-primary/10 to-crm-primary/0
                  opacity-0 group-hover:opacity-100
                  transition-opacity duration-500
                  bg-[length:200%_100%]
                  group-hover:animate-[gradient-shift_3s_ease_infinite]" />
</Link>
```

Keyframe:

```ts
'gradient-shift': {
  '0%, 100%': { backgroundPosition: '0% 50%' },
  '50%': { backgroundPosition: '100% 50%' },
},
```

---

## ⚡ Performance Optimizations

### 1. Usar will-change para animaciones frecuentes

```tsx
<aside
  style={{ willChange: collapsed ? 'width' : 'auto' }}
  className="..."
>
```

### 2. Lazy load del sidebar en móvil

```tsx
const [shouldRenderSidebar, setShouldRenderSidebar] = useState(false);

useEffect(() => {
  if (isOpen && !shouldRenderSidebar) {
    setShouldRenderSidebar(true);
  }
}, [isOpen]);

return (
  <>
    {/* Solo renderizar sidebar si isOpen o ya se renderizó una vez */}
    {(isOpen || shouldRenderSidebar) && (
      <aside className={cn(isOpen ? "..." : "hidden lg:block")}>
        {/* ... */}
      </aside>
    )}
  </>
);
```

---

## 📚 Resumen de Recomendaciones

### Para implementar AHORA (fácil, 5 minutos):
1. ✅ Mejorar overlay móvil con blur (Opción 1.C)
2. ✅ Añadir reduced motion support (Opción 1.B)
3. ✅ Mejorar easing (Opción 1.A)

### Para implementar PRÓXIMAMENTE (medio, 30 minutos):
1. ✅ Drawer Over Content (Opción 2)
2. ✅ Skeleton loading (Opción 4.C)
3. ✅ Glow pulse en active (Efectos CSS 1)

### Para experimentar DESPUÉS (avanzado, 2-3 horas):
1. ✅ Framer Motion completo (Opción 3)
2. ✅ Magnetic button (Opción 4.A)
3. ✅ Ripple effect (Opción 4.B)

¿Cuál te gustaría implementar primero?
