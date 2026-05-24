import { useState, useEffect } from 'react';
import { MapPin, AlertTriangle, Crosshair, Navigation, Package, Layers, RefreshCw } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { orderApi, type Order } from '../services/orderService';
import { formatCOP } from '../utils/currency';
import { buildGeocodeAddress, buildGeocodeAddressWithHouse, parseAddress } from '../components/AddressInput';
import GoogleMapView from '../components/GoogleMapView';
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
  exact?: boolean;
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
  'puerto colombia': [10.85, -74.75],
  galapa: [10.9, -74.85],
  'sabanalarga': [10.63, -74.92],
  usiacurí: [10.75, -75.12],
  'baranoa': [10.96, -74.92],
  'palmar de varela': [10.74, -74.75],
  'campo de la cruz': [10.73, -74.88],
  'candelaria': [10.46, -74.88],
  'luruaco': [10.61, -75.14],
  'manatí': [10.45, -74.96],
  'repelón': [10.49, -75.13],
  'santo tomás': [10.76, -74.91],
  'suán': [10.33, -74.88],
  'tubará': [10.87, -74.97],
};

function getMunicipalityFallback(addr: string): [number, number] | null {
  const lower = addr.toLowerCase();
  for (const [name, coords] of Object.entries(MUNICIPALITY_CENTERS)) {
    if (lower.includes(name)) return coords;
  }
  return null;
}

import { tryMaptilerWithKeys, getPrimaryKey } from '../services/maptilerKeys';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeocodeResult {
  geometry: {
    location: { lat: number; lng: number };
    location_type: string;
  };
  formatted_address: string;
  address_components?: GoogleAddressComponent[];
  types: string[];
}

function simplifyGoogleAddress(result: GoogleGeocodeResult): string {
  const comps = result.address_components ?? [];
  const get = (type: string) => comps.find((c) => c.types.includes(type))?.long_name ?? '';
  const route = get('route');
  const streetNumber = get('street_number');
  const neighborhood = get('neighborhood') || get('sublocality_level_1') || get('political');
  const locality = get('locality') || get('administrative_area_level_2');
  const admin1 = get('administrative_area_level_1');

  let parts: string[] = [];
  if (route) parts.push(route);
  if (streetNumber) parts.push(`# ${streetNumber}`);
  if (neighborhood && neighborhood !== locality) parts.push(neighborhood);
  if (locality) parts.push(locality);
  if (admin1) parts.push(admin1);
  return parts.join(', ');
}

