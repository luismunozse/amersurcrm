"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { redirect } from "next/navigation"
import next from "next";

export default function Home() {
  redirect("/dashboard");
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase.from("crm.cliente").select("*").limit(10);
      setClientes(data || []);
    };
    fetchData();
  }, []);

  return (
    <main className="p-6">
      <h1 className="text-xl font-bold">Clientes</h1>
      <ul>
        {clientes.map((c) => (
          <li key={c.id}>{c.nombre} — {c.email}</li>
        ))}
      </ul>
    </main>
  );
}
