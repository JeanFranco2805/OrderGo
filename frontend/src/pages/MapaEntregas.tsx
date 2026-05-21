import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Crosshair, Navigation, Package } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { orderApi, type Order } from '../services/orderService';
import { formatCOP } from '../utils/currency';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import L from 'leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import '../styles/pages.css';

// Fix default marker icon in webpack/vite
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Yellow marker for orders
const yellowIcon = new L.Icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  className: 'yellow-marker-icon',
});

// Blue marker for user location
const blueSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" width="30" height="40">
  <path fill="#3b82f6" stroke="#1d4ed8" stroke-width="20" d="M384 192c0 87.4-117 243-168.3 307.2-12.3 15.3-35.1 15.3-47.4 0C117 435 0 279.4 0 192 0 86 86 0 192 0s192 86 192 192z"/>
  <circle cx="192" cy="192" r="60" fill="#fff"/>
  <circle cx="192" cy="192" r="25" fill="#3b82f6"/>
</svg>`;

const blueIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(blueSvg),
  iconSize: [30, 40],
  iconAnchor: [15, 40],
  popupAnchor: [0, -40],
});

interface GeoOrder extends Order {
  lat?: number;
  lng?: number;
  geocodeError?: boolean;
}

// Helper to fly map to user location
function MapController({ flyTo }: { flyTo?: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (flyTo) {
      map.flyTo(flyTo, 15, { duration: 1.5 });
    }
  }, [flyTo, map]);
  return null;
}

// Haversine distance in km
function haversine(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Known municipality centers for Atlántico as ultimate fallback
const MUNICIPALITY_CENTERS: Record<string, [number, number]> = {
  barranquilla: [10.9685, -74.7813],
  soledad: [10.907, -74.765],
  malambo: [10.85, -74.75],
};

function getMunicipalityFallback(addr: string): [number, number] | null {
  const lower = addr.toLowerCase();
  for (const [name, coords] of Object.entries(MUNICIPALITY_CENTERS)) {
    if (lower.includes(name)) return coords;
  }
  return null;
}

async function nominatimSearch(query: string): Promise<{ lat: string; lon: string } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=co&accept-language=es`,
      {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'OrderGo-SweetFlow/1.0 (contact@ordergo.local)',
        },
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json && json.length > 0) {
      return { lat: json[0].lat, lon: json[0].lon };
    }
  } catch (e) {
    // Nominatim error (network, timeout, bad JSON) — keep going
  }
  return null;
}