function normalizeForGoogle(addr: string): string {
  // Colombian address format: "Carrera 3A Sur #46K"
  // Google Maps sometimes understands better with spaces: "Carrera 3A Sur # 46K"
  // BUT for intersections in Colombia, explicit "esquina" or "&" works better
  return addr
    .replace(/#\s*/g, ' # ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForGoogleEsquina(addr: string): string {
  // "Carrera 3A Sur esquina Calle 46K" — sometimes Google understands this better
  return addr
    .replace(/#\s*/g, ' esquina ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeForGoogleAmpersand(addr: string): string {
  // "Carrera 3A Sur & Calle 46K" — international format
  return addr
    .replace(/#\s*/g, ' & ')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOCATION_TYPE_PRIORITY: Record<string, number> = {
  'ROOFTOP': 4,
  'RANGE_INTERPOLATED': 3,
  'GEOMETRIC_CENTER': 2,
  'APPROXIMATE': 1,
};

function pickBestGoogleResult(results: GoogleGeocodeResult[]): GoogleGeocodeResult | null {
  if (!results || results.length === 0) return null;
  // Filter results that are actually in Atlántico
  const inAtlantico = results.filter((r) => {
    const loc = r.geometry.location;
    return isInAtlantico(loc.lat, loc.lng);
  });
  const candidates = inAtlantico.length > 0 ? inAtlantico : results;
  // Sort by location_type priority (higher = more precise)
  candidates.sort((a, b) => {
    const pa = LOCATION_TYPE_PRIORITY[a.geometry.location_type] ?? 0;
    const pb = LOCATION_TYPE_PRIORITY[b.geometry.location_type] ?? 0;
    return pb - pa;
  });
  return candidates[0];
}

async function googleGeocodeSearch(query: string): Promise<GoogleGeocodeResult | null> {
  if (!GOOGLE_API_KEY) return null;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&region=co&language=es&components=administrative_area:Atlántico|country:CO`
    );
    if (!res.ok) return null;
    const json = await res.json();
    if (json.status === 'OK' && json.results && json.results.length > 0) {
      return pickBestGoogleResult(json.results);
    }
  } catch (e) {
    // Google error — keep going
  }
  return null;
}

async function maptilerSearch(query: string): Promise<{ lat: number; lng: number } | null> {
  return tryMaptilerWithKeys(async (key) => {
    try {
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(query)}.json?key=${key}&language=es&limit=1&bbox=-75.2,10.5,-74.3,11.1`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit');
        return null;
      }
      const json = await res.json();
      if (json.features && json.features.length > 0) {
        const feature = json.features[0];
        const [lng, lat] = feature.center;
        if (isInAtlantico(lat, lng)) {
          return { lat, lng };
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Rate limit')) throw e;
    }
    return null;
  });
}

async function maptilerReverseGeocode(lat: number, lng: number): Promise<string | null> {
  return tryMaptilerWithKeys(async (key) => {
    try {
      const url = `https://api.maptiler.com/geocoding/${lng},${lat}.json?key=${key}&language=es&limit=1`;
      const res = await fetch(url);
      if (!res.ok) {
        if (res.status === 429) throw new Error('Rate limit');
        return null;
      }
      const json = await res.json();
      if (json.features && json.features.length > 0) {
        return json.features[0].place_name;
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes('Rate limit')) throw e;
    }
    return null;
  });
}

function extractCity(addr: string): string | null {
  // "Carrera 4B Sur #48-1, Barranquilla, Atlántico, Colombia" → "Barranquilla"
  const parts = addr.split(',').map((s) => s.trim());
  if (parts.length >= 3) {
    return parts[1];
  }
  if (parts.length === 2) return parts[1];
  return null;
}

function isInAtlantico(lat: number, lng: number): boolean {
  return lat > 10.5 && lat < 11.2 && lng > -75.2 && lng < -74.3;
}

function isPreciseEnough(result: GoogleGeocodeResult): boolean {
  const type = result.geometry.location_type;
  // ROOFTOP or RANGE_INTERPOLATED means we found the actual intersection/house
  // APPROXIMATE usually means "we only found the street, not the specific point"
  return type === 'ROOFTOP' || type === 'RANGE_INTERPOLATED' || type === 'GEOMETRIC_CENTER';
}

function buildGeocodeQuery(addr: string): { query: string; queryWithHouse: string } {
  // Primary: use structured parser (strips barrio/urbanización automatically)
  const parts = parseAddress(addr);
  let queryWithHouse = buildGeocodeAddressWithHouse(parts);
  let query = buildGeocodeAddress(parts);

  // If structured parser failed, extract intersection from raw string
  if (!query) {
    const match = addr.match(/(Calle|Carrera)\s+(\d+)([A-Z])?\s*(?:Bis)?\s*#\s*(?:Calle|Carrera)?\s*(\d+)([A-Z])?/i);
    if (match) {
      const tipoVia = match[1];
      const numeroVia = match[2];
      const letraVia = match[3] || '';
      const numeral = match[4];
      const letraNumeral = match[5] || '';
      const tipoSec = tipoVia === 'Calle' ? 'Carrera' : 'Calle';
      const municipioMatch = addr.match(/(Barranquilla|Soledad|Malambo)/i);
      const municipio = municipioMatch ? municipioMatch[1] : 'Barranquilla';
      query = `${tipoVia} ${numeroVia}${letraVia} # ${tipoSec} ${numeral}${letraNumeral}, ${municipio}, Atlántico, Colombia`;
      queryWithHouse = query;
    } else {
      // Last resort: strip barrio/urbanización prefix and use raw remainder
      const cleaned = addr.replace(/^(Urbanizaci[oó]n|Conjunto|Barrio|Urb\.?)\s*[^,]+,\s*/i, '');
      query = cleaned || addr;
      queryWithHouse = query;
    }
  }

  if (query && !query.toLowerCase().endsWith(', colombia')) query += ', Colombia';
  if (queryWithHouse && !queryWithHouse.toLowerCase().endsWith(', colombia')) queryWithHouse += ', Colombia';

  return { query, queryWithHouse };
}

async function geocodeAddress(addr: string): Promise<{ lat: number; lng: number; exact?: boolean } | { geocodeError: true; fallbackLat: number; fallbackLng: number }> {
  const { query, queryWithHouse } = buildGeocodeQuery(addr);

  // 1) MapTiler with house number (more precise)
  if (queryWithHouse && queryWithHouse !== query) {
    const mtHouse = await maptilerSearch(queryWithHouse);
    if (mtHouse) return { lat: mtHouse.lat, lng: mtHouse.lng, exact: true };
  }

  // 2) MapTiler intersection (no house number) — primary geocoder
  if (query) {
    const mtInter = await maptilerSearch(query);
    if (mtInter) return { lat: mtInter.lat, lng: mtInter.lng, exact: true };
  }

  // 3) Google with house number
  if (queryWithHouse && queryWithHouse !== query && GOOGLE_API_KEY) {
    const googleFormatsWithHouse = [
      normalizeForGoogle(queryWithHouse),
      normalizeForGoogleEsquina(queryWithHouse),
      normalizeForGoogleAmpersand(queryWithHouse),
    ];
    for (const q of googleFormatsWithHouse) {
      const res = await googleGeocodeSearch(q);
      if (res && isInAtlantico(res.geometry.location.lat, res.geometry.location.lng)) {
        const loc = res.geometry.location;
        const locType = res.geometry.location_type;
        if (isPreciseEnough(res)) return { lat: loc.lat, lng: loc.lng, exact: locType === 'ROOFTOP' };
      }
    }
  }

  // 4) Google intersection (no house number)
  if (query && GOOGLE_API_KEY) {
    const googleFormats = [
      normalizeForGoogle(query),
      normalizeForGoogleEsquina(query),
      normalizeForGoogleAmpersand(query),
    ];
    const googleResults: GoogleGeocodeResult[] = [];
    for (const q of googleFormats) {
      const res = await googleGeocodeSearch(q);
      if (res && isInAtlantico(res.geometry.location.lat, res.geometry.location.lng)) {
        googleResults.push(res);
      }
    }
    if (googleResults.length > 0) {
      googleResults.sort((a, b) => {
        const pa = LOCATION_TYPE_PRIORITY[a.geometry.location_type] ?? 0;
        const pb = LOCATION_TYPE_PRIORITY[b.geometry.location_type] ?? 0;
        return pb - pa;
      });
      const best = googleResults[0];
      const loc = best.geometry.location;
      if (isPreciseEnough(best)) return { lat: loc.lat, lng: loc.lng, exact: best.geometry.location_type === 'ROOFTOP' };
      return { lat: loc.lat, lng: loc.lng };
    }
  }

  // 5) City center fallback via MapTiler
  const city = extractCity(addr);
  if (city) {
    const cityRes = await maptilerSearch(`${city}, Atlántico, Colombia`);
    if (cityRes) return { lat: cityRes.lat, lng: cityRes.lng };
  }

  // 6) Hardcoded municipality centers
  const hardcoded = getMunicipalityFallback(addr);
  if (hardcoded) {
    return { geocodeError: true, fallbackLat: hardcoded[0], fallbackLng: hardcoded[1] };
  }

  // Ultimate fallback: Barranquilla center
  return { geocodeError: true, fallbackLat: 10.9685, fallbackLng: -74.7813 };
}

async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  // 1) Try MapTiler reverse geocoding first
  const mtResult = await maptilerReverseGeocode(lat, lng);
  if (mtResult) return mtResult;

  // 2) Fallback to Google
  if (GOOGLE_API_KEY) {
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}&region=co&language=es&result_type=street_address|route`
      );
      if (res.ok) {
        const json = await res.json();
        if (json.status === 'OK' && json.results && json.results.length > 0) {
          const result: GoogleGeocodeResult = json.results[0];
          return simplifyGoogleAddress(result);
        }
      }
    } catch {
      // fall through
    }
  }

  // 3) Last resort: Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=es`,
      {
        headers: {
          'Accept-Language': 'es',
          'User-Agent': 'OrderGo-SweetFlow/1.0 (contact@ordergo.local)',
        },
      }
    );
    if (res.ok) {
      const json = await res.json();
      if (json && json.display_name) {
        return json.display_name;
      }
    }
  } catch {
    // fall through
  }
  return null;
}

