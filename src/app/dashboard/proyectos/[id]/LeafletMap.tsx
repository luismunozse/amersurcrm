"use client";

import { useEffect } from "react";
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
    data?: any;
  }>;
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
function RotatedOverlay({ url, bounds, rotationDeg }: { url: string; bounds: [[number, number],[number, number]]; rotationDeg: number; }) {
  // Usamos SVGOverlay para que Leaflet mantenga el layer correctamente y rotamos el contenido dentro del SVG
  // Definimos un viewBox lógico 0..100 x 0..100 y rotamos alrededor del centro (50,50)
  return (
    <SVGOverlay bounds={bounds as any} attributes={{ viewBox: "0 0 100 100", preserveAspectRatio: "none" }} opacity={0.7 as any}>
      <image href={url} x="0" y="0" width="100" height="100" preserveAspectRatio="none" transform={`rotate(${rotationDeg}, 50, 50)`} />
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
}: LeafletMapProps) {
  // Bounds por defecto (caja de ~1-2km alrededor del centro)
  const defaultBounds: [[number, number], [number, number]] = [
    [defaultCenter[0] - 0.01, defaultCenter[1] - 0.01],
    [defaultCenter[0] + 0.01, defaultCenter[1] + 0.01],
  ];
  return (
    <MapContainer center={defaultCenter} zoom={defaultZoom} style={{ height: "100%", width: "100%" }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Overlay de imagen si existe plano */}
      {planosUrl && (
        <>
          {Math.abs(rotationDeg) < 0.01 && (
            <ImageOverlay
              url={planosUrl}
              bounds={overlayBounds || defaultBounds}
              opacity={overlayOpacity}
            />
          )}
          {Math.abs(rotationDeg) >= 0.01 && (
            <RotatedOverlay url={planosUrl} bounds={overlayBounds || defaultBounds} rotationDeg={rotationDeg} opacity={overlayOpacity} />
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

      {/* Marcadores de coordenadas generales */}
      {coordenadas.map((c) => (
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


