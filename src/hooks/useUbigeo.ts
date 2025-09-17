import { useEffect, useState, useCallback } from "react";
import type { Departamento, Provincia, Distrito } from "@/lib/types/ubigeo";

export function useUbigeo() {
  const [deps, setDeps] = useState<Departamento[]>([]);
  const [provs, setProvs] = useState<Provincia[]>([]);
  const [dists, setDists] = useState<Distrito[]>([]);
  const [loading, setLoading] = useState(false);

  const loadDeps = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/ubigeo/departamentos");
      const data = await r.json();
      setDeps(data);
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProvs = useCallback(async (dep: string) => {
    if (!dep) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/ubigeo/provincias?dep=${dep}`);
      const data = await r.json();
      setProvs(data);
      setDists([]); // Limpiar distritos
    } catch (error) {
      console.error('Error cargando provincias:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDists = useCallback(async (prov: string) => {
    if (!prov) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/ubigeo/distritos?prov=${prov}`);
      const data = await r.json();
      setDists(data);
    } catch (error) {
      console.error('Error cargando distritos:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { 
    loadDeps(); 
  }, [loadDeps]);

  return { 
    deps, 
    provs, 
    dists, 
    loading,
    loadProvs, 
    loadDists 
  };
}
