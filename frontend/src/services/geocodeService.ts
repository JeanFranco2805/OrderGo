import { tryMaptilerWithKeys } from './maptilerKeys';

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

  const parts: string[] = [];
  if (route) parts.push(route);
  if (streetNumber) parts.push(`# ${streetNumber}`);
  if (neighborhood && neighborhood !== locality) parts.push(neighborhood);
  if (locality) parts.push(locality);
  if (admin1) parts.push(admin1);
  return parts.join(', ');
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

async function googleReverseGeocode(lat: number, lng: number): Promise<string | null> {
  if (!GOOGLE_API_KEY) return null;
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
  return null;
}

async function nominatimReverseGeocode(lat: number, lng: number): Promise<string | null> {
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

/**
 * Reverse geocode a lat/lng coordinate.
 * Tries MapTiler first (most precise for Colombia), then Google, then Nominatim.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const mt = await maptilerReverseGeocode(lat, lng);
  if (mt) return mt;

  const gg = await googleReverseGeocode(lat, lng);
  if (gg) return gg;

  return await nominatimReverseGeocode(lat, lng);
}
