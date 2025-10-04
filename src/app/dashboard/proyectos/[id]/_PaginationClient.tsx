"use client";

import { useRouter } from "next/navigation";
import { Pagination } from "@/components/Pagination";

interface PaginationClientProps {
  currentPage: number;
  totalPages: number;
  proyectoId: string;
  q?: string;
  estado?: string;
}

export function PaginationClient({
  currentPage,
  totalPages,
  proyectoId,
  q,
  estado,
}: PaginationClientProps) {
  const router = useRouter();

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (estado && estado !== "all") params.set("estado", estado);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const url = queryString
      ? `/dashboard/proyectos/${proyectoId}?${queryString}`
      : `/dashboard/proyectos/${proyectoId}`;

    router.push(url);
  };

  return (
    <Pagination
      currentPage={currentPage}
      totalPages={totalPages}
      onPageChange={handlePageChange}
    />
  );
}
