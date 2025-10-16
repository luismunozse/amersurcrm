"use client";

import { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize2, Minimize2, RotateCw, X, Move } from "lucide-react";

interface PlanosViewerProps {
  planosUrl: string;
  proyectoNombre: string;
  fileType: "image" | "svg" | "pdf";
}

export default function PlanosViewer({ planosUrl, proyectoNombre, fileType }: PlanosViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | HTMLObjectElement>(null);

  // Zoom controls
  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  };

  const handleResetZoom = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
    setRotation(0);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Pan/Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return; // Only allow dragging when zoomed in
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Touch support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scale <= 1) return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y,
    });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    setPosition({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setScale((prev) => Math.max(0.5, Math.min(5, prev + delta)));
  };

  // Listen for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // PDF case - just show link
  if (fileType === "pdf") {
    return (
      <div className="relative rounded-lg overflow-hidden border border-crm-border bg-gray-50">
        <div className="w-full h-96 flex items-center justify-center">
          <div className="text-center">
            <svg
              className="w-16 h-16 text-crm-text-muted mx-auto mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm text-crm-text-muted mb-2">Documento PDF</p>
            <a
              href={planosUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-crm-primary text-white rounded-lg hover:bg-crm-primary-hover transition-colors"
            >
              <Maximize2 className="w-4 h-4" />
              Ver PDF
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative rounded-lg overflow-hidden border border-crm-border bg-gray-50 ${
        isFullscreen ? "bg-black" : ""
      }`}
    >
      {/* Controls */}
      <div className="absolute top-4 right-4 z-10 flex flex-col gap-2">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-2 flex flex-col gap-1">
          <button
            onClick={handleZoomIn}
            className="p-2 hover:bg-crm-primary/10 rounded transition-colors group"
            title="Acercar (Zoom In)"
          >
            <ZoomIn className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 hover:bg-crm-primary/10 rounded transition-colors group"
            title="Alejar (Zoom Out)"
          >
            <ZoomOut className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
          </button>
          <button
            onClick={handleRotate}
            className="p-2 hover:bg-crm-primary/10 rounded transition-colors group"
            title="Rotar 90°"
          >
            <RotateCw className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-2 hover:bg-crm-primary/10 rounded transition-colors group"
            title={isFullscreen ? "Salir de Pantalla Completa" : "Pantalla Completa"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
            ) : (
              <Maximize2 className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
            )}
          </button>
          <div className="h-px bg-crm-border my-1"></div>
          <button
            onClick={handleResetZoom}
            className="p-2 hover:bg-crm-primary/10 rounded transition-colors group"
            title="Reiniciar Vista"
          >
            <X className="w-5 h-5 text-crm-text-primary group-hover:text-crm-primary" />
          </button>
        </div>
      </div>

      {/* Zoom indicator */}
      <div className="absolute top-4 left-4 z-10">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 text-sm font-medium text-crm-text-primary">
          {Math.round(scale * 100)}%
        </div>
      </div>

      {/* Drag hint */}
      {scale > 1 && !isDragging && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-sm rounded-lg shadow-lg px-3 py-2 text-xs text-crm-text-muted flex items-center gap-2">
            <Move className="w-3 h-3" />
            Arrastra para mover
          </div>
        </div>
      )}

      {/* Image container */}
      <div
        className={`w-full h-96 flex items-center justify-center overflow-hidden ${
          isFullscreen ? "h-screen" : ""
        } ${scale > 1 ? "cursor-move" : "cursor-default"}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
      >
        {fileType === "svg" ? (
          <object
            ref={imageRef as React.RefObject<HTMLObjectElement>}
            data={planosUrl}
            type="image/svg+xml"
            className="max-w-full max-h-full select-none"
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${
                position.y / scale
              }px)`,
              transformOrigin: "center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
            aria-label={`Planos SVG de ${proyectoNombre}`}
          >
            <img
              src={planosUrl}
              alt={`Planos de ${proyectoNombre}`}
              className="max-w-full max-h-full select-none"
              style={{
                transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${
                  position.y / scale
                }px)`,
                transformOrigin: "center",
                transition: isDragging ? "none" : "transform 0.2s ease-out",
              }}
            />
          </object>
        ) : (
          <img
            ref={imageRef as React.RefObject<HTMLImageElement>}
            src={planosUrl}
            alt={`Planos de ${proyectoNombre}`}
            className="max-w-full max-h-full select-none"
            draggable={false}
            style={{
              transform: `scale(${scale}) rotate(${rotation}deg) translate(${position.x / scale}px, ${
                position.y / scale
              }px)`,
              transformOrigin: "center",
              transition: isDragging ? "none" : "transform 0.2s ease-out",
            }}
          />
        )}
      </div>
    </div>
  );
}
