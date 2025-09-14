"use client";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import ThemeToggle from "./ThemeToggle";
import { signOut } from "@/app/_actionsAuth";

export default function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="border-b bg-bg">
      <div className="mx-auto max-w-screen-2xl px-4 h-14 flex items-center gap-3">
        <button className="md:hidden" onClick={()=>setOpen(v=>!v)} aria-label="Abrir menú">☰</button>
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo-amersur.png" alt="AMERSUR" width={28} height={28} />
          <span className="font-display font-semibold tracking-wide">AMERSUR CRM</span>
        </Link>
        <nav className="hidden md:flex items-center gap-5 ml-6 text-sm">
          <Link href="/dashboard" className="hover:text-brand-600">Dashboard</Link>
          <Link href="/dashboard/clientes" className="hover:text-brand-600">Clientes</Link>
          <Link href="/dashboard/proyectos" className="hover:text-brand-600">Proyectos</Link>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <input placeholder="Buscar..." className="hidden md:block border rounded-xl px-3 py-1.5 w-72 bg-bg-muted" />
          <ThemeToggle/>
          <form action={signOut}>
            <button className="border rounded-xl px-3 py-1.5">Salir</button>
          </form>
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t px-4 py-2 space-y-2">
          <Link href="/dashboard" onClick={()=>setOpen(false)} className="block">Dashboard</Link>
          <Link href="/dashboard/clientes" onClick={()=>setOpen(false)} className="block">Clientes</Link>
          <Link href="/dashboard/proyectos" onClick={()=>setOpen(false)} className="block">Proyectos</Link>
        </div>
      )}
    </header>
  );
}
