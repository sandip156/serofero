'use client';

import { MapContainer, TileLayer, Polyline, CircleMarker, Popup, useMap } from 'react-leaflet';
import type { LatLngExpression, LatLngBoundsExpression } from 'leaflet';
import { useEffect, useMemo } from 'react';

type LatLng = [number, number];

export type MapItem = {
  id: number;
  name: string;
  center?: LatLng;
  path?: LatLng[];
};

export default function ActivityMap({
  items,
  selectedId,
  onSelect,
}: {
  items: MapItem[];
  selectedId?: number;
  onSelect?: (id: number) => void;
}) {
  const points = items.map(i => i.center).filter(Boolean) as LatLng[];

  const bounds = useMemo<LatLngBoundsExpression | null>(() => {
    if (!points.length) return null;
    const lats = points.map(p => p[0]), lngs = points.map(p => p[1]);
    const sw: LatLng = [Math.min(...lats), Math.min(...lngs)];
    const ne: LatLng = [Math.max(...lats), Math.max(...lngs)];
    return [sw, ne];
  }, [JSON.stringify(points)]);

  return (
    <MapContainer
      className="h-[calc(100vh-8rem)] w-full rounded-xl overflow-hidden"
      center={points[0] ?? [27.7, 85.3]}
      zoom={8}
      scrollWheelZoom
    >
      <TileLayer
        // OSM tiles (free). Swap for Mapbox if you have a token.
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; OpenStreetMap contributors'
      />
      {bounds && <FitBounds bounds={bounds} />}

      {items.map(p => (
        <div key={p.id}>
          {p.path && (
            <Polyline positions={p.path as LatLngExpression[]} />
          )}
          {p.center && (
            <CircleMarker
              center={p.center as LatLngExpression}
              radius={p.id === selectedId ? 8 : 6}
              pathOptions={{ color: p.id === selectedId ? '#10b981' : '#16a34a', weight: p.id === selectedId ? 3 : 1, fillOpacity: 0.9 }}
              eventHandlers={{ click: () => onSelect?.(p.id) }}
            >
              <Popup>
                <div className="text-sm font-medium">{p.name}</div>
              </Popup>
            </CircleMarker>
          )}
        </div>
      ))}
    </MapContainer>
  );
}

function FitBounds({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [32, 32] });
  }, [map, bounds]);
  return null;
}
