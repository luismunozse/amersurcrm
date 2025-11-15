"use client";

import { useState } from "react";
import ImageCarousel from "@/components/ImageCarousel";
import type { ProyectoMediaItem } from "@/types/proyectos";
import { BuildingOffice2Icon } from "@heroicons/react/24/outline";

interface ProyectoGaleriaProps {
  nombre: string;
  imagenUrl: string | null;
  logoUrl: string | null;
  galeriaItems: ProyectoMediaItem[];
}

export default function ProyectoGaleria({
  nombre,
  imagenUrl,
  logoUrl,
  galeriaItems,
}: ProyectoGaleriaProps) {
  const [isCarouselOpen, setIsCarouselOpen] = useState(false);
  const [carouselStartIndex, setCarouselStartIndex] = useState(0);

  const maxGalleryThumbs = Math.min(6, galeriaItems.length);
  const remainingGalleryItems = galeriaItems.length - maxGalleryThumbs;

  // Preparar todas las imágenes para el carrusel (incluyendo imagen principal)
  const allImages = [
    ...(imagenUrl ? [{ url: imagenUrl, nombre: `${nombre} - Imagen principal` }] : []),
    ...galeriaItems.map((item) => ({
      url: item.url,
      nombre: item.nombre || null,
    })),
  ];

  const openCarousel = (index: number) => {
    setCarouselStartIndex(index);
    setIsCarouselOpen(true);
  };

  const hasVisualAssets = Boolean(imagenUrl || logoUrl || galeriaItems.length > 0);

  if (!hasVisualAssets) return null;

  return (
    <>
      <div className="crm-card p-4 md:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)]">
          {/* Imagen Principal */}
          <div className="relative h-48 sm:h-60 rounded-2xl overflow-hidden bg-crm-card-hover">
            {imagenUrl ? (
              <button
                onClick={() => openCarousel(0)}
                className="h-full w-full group cursor-pointer focus:outline-none focus:ring-2 focus:ring-crm-primary rounded-2xl"
              >
                <img
                  src={imagenUrl}
                  alt={`Imagen principal de ${nombre}`}
                  className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white/90 p-3 rounded-full">
                    <svg
                      className="w-6 h-6 text-gray-800"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                      />
                    </svg>
                  </div>
                </div>
              </button>
            ) : (
              <div className="h-full w-full flex items-center justify-center text-crm-text-muted">
                <BuildingOffice2Icon className="w-14 h-14 text-crm-border" />
              </div>
            )}

            {/* Logo Overlay */}
            {logoUrl && (
              <div className="absolute bottom-4 left-4 rounded-2xl bg-white/90 dark:bg-white px-4 py-2 shadow-crm border border-black/5 dark:border-black/10 backdrop-blur">
                <img
                  src={logoUrl}
                  alt={`Logo de ${nombre}`}
                  className="h-12 w-auto object-contain dark:[filter:drop-shadow(0_0_6px_rgba(0,0,0,0.55))]"
                />
              </div>
            )}
          </div>

          {/* Galería de Miniaturas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-crm-text-primary uppercase tracking-[0.2em]">
                Galería
              </h3>
              <span className="text-xs text-crm-text-muted">
                {galeriaItems.length} {galeriaItems.length === 1 ? "imagen" : "imágenes"}
              </span>
            </div>

            {galeriaItems.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {galeriaItems.slice(0, maxGalleryThumbs).map((item, index) => {
                  const identifier = item.path ?? item.url ?? `${index}`;
                  const showOverlay = remainingGalleryItems > 0 && index === maxGalleryThumbs - 1;
                  // +1 porque la imagen principal está en el índice 0
                  const carouselIndex = imagenUrl ? index + 1 : index;

                  return (
                    <button
                      key={identifier}
                      onClick={() => openCarousel(carouselIndex)}
                      className="relative block rounded-xl overflow-hidden border border-crm-border/60 hover:border-crm-primary/40 transition-all group focus:outline-none focus:ring-2 focus:ring-crm-primary"
                    >
                      <img
                        src={item.url}
                        alt={item.nombre ?? `Imagen ${index + 1}`}
                        className="h-24 w-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      {showOverlay && (
                        <div className="absolute inset-0 bg-black/60 text-white text-sm font-semibold flex items-center justify-center">
                          <span className="text-xl">+{remainingGalleryItems}</span>
                        </div>
                      )}
                      {/* Hover Icon */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <svg
                            className="w-5 h-5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7"
                            />
                          </svg>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-crm-text-muted">
                No hay imágenes adicionales cargadas para este proyecto.
              </p>
            )}

            <p className="text-xs text-crm-text-muted">
              Haz clic en cualquier imagen para verla en grande. Usa ← → para navegar.
            </p>
          </div>
        </div>
      </div>

      {/* Carrusel Modal */}
      <ImageCarousel
        images={allImages}
        initialIndex={carouselStartIndex}
        isOpen={isCarouselOpen}
        onClose={() => setIsCarouselOpen(false)}
      />
    </>
  );
}