export default function MapaEntregas() {
  const [orders, setOrders] = useState<GeoOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userAddress, setUserAddress] = useState<string>('');
  const [userError, setUserError] = useState('');
  const [flyTarget, setFlyTarget] = useState<[number, number] | undefined>(undefined);
  const [selectedRoute, setSelectedRoute] = useState<number | null>(null);
  const [tileLayer, setTileLayer] = useState<'maptiler' | 'osm' | 'esri' | 'carto' | 'google'>('maptiler');

  const TILE_LAYERS = {
    maptiler: {
      name: 'MapTiler Calles',
      url: `https://api.maptiler.com/maps/streets-v2/{z}/{x}/{y}.png?key=${getPrimaryKey()}`,
      attribution: '&copy; <a href="https://www.maptiler.com/copyright/" target="_blank">MapTiler</a> | &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
    osm: {
      name: 'OpenStreetMap',
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
    },
    esri: {
      name: 'Esri Satélite',
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      attribution: '&copy; <a href="https://www.esri.com/" target="_blank">Esri</a> | Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
    },
    carto: {
      name: 'CartoDB Claro',
      url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
    },
    google: {
      name: 'Google Maps',
      url: '',
      attribution: '',
    },
  };

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await orderApi.getPendingDeliveries();
      const withCoords: GeoOrder[] = [];
      for (const o of data) {
        if (o.latitude !== undefined && o.longitude !== undefined) {
          // Use saved coordinates from the order (most precise)
          withCoords.push({ ...o, lat: o.latitude, lng: o.longitude, exact: true });
          continue;
        }
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
          withCoords.push({
            ...o,
            geocodeError: true,
            lat: 10.9685,
            lng: -74.7813,
          });
        }
        await new Promise((r) => setTimeout(r, 300));
      }
      setOrders(withCoords);
    } catch {
      setError('No se pudo cargar los pedidos pendientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const locateUser = () => {
    setUserError('');
    setUserAddress('');
    if (!navigator.geolocation) {
      setUserError('Tu navegador no soporta geolocalización.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTarget([loc.lat, loc.lng]);
        const address = await reverseGeocode(loc.lat, loc.lng);
        if (address) {
          setUserAddress(address);
        } else {
          setUserAddress('No se pudo obtener la dirección de esta ubicación');
        }
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
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Layers size={16} strokeWidth={1.5} color="var(--color-text-muted)" />
            <select
              className="form-control"
              value={tileLayer}
              onChange={(e) => setTileLayer(e.target.value as 'maptiler' | 'osm' | 'esri' | 'carto' | 'google')}
              style={{ width: 160, fontSize: '0.85rem', padding: '6px 10px' }}
            >
              {Object.entries(TILE_LAYERS).map(([key, layer]) => (
                <option key={key} value={key}>{layer.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-outline" onClick={loadOrders} disabled={loading}>
            <RefreshCw size={18} strokeWidth={1.5} /> {loading ? 'Recargando...' : 'Recargar'}
          </button>
          <button className="btn btn-primary" onClick={locateUser}>
            <Crosshair size={18} strokeWidth={1.5} /> Mi ubicación
          </button>
        </div>
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

      {userAddress && (
        <div style={{ padding: '12px 16px', borderRadius: 'var(--radius-md)', backgroundColor: '#ecfdf5', color: '#047857', fontSize: '0.88rem', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <MapPin size={16} strokeWidth={1.5} />
          <span><strong>Tu ubicación:</strong> {userAddress}</span>
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
        ) : tileLayer === 'google' ? (
          <GoogleMapView
            center={{ lat: center[0], lng: center[1] }}
            zoom={13}
            markers={validOrders.map((o) => ({
              id: o.id,
              lat: o.lat!,
              lng: o.lng!,
              title: `${o.orderNumber} - ${o.customerName}`,
              color: o.geocodeError ? '#ef4444' : '#fbbf24',
            }))}
            userLocation={userLocation}
            routeLine={routePositions.length === 2 ? routePositions.map((p) => ({ lat: p[0], lng: p[1] })) : undefined}
          />
        ) : (
          <MapContainer center={center} zoom={13} style={{ height: 500, width: '100%' }}>
              <TileLayer
                attribution={TILE_LAYERS[tileLayer].attribution}
                url={TILE_LAYERS[tileLayer].url}
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
