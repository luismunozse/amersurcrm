"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup, ImageOverlay, Rectangle, SVGOverlay } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix iconos por defecto de Leaflet cuando se usa con bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Coordenada {
  id: string;
  lat: number;
  lng: number;
  nombre: string;
}

interface LeafletMapProps {
  defaultCenter: [number, number];
  defaultZoom: number;
  coordenadas: Coordenada[];
  onMapClick: (lat: number, lng: number) => void;
  planosUrl?: string | null;
  overlayBounds?: [[number, number], [number, number]]; // [[southWestLat,lng],[northEastLat,lng]]
  calibrating?: boolean;
  onBoundsChange?: (bounds: [[number, number], [number, number]]) => void;
  rotationDeg?: number; // ángulo en grados
  overlayOpacity?: number;
  onToggleFull?: () => void;
  lotesConUbicacion?: Array<{
    id: string;
    codigo: string;
    estado?: string;
    data?: any;
  }>;
  onRotationChange?: (rotation: number) => void;
  onScaleChange?: (scale: number) => void;
  onOpacityChange?: (opacity: number) => void;
  onPanChange?: (panX: number, panY: number) => void;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  const map = useMap();

  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onMapClick(e.latlng.lat, e.latlng.lng);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onMapClick]);

  return null;
}

// Componente auxiliar para overlay rotado usando una imagen absoluta sobre el mapa
function RotatedOverlay({ url, bounds, rotationDeg, scale = 1, panX = 0, panY = 0 }: { 
  url: string; 
  bounds: [[number, number],[number, number]]; 
  rotationDeg: number; 
  scale?: number; 
  panX?: number; 
  panY?: number; 
}) {
  // Usamos SVGOverlay para que Leaflet mantenga el layer correctamente y rotamos el contenido dentro del SVG
  // Definimos un viewBox lógico 0..100 x 0..100 y rotamos alrededor del centro (50,50)
  const centerX = 50;
  const centerY = 50;
  
  // Para escalas menores a 1, expandimos el viewBox para mantener el plano completo visible
  const viewBoxSize = Math.max(100, 100 / scale);
  const viewBoxOffset = (viewBoxSize - 100) / 2;
  
  // La imagen siempre ocupa 100x100 en el viewBox expandido, con pan aplicado
  const imageX = viewBoxOffset + panX;
  const imageY = viewBoxOffset + panY;
  const imageWidth = 100;
  const imageHeight = 100;
  
  return (
    <SVGOverlay 
      bounds={bounds as any} 
      attributes={{ 
        viewBox: `0 0 ${viewBoxSize} ${viewBoxSize}`, 
        preserveAspectRatio: "none" 
      }} 
      opacity={0.7 as any}
    >
      <image 
        href={url} 
        x={imageX} 
        y={imageY} 
        width={imageWidth} 
        height={imageHeight} 
        preserveAspectRatio="none" 
        transform={`rotate(${rotationDeg}, ${centerX + viewBoxOffset}, ${centerY + viewBoxOffset})`} 
      />
    </SVGOverlay>
  );
}

