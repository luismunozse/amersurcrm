"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, useMap, Marker, Popup, ImageOverlay, Rectangle, SVGOverlay, Polygon } from "react-leaflet";
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
  lotePolygons?: Record<string, [number, number][]>; // id -> array de [lat,lng]
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
  lotePolygons,
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
              opacity={0.7}
            />
          )}
          {Math.abs(rotationDeg) >= 0.01 && (
            <RotatedOverlay url={planosUrl} bounds={overlayBounds || defaultBounds} rotationDeg={rotationDeg} />
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

      <MapClickHandler onMapClick={onMapClick} />
      <FitOnUpdate bounds={overlayBounds} markers={coordenadas} />

      {/* Polígonos de lotes vinculados al plano */}
      {lotePolygons && Object.entries(lotePolygons).map(([id, pts]) => (
        pts.length >= 3 ? (
          <Polygon key={id} positions={pts as any} pathOptions={{ color: '#2563eb', weight: 2, fillOpacity: 0.15 }} />
        ) : null
      ))}
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


