"use client";
import { signOut } from "@/app/_actionsAuth"; // opcional si ya la tenés
export default function Topbar({ onMenu }: { onMenu: () => void }) {
  return (
    <header className="h-14 border-b bg-bg flex items-center">
      <div className="mx-auto max-w-6xl w-full px-4 flex items-center gap-3">
        <button className="lg:hidden" onClick={onMenu} aria-label="Abrir menú">☰</button>
        <div className="ml-auto flex items-center gap-3">
          <input placeholder="Buscar..." className="hidden md:block border rounded-xl px-3 py-1.5 w-64 bg-bg-muted" />
          <form action={signOut}>
            <button className="border rounded-xl px-3 py-1.5">Salir</button>
          </form>
        </div>
      </div>
    </header>
  );
}