export default function LeafletMap({
  defaultCenter,
  defaultZoom,
  coordenadas,
  onMapClick,
  planosUrl,
  overlayBounds,
  calibrating = false,
  onBoundsChange,
  rotationDeg = 0,
  overlayOpacity = 0.7,
  onToggleFull,
  lotesConUbicacion = [],
  onRotationChange,
  onScaleChange,
  onOpacityChange,
  onPanChange,
}: LeafletMapProps) {
  // Estado local para la escala del plano
  const [planeScale, setPlaneScale] = useState(1);
  // Estado local para el pan (desplazamiento) del plano
  const [planePan, setPlanePan] = useState({ x: 0, y: 0 });
  
  // Bounds por defecto (caja de ~1-2km alrededor del centro)
  const defaultBounds: [[number, number], [number, number]] = [
    [defaultCenter[0] - 0.01, defaultCenter[1] - 0.01],
    [defaultCenter[0] + 0.01, defaultCenter[1] + 0.01],
  ];
  return (
    <MapContainer 
      center={defaultCenter} 
      zoom={defaultZoom} 
      style={{ height: "100%", width: "100%" }}
      minZoom={3}
      maxZoom={20}
      zoomControl={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      touchZoom={true}
      boxZoom={true}
      keyboard={true}
      dragging={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        maxZoom={20}
        minZoom={3}
      />

      {/* Overlay de imagen si existe plano */}
      {planosUrl && (
        <>
          {Math.abs(rotationDeg) < 0.01 && Math.abs(planeScale - 1) < 0.01 && (
            <ImageOverlay
              url={planosUrl}
              bounds={overlayBounds || defaultBounds}
              opacity={overlayOpacity}
            />
          )}
          {(Math.abs(rotationDeg) >= 0.01 || Math.abs(planeScale - 1) >= 0.01 || Math.abs(planePan.x) >= 0.01 || Math.abs(planePan.y) >= 0.01) && (
            <RotatedOverlay 
              url={planosUrl} 
              bounds={overlayBounds || defaultBounds} 
              rotationDeg={rotationDeg} 
              scale={planeScale}
              panX={planePan.x}
              panY={planePan.y}
            />
          )}
        </>
      )}

      {/* UI de calibración visible aunque no haya plano */}
      {calibrating && (
        <>
          <Rectangle
            bounds={overlayBounds || defaultBounds}
            pathOptions={{ color: "#86901F", weight: 1, dashArray: "4 3" }}
          />
          <Marker
            draggable
            position={(overlayBounds || defaultBounds)[0]}
            eventHandlers={{
              dragend: (e) => {
                if (!onBoundsChange) return;
                const sw = (e.target as any).getLatLng();
                const ne = (overlayBounds || defaultBounds)[1];
                onBoundsChange([[sw.lat, sw.lng], [ne[0], ne[1]]]);
              }
            }}
          />
          <Marker
            draggable
            position={(overlayBounds || defaultBounds)[1]}
            eventHandlers={{
              dragend: (e) => {
                if (!onBoundsChange) return;
                const ne = (e.target as any).getLatLng();
                const sw = (overlayBounds || defaultBounds)[0];
                onBoundsChange([[sw[0], sw[1]], [ne.lat, ne.lng]]);
              }
            }}
          />
        </>
      )}

      {/* Marcadores de coordenadas generales - solo si no hay plano */}
      {!planosUrl && coordenadas.map((c) => (
        <Marker key={c.id} position={[c.lat, c.lng]}>
          <Popup>
            <div className="text-sm">
              <div className="font-semibold">{c.nombre}</div>
              <div>
                Lat: {c.lat.toFixed(6)} <br /> Lng: {c.lng.toFixed(6)}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Marcadores de lotes ubicados en el plano */}
      {lotesConUbicacion.map((lote) => {
        const data = lote.data ? 
          (typeof lote.data === 'string' ? JSON.parse(lote.data) : lote.data) : {};
        
        console.log('Procesando lote:', lote.codigo, 'Data:', data);
        
        const planoPoint = data.plano_point;
        if (!planoPoint || !Array.isArray(planoPoint) || planoPoint.length !== 2) {
          console.log('Lote sin ubicación válida:', lote.codigo);
          return null;
        }

        const [lat, lng] = planoPoint;
        console.log('Creando marcador para lote:', lote.codigo, 'en:', { lat, lng });
        
        // Determinar color según el estado del lote
        const getEstadoColor = (estado: string) => {
          switch (estado) {
            case 'disponible':
              return {
                background: 'linear-gradient(135deg, #10B981, #059669)',
                shadow: '0 4px 8px rgba(16, 185, 129, 0.3)',
                glow: '0 0 0 2px rgba(16, 185, 129, 0.2)'
              };
            case 'reservado':
              return {
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                shadow: '0 4px 8px rgba(245, 158, 11, 0.3)',
                glow: '0 0 0 2px rgba(245, 158, 11, 0.2)'
              };
            case 'vendido':
              return {
                background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                shadow: '0 4px 8px rgba(239, 68, 68, 0.3)',
                glow: '0 0 0 2px rgba(239, 68, 68, 0.2)'
              };
            default:
              return {
                background: 'linear-gradient(135deg, #6B7280, #4B5563)',
                shadow: '0 4px 8px rgba(107, 114, 128, 0.3)',
                glow: '0 0 0 2px rgba(107, 114, 128, 0.2)'
              };
          }
        };

        const estadoColors = getEstadoColor(lote.estado || 'disponible');

        // Crear icono personalizado para lotes con pin de ubicación
        const loteIcon = L.divIcon({
          className: 'lote-marker',
          html: `
            <div style="
              background: ${estadoColors.background};
              color: white;
              border: 3px solid white;
              border-radius: 50% 50% 50% 0;
              width: 40px;
              height: 40px;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 18px;
              font-weight: bold;
              box-shadow: ${estadoColors.shadow}, ${estadoColors.glow};
              position: relative;
              animation: pulse 2s infinite;
              transform: rotate(-45deg);
            ">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{transform: 'rotate(45deg)'}}>
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              <style>
                @keyframes pulse {
                  0% { transform: rotate(-45deg) scale(1); }
                  50% { transform: rotate(-45deg) scale(1.05); }
                  100% { transform: rotate(-45deg) scale(1); }
                }
              </style>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
          popupAnchor: [0, -20]
        });

        // Función para obtener el color del estado
        const getEstadoTextColor = (estado: string) => {
          switch (estado) {
            case 'disponible': return 'text-green-600';
            case 'reservado': return 'text-yellow-600';
            case 'vendido': return 'text-red-600';
            default: return 'text-gray-600';
          }
        };

        const getEstadoBgColor = (estado: string) => {
          switch (estado) {
            case 'disponible': return 'bg-green-100';
            case 'reservado': return 'bg-yellow-100';
            case 'vendido': return 'bg-red-100';
            default: return 'bg-gray-100';
          }
        };

        return (
          <Marker key={`lote-${lote.id}`} position={[lat, lng]} icon={loteIcon}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold text-gray-800">Lote {lote.codigo}</div>
                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getEstadoBgColor(lote.estado || 'disponible')} ${getEstadoTextColor(lote.estado || 'disponible')}`}>
                  {lote.estado === 'disponible' ? 'Disponible' : 
                   lote.estado === 'reservado' ? 'Reservado' : 
                   lote.estado === 'vendido' ? 'Vendido' : 
                   lote.estado || 'Desconocido'}
                </div>
                <div className="text-gray-600 mt-2">
                  Ubicado en el plano
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Lat: {lat.toFixed(6)} <br /> 
                  Lng: {lng.toFixed(6)}
                </div>
                {data.ubicacion_plano?.fecha_ubicacion && (
                  <div className="text-xs text-gray-500 mt-1">
                    Ubicado: {new Date(data.ubicacion_plano.fecha_ubicacion).toLocaleDateString()}
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}

      <MapClickHandler onMapClick={onMapClick} />
      <FitOnUpdate bounds={overlayBounds} markers={coordenadas} />
      <ZoomFullControl onToggleFull={onToggleFull} />
      <ZoomLevelIndicator />
      {planosUrl && (
        <Plane3DControl 
          rotationDeg={rotationDeg}
          overlayOpacity={overlayOpacity}
          planeScale={planeScale}
          planePan={planePan}
          onRotationChange={onRotationChange}
          onScaleChange={(scale) => {
            setPlaneScale(scale);
            onScaleChange?.(scale);
          }}
          onOpacityChange={onOpacityChange}
          onPanChange={(x, y) => {
            setPlanePan({ x, y });
            onPanChange?.(x, y);
          }}
        />
      )}
    </MapContainer>
  );
}

// Ajuste automático de vista cuando hay bounds o marcadores
function FitOnUpdate({ bounds, markers }: { bounds?: [[number, number],[number, number]]; markers?: Coordenada[] }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      // Fit a los bounds del overlay
      const sw = L.latLng(bounds[0][0], bounds[0][1]);
      const ne = L.latLng(bounds[1][0], bounds[1][1]);
      map.fitBounds(L.latLngBounds(sw, ne), { padding: [20, 20] });
      return;
    }
    if (markers && markers.length > 0) {
      const latlngs = markers.map(m => L.latLng(m.lat, m.lng));
      map.fitBounds(L.latLngBounds(latlngs), { padding: [20, 20] });
    }
  }, [map, bounds ? JSON.stringify(bounds) : "", markers ? JSON.stringify(markers) : ""]);
  return null;
}

// Control de Zoom (+/-) y Full dentro del mapa
function ZoomFullControl({ onToggleFull }: { onToggleFull?: () => void }) {
  const map = useMap();
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar');
        div.style.background = 'var(--crm-card)';
        div.style.border = `1px solid var(--crm-border)`;
        div.style.borderRadius = '8px';
        div.style.overflow = 'hidden';
        const mkBtn = (label: string, title: string, onClick: () => void) => {
          const a = L.DomUtil.create('a', '', div);
          a.href = '#';
          a.title = title;
          a.innerHTML = label;
          a.style.display = 'block';
          a.style.width = '32px';
          a.style.height = '32px';
          a.style.lineHeight = '32px';
          a.style.textAlign = 'center';
          a.style.color = 'var(--crm-text-primary)';
          a.style.background = 'var(--crm-card)';
          a.onmouseenter = () => a.style.background = 'var(--crm-card-hover)';
          a.onmouseleave = () => a.style.background = 'var(--crm-card)';
          L.DomEvent.on(a, 'click', (e: any) => { L.DomEvent.stop(e); onClick(); });
          return a;
        };
        mkBtn('+', 'Acercar', () => map.zoomIn());
        mkBtn('–', 'Alejar', () => map.zoomOut());
        mkBtn('⌂', 'Centrar', () => {
          if (overlayBounds) {
            const sw = L.latLng(overlayBounds[0][0], overlayBounds[0][1]);
            const ne = L.latLng(overlayBounds[1][0], overlayBounds[1][1]);
            map.fitBounds(L.latLngBounds(sw, ne), { padding: [20, 20] });
          } else {
            map.setView(defaultCenter, defaultZoom);
          }
        });
        mkBtn('⤢', 'Pantalla completa', () => { onToggleFull && onToggleFull(); });
        return div;
      },
      onRemove: function () {}
    });
    const ctl = new Control({ position: 'topright' });
    map.addControl(ctl as any);
    return () => { map.removeControl(ctl as any); };
  }, [map, onToggleFull]);
  return null;
}

// Indicador de nivel de zoom
function ZoomLevelIndicator() {
  const map = useMap();
  const [zoomLevel, setZoomLevel] = useState(map.getZoom());

  useEffect(() => {
    const updateZoom = () => setZoomLevel(map.getZoom());
    
    map.on('zoomend', updateZoom);
    return () => map.off('zoomend', updateZoom);
  }, [map]);

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar');
        div.style.background = 'var(--crm-card)';
        div.style.border = `1px solid var(--crm-border)`;
        div.style.borderRadius = '8px';
        div.style.padding = '8px 12px';
        div.style.fontSize = '12px';
        div.style.fontWeight = 'bold';
        div.style.color = 'var(--crm-text-primary)';
        div.innerHTML = `Zoom: ${zoomLevel.toFixed(1)}`;
        return div;
      },
      onRemove: function () {}
    });
    
    const ctl = new Control({ position: 'bottomright' });
    map.addControl(ctl as any);
    return () => { map.removeControl(ctl as any); };
  }, [map, zoomLevel]);

  return null;
}