function extractStreet(addr: string): string | null {
  // Match "Carrera 4B Sur #48-1" → "Carrera 4B Sur"
  const m = addr.match(/^(.+?)\s+#\s*/);
  return m ? m[1].trim() : null;
}

function extractCity(addr: string): string | null {
  // "Carrera 4B Sur #48-1, Barranquilla, Atlántico, Colombia" → "Barranquilla"
  const parts = addr.split(',').map((s) => s.trim());
  if (parts.length >= 3) {
    // parts[0] = street, parts[1] = city, parts[2] = state
    return parts[1];
  }
  if (parts.length === 2) return parts[1];
  return null;
}

async function geocodeAddress(addr: string): Promise<{ lat: number; lng: number; exact?: boolean } | { geocodeError: true; fallbackLat: number; fallbackLng: number }> {
  const fullQuery = addr.toLowerCase().endsWith(', colombia') ? addr : addr + ', Colombia';

  // 1) Try full address
  const full = await nominatimSearch(fullQuery);
  if (full) return { lat: parseFloat(full.lat), lng: parseFloat(full.lon), exact: true };

  // 2) Try street only (drop house number after #)
  const streetOnly = extractStreet(addr);
  if (streetOnly) {
    const city = extractCity(addr);
    const streetQuery = city ? `${streetOnly}, ${city}, Atlántico, Colombia` : `${streetOnly}, Colombia`;
    const streetRes = await nominatimSearch(streetQuery);
    if (streetRes) return { lat: parseFloat(streetRes.lat), lng: parseFloat(streetRes.lon) };
  }

  // 3) Try city center
  const city = extractCity(addr);
  if (city) {
    const cityRes = await nominatimSearch(`${city}, Atlántico, Colombia`);
    if (cityRes) return { lat: parseFloat(cityRes.lat), lng: parseFloat(cityRes.lon) };
  }

  // 4) Hardcoded municipality centers — GUARANTEED to return coordinates for known cities
  const hardcoded = getMunicipalityFallback(addr);
  if (hardcoded) {
    return { geocodeError: true, fallbackLat: hardcoded[0], fallbackLng: hardcoded[1] };
  }

  // Ultimate fallback: Barranquilla center
  return { geocodeError: true, fallbackLat: 10.9685, fallbackLng: -74.7813 };
}

export default function MapaEntregas() {
  const [orders, setOrders] = useState<GeoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userError, setUserError] = useState('');
  const [flyTarget, setFlyTarget] = useState<[number, number] | undefined>(undefined);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await orderApi.getPendingDeliveries();
        const withCoords: GeoOrder[] = [];
        for (const o of data) {
          if (!o.deliveryAddress) continue;
          try {
            const result = await geocodeAddress(o.deliveryAddress.trim());
            if ('geocodeError' in result) {
              withCoords.push({
                ...o,
                geocodeError: true,
                lat: result.fallbackLat,
                lng: result.fallbackLng,
              });
            } else {
              withCoords.push({ ...o, lat: result.lat, lng: result.lng });
            }
          } catch {
            // If everything fails even with try/catch, force Barranquilla center
            withCoords.push({
              ...o,
              geocodeError: true,
              lat: 10.9685,
              lng: -74.7813,
            });
          }
          // Nominatim policy: max 1 request per second
          await new Promise((r) => setTimeout(r, 1100));
        }
        setOrders(withCoords);
      } catch {
        setError('No se pudo cargar los pedidos pendientes.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const locateUser = () => {
    setUserError('');
    if (!navigator.geolocation) {
      setUserError('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget([loc.lat, loc.lng]);
      },
      (err) => {
        if (err.code === 1) setUserError('Permiso de ubicación denegado. Activa la ubicación en tu navegador.');
        else if (err.code === 2) setUserError('No se pudo obtener tu ubicación. Verifica tu GPS/conexión.');
        else setUserError('Error obteniendo tu ubicación.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const validOrders = orders.filter((o) => o.lat !== undefined && o.lng !== undefined);
  const failedOrders = orders.filter((o) => o.geocodeError);

  const center: [number, number] = userLocation
    ? [userLocation.lat, userLocation.lng]
    : validOrders.length > 0
    ? [validOrders[0].lat!, validOrders[0].lng!]
    : [10.9685, -74.7813]; // Barranquilla default

  const routePolyline = selectedRoute
    ? validOrders.find((o) => o.id === selectedRoute)
    : null;

  const routePositions: [number, number][] =
    userLocation && routePolyline
      ? [
          [userLocation.lat, userLocation.lng],
          [routePolyline.lat!, routePolyline.lng!],
        ]
      : [];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Mapa de entregas</h1>
          <p>Ubicación de pedidos pendientes y en preparación</p>
        </div>
        <button className="btn btn-primary" onClick={locateUser}>
          <Crosshair size={18} strokeWidth={1.5} /> Mi ubicación
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fef2f2', color: '#b91c1c', fontSize: '0.88rem', marginBottom: 16 }}>
          {error}
        </div>
      )}

      {userError && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.88rem', marginBottom: 16 }}>
          {userError}
        </div>
      )}

      {failedOrders.length > 0 && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.88rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={16} strokeWidth={1.5} />
          {failedOrders.length} dirección(es) mostradas en el centro del municipio (ubicación aproximada).
        </div>
      )}

      {userLocation && routePolyline && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '0.88rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Navigation size={16} strokeWidth={1.5} />
          Distancia al pedido {routePolyline.orderNumber}: <strong>{haversine(userLocation.lat, userLocation.lng, routePolyline.lat!, routePolyline.lng!).toFixed(2)} km</strong>
          <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.78rem', marginLeft: 'auto' }} onClick={() => setSelectedRoute(null)}>Ocultar ruta</button>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="page-placeholder" style={{ height: 500 }}>
            <div style={{ width: 40, height: 40, border: '3px solid var(--color-border)', borderTopColor: 'var(--color-accent)', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }} />
            <p>Cargando mapa...</p>
          </div>
        ) : validOrders.length === 0 ? (
          <div className="page-placeholder" style={{ height: 500 }}>
            <MapPin size={48} strokeWidth={1} color="#d1d5db" />
            <h2>Sin pedidos pendientes</h2>
            <p>No hay pedidos con dirección de entrega para mostrar en el mapa</p>
          </div>
        ) : (
          <MapContainer center={center} zoom={13} style={{ height: 500, width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapController flyTo={flyTarget} />

            {/* User location marker */}
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={blueIcon}>
                <Popup><strong>Tu ubicación</strong></Popup>
              </Marker>
            )}

            {/* Route line */}
            {routePositions.length === 2 && (
              <Polyline positions={routePositions} color="#4f46e5" weight={4} opacity={0.8} dashArray="10, 10" />
            )}

            {/* Order markers with clustering */}
            <MarkerClusterGroup>
              {validOrders.map((o) => (
                <Marker key={o.id} position={[o.lat!, o.lng!]} icon={yellowIcon}>
                  <Popup>
                    <div style={{ minWidth: 220 }}>
                      <div style={{ fontWeight: 700, marginBottom: 6 }}>{o.orderNumber}</div>
                      <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{o.customerName}</div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', marginBottom: 8 }}>{o.deliveryAddress}</div>
                      {o.geocodeError && (
                        <div style={{ padding: '6px 8px', borderRadius: 6, backgroundColor: '#fffbeb', color: '#b45309', fontSize: '0.75rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                          <AlertTriangle size={12} strokeWidth={1.5} />
                          Ubicación aproximada (centro del municipio)
                        </div>
                      )}
                      <div style={{ fontWeight: 700, color: 'var(--color-accent)', marginBottom: 10 }}>{formatCOP(o.totalAmount)}</div>
                      {userLocation && (
                        <button
                          className="btn btn-primary"
                          style={{ width: '100%', justifyContent: 'center', padding: '6px 10px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedRoute(o.id)}
                        >
                          <Navigation size={14} strokeWidth={1.5} /> Ver ruta ({haversine(userLocation.lat, userLocation.lng, o.lat!, o.lng!).toFixed(2)} km)
                        </button>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MarkerClusterGroup>
          </MapContainer>
        )}
      </div>

      {/* Orders list below map */}
      {!loading && orders.length > 0 && (
        <div style={{ marginTop: 24 }}>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: 12 }}>Pedidos pendientes ({orders.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
            {orders.map((o) => (
              <div
                key={o.id}
                onClick={() => {
                  if (o.lat !== undefined && o.lng !== undefined) {
                    setFlyTarget([o.lat, o.lng]);
                  }
                }}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--color-surface)',
                  border: '1px solid var(--color-border)',
                  cursor: o.lat !== undefined && o.lng !== undefined ? 'pointer' : 'default',
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Package size={16} strokeWidth={1.5} color="#4f46e5" />
                    <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{o.orderNumber}</span>
                  </div>
                  {o.geocodeError && (
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, backgroundColor: '#fffbeb', color: '#b45309', fontWeight: 600 }}>
                      Aproximado
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.85rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>{o.customerName}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <MapPin size={12} strokeWidth={1.5} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{o.deliveryAddress}</span>
                </div>
                <div style={{ fontWeight: 700, color: 'var(--color-accent)', fontSize: '0.9rem' }}>{formatCOP(o.totalAmount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