// Control 3D para el plano - rotación, escala, opacidad y posición
function Plane3DControl({ 
  rotationDeg, 
  overlayOpacity, 
  planeScale,
  planePan,
  onRotationChange, 
  onScaleChange, 
  onOpacityChange,
  onPanChange
}: { 
  rotationDeg: number; 
  overlayOpacity: number; 
  planeScale: number;
  planePan: { x: number; y: number };
  onRotationChange?: (rotation: number) => void; 
  onScaleChange?: (scale: number) => void; 
  onOpacityChange?: (opacity: number) => void; 
  onPanChange?: (x: number, y: number) => void; 
}) {
  const map = useMap();

  useEffect(() => {
    const Control = L.Control.extend({
      onAdd: function () {
        const div = L.DomUtil.create('div', 'leaflet-bar plane-3d-control');
        div.style.background = 'var(--crm-card)';
        div.style.border = `1px solid var(--crm-border)`;
        div.style.borderRadius = '8px';
        div.style.padding = '12px';
        div.style.minWidth = '200px';
        div.style.fontSize = '12px';
        div.style.color = 'var(--crm-text-primary)';
        div.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';

        // Título
        const title = L.DomUtil.create('div', '', div);
        title.innerHTML = '<strong>🎯 Control 3D del Plano</strong>';
        title.style.marginBottom = '8px';
        title.style.textAlign = 'center';

        // Control de Rotación
        const rotationDiv = L.DomUtil.create('div', '', div);
        rotationDiv.style.marginBottom = '8px';
        
        const rotationLabel = L.DomUtil.create('label', '', rotationDiv);
        rotationLabel.innerHTML = `🔄 Rotación: ${rotationDeg.toFixed(0)}°`;
        rotationLabel.style.display = 'block';
        rotationLabel.style.marginBottom = '4px';
        rotationLabel.style.fontSize = '11px';
        
        const rotationSlider = L.DomUtil.create('input', '', rotationDiv);
        rotationSlider.type = 'range';
        rotationSlider.min = '0';
        rotationSlider.max = '360';
        rotationSlider.value = rotationDeg.toString();
        rotationSlider.style.width = '100%';
        rotationSlider.style.height = '4px';
        rotationSlider.style.background = 'var(--crm-border)';
        rotationSlider.style.outline = 'none';
        rotationSlider.style.borderRadius = '2px';
        
        rotationSlider.oninput = (e: any) => {
          const value = parseFloat(e.target.value);
          onRotationChange?.(value);
        };

        // Control de Escala
        const scaleDiv = L.DomUtil.create('div', '', div);
        scaleDiv.style.marginBottom = '8px';
        
        const scaleLabel = L.DomUtil.create('label', '', scaleDiv);
        scaleLabel.innerHTML = `📏 Escala: ${(planeScale * 100).toFixed(0)}%`;
        scaleLabel.style.display = 'block';
        scaleLabel.style.marginBottom = '4px';
        scaleLabel.style.fontSize = '11px';
        
        const scaleSlider = L.DomUtil.create('input', '', scaleDiv);
        scaleSlider.type = 'range';
        scaleSlider.min = '0.1';
        scaleSlider.max = '3';
        scaleSlider.step = '0.1';
        scaleSlider.value = planeScale.toString();
        scaleSlider.style.width = '100%';
        scaleSlider.style.height = '4px';
        scaleSlider.style.background = 'var(--crm-border)';
        scaleSlider.style.outline = 'none';
        scaleSlider.style.borderRadius = '2px';
        
        scaleSlider.oninput = (e: any) => {
          const value = parseFloat(e.target.value);
          onScaleChange?.(value);
        };

        // Control de Opacidad
        const opacityDiv = L.DomUtil.create('div', '', div);
        opacityDiv.style.marginBottom = '8px';
        
        const opacityLabel = L.DomUtil.create('label', '', opacityDiv);
        opacityLabel.innerHTML = `👁️ Opacidad: ${(overlayOpacity * 100).toFixed(0)}%`;
        opacityLabel.style.display = 'block';
        opacityLabel.style.marginBottom = '4px';
        opacityLabel.style.fontSize = '11px';
        
        const opacitySlider = L.DomUtil.create('input', '', opacityDiv);
        opacitySlider.type = 'range';
        opacitySlider.min = '0';
        opacitySlider.max = '1';
        opacitySlider.step = '0.1';
        opacitySlider.value = overlayOpacity.toString();
        opacitySlider.style.width = '100%';
        opacitySlider.style.height = '4px';
        opacitySlider.style.background = 'var(--crm-border)';
        opacitySlider.style.outline = 'none';
        opacitySlider.style.borderRadius = '2px';
        
        opacitySlider.oninput = (e: any) => {
          const value = parseFloat(e.target.value);
          onOpacityChange?.(value);
        };

        // Control de Posición (Pan)
        const panDiv = L.DomUtil.create('div', '', div);
        panDiv.style.marginBottom = '8px';
        
        const panLabel = L.DomUtil.create('label', '', panDiv);
        panLabel.innerHTML = `📍 Posición: X:${planePan.x.toFixed(1)} Y:${planePan.y.toFixed(1)}`;
        panLabel.style.display = 'block';
        panLabel.style.marginBottom = '4px';
        panLabel.style.fontSize = '11px';
        
        // Controles de Pan con botones direccionales
        const panControlsDiv = L.DomUtil.create('div', '', panDiv);
        panControlsDiv.style.display = 'grid';
        panControlsDiv.style.gridTemplateColumns = '1fr 1fr 1fr';
        panControlsDiv.style.gap = '2px';
        panControlsDiv.style.marginBottom = '4px';
        
        // Botones de dirección
        const directions = [
          { key: 'up', label: '↑', x: 0, y: -5 },
          { key: 'left', label: '←', x: -5, y: 0 },
          { key: 'center', label: '⌂', x: 0, y: 0 },
          { key: 'right', label: '→', x: 5, y: 0 },
          { key: 'down', label: '↓', x: 0, y: 5 }
        ];
        
        directions.forEach(dir => {
          const btn = L.DomUtil.create('button', '', panControlsDiv);
          btn.innerHTML = dir.label;
          btn.style.padding = '4px';
          btn.style.fontSize = '10px';
          btn.style.border = '1px solid var(--crm-border)';
          btn.style.borderRadius = '4px';
          btn.style.background = 'var(--crm-card)';
          btn.style.color = 'var(--crm-text-primary)';
          btn.style.cursor = 'pointer';
          btn.style.minHeight = '24px';
          
          if (dir.key === 'center') {
            btn.style.gridColumn = '2';
            btn.style.gridRow = '2';
          } else if (dir.key === 'up') {
            btn.style.gridColumn = '2';
            btn.style.gridRow = '1';
          } else if (dir.key === 'down') {
            btn.style.gridColumn = '2';
            btn.style.gridRow = '3';
          } else if (dir.key === 'left') {
            btn.style.gridColumn = '1';
            btn.style.gridRow = '2';
          } else if (dir.key === 'right') {
            btn.style.gridColumn = '3';
            btn.style.gridRow = '2';
          }
          
          btn.onclick = () => {
            const newX = dir.x === 0 ? 0 : planePan.x + dir.x;
            const newY = dir.y === 0 ? 0 : planePan.y + dir.y;
            onPanChange?.(newX, newY);
          };
        });

        // Botones de reset
        const resetDiv = L.DomUtil.create('div', '', div);
        resetDiv.style.display = 'flex';
        resetDiv.style.gap = '4px';
        resetDiv.style.marginTop = '8px';
        
        const resetRotation = L.DomUtil.create('button', '', resetDiv);
        resetRotation.innerHTML = '🔄';
        resetRotation.style.flex = '1';
        resetRotation.style.padding = '4px 8px';
        resetRotation.style.fontSize = '10px';
        resetRotation.style.border = '1px solid var(--crm-border)';
        resetRotation.style.borderRadius = '4px';
        resetRotation.style.background = 'var(--crm-card)';
        resetRotation.style.color = 'var(--crm-text-primary)';
        resetRotation.style.cursor = 'pointer';
        resetRotation.title = 'Reset Rotación';
        
        resetRotation.onclick = () => {
          rotationSlider.value = '0';
          onRotationChange?.(0);
        };

        const resetScale = L.DomUtil.create('button', '', resetDiv);
        resetScale.innerHTML = '📏';
        resetScale.style.flex = '1';
        resetScale.style.padding = '4px 8px';
        resetScale.style.fontSize = '10px';
        resetScale.style.border = '1px solid var(--crm-border)';
        resetScale.style.borderRadius = '4px';
        resetScale.style.background = 'var(--crm-card)';
        resetScale.style.color = 'var(--crm-text-primary)';
        resetScale.style.cursor = 'pointer';
        resetScale.title = 'Reset Escala';
        
        resetScale.onclick = () => {
          scaleSlider.value = '1';
          onScaleChange?.(1);
        };

        const resetPan = L.DomUtil.create('button', '', resetDiv);
        resetPan.innerHTML = '📍';
        resetPan.style.flex = '1';
        resetPan.style.padding = '4px 8px';
        resetPan.style.fontSize = '10px';
        resetPan.style.border = '1px solid var(--crm-border)';
        resetPan.style.borderRadius = '4px';
        resetPan.style.background = 'var(--crm-card)';
        resetPan.style.color = 'var(--crm-text-primary)';
        resetPan.style.cursor = 'pointer';
        resetPan.title = 'Reset Posición';
        
        resetPan.onclick = () => {
          onPanChange?.(0, 0);
        };

        // Estilos para los sliders
        const style = L.DomUtil.create('style', '', div);
        style.innerHTML = `
          .plane-3d-control input[type="range"]::-webkit-slider-thumb {
            appearance: none;
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--crm-primary);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .plane-3d-control input[type="range"]::-moz-range-thumb {
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: var(--crm-primary);
            cursor: pointer;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          .plane-3d-control button:hover {
            background: var(--crm-card-hover);
          }
        `;

        return div;
      },
      onRemove: function () {}
    });
    
    const ctl = new Control({ position: 'topleft' });
    map.addControl(ctl as any);
    return () => { map.removeControl(ctl as any); };
  }, [map, rotationDeg, overlayOpacity, planeScale, planePan, onRotationChange, onScaleChange, onOpacityChange, onPanChange]);

  return null;
}


