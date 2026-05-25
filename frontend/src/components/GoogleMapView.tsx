/// <reference types="google.maps" />
import { useEffect, useRef } from 'react';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

let scriptLoaded = false;
let scriptPromise: Promise<void> | null = null;

function loadGoogleMapsScript(): Promise<void> {
  if (scriptLoaded) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    if (window.google?.maps) {
      scriptLoaded = true;
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=marker&language=es&region=CO`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: Array<{
    id: number;
    lat: number;
    lng: number;
    title: string;
    color?: string;
    onClick?: () => void;
  }>;
  userLocation?: { lat: number; lng: number } | null;
  routeLine?: Array<{ lat: number; lng: number }>;
  onMapClick?: (lat: number, lng: number) => void;
}

export default function GoogleMapView({
  center,
  zoom = 13,
  markers = [],
  userLocation,
  routeLine,
}: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const routeRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadGoogleMapsScript();
        if (cancelled || !mapRef.current) return;

        const { Map } = await google.maps.importLibrary('maps') as google.maps.MapsLibrary;
        const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

        if (cancelled || !mapRef.current) return;

        const map = new Map(mapRef.current, {
          center,
          zoom,
          mapId: 'ORDERGO_MAP',
          gestureHandling: 'cooperative',
        });

        mapInstanceRef.current = map;

        // Add markers
        markersRef.current.forEach((m) => (m.map = null));
        markersRef.current = [];

        markers.forEach((m) => {
          const pin = new google.maps.marker.PinElement({
            background: m.color || '#fbbf24',
            borderColor: '#b45309',
            glyphColor: '#fff',
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: { lat: m.lat, lng: m.lng },
            title: m.title,
            content: pin.element,
          });

          marker.addEventListener('gmp-click', () => {
            if (m.onClick) m.onClick();
          });

          markersRef.current.push(marker);
        });

        // User location marker (blue)
        if (userLocation) {
          const pin = new google.maps.marker.PinElement({
            background: '#3b82f6',
            borderColor: '#1d4ed8',
            glyphColor: '#fff',
          });

          const marker = new AdvancedMarkerElement({
            map,
            position: userLocation,
            title: 'Tu ubicación',
            content: pin.element,
          });

          markersRef.current.push(marker);
        }

        // Route line
        if (routeRef.current) {
          routeRef.current.setMap(null);
        }

        if (routeLine && routeLine.length === 2) {
          routeRef.current = new google.maps.Polyline({
            path: routeLine,
            geodesic: true,
            strokeColor: '#4f46e5',
            strokeOpacity: 0.8,
            strokeWeight: 4,
            icons: [
              {
                icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 4 },
                offset: '0',
                repeat: '20px',
              },
            ],
          });
          routeRef.current.setMap(map);
        }
      } catch (err) {
        console.error('Google Maps init error:', err);
      }
    };

    init();

    return () => {
      cancelled = true;
      if (routeRef.current) {
        routeRef.current.setMap(null);
        routeRef.current = null;
      }
      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];
    };
  }, [center.lat, center.lng, zoom]);

  // Update markers when they change
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const updateMarkers = async () => {
      const { AdvancedMarkerElement } = await google.maps.importLibrary('marker') as google.maps.MarkerLibrary;

      markersRef.current.forEach((m) => (m.map = null));
      markersRef.current = [];

      markers.forEach((m) => {
        const pin = new google.maps.marker.PinElement({
          background: m.color || '#fbbf24',
          borderColor: '#b45309',
          glyphColor: '#fff',
        });

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position: { lat: m.lat, lng: m.lng },
          title: m.title,
          content: pin.element,
        });

        marker.addEventListener('gmp-click', () => {
          if (m.onClick) m.onClick();
        });

        markersRef.current.push(marker);
      });

      // User location marker
      if (userLocation) {
        const pin = new google.maps.marker.PinElement({
          background: '#3b82f6',
          borderColor: '#1d4ed8',
          glyphColor: '#fff',
        });

        const marker = new AdvancedMarkerElement({
          map: mapInstanceRef.current!,
          position: userLocation,
          title: 'Tu ubicación',
          content: pin.element,
        });

        markersRef.current.push(marker);
      }
    };

    updateMarkers();
  }, [markers, userLocation]);

  // Update route line
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    if (routeRef.current) {
      routeRef.current.setMap(null);
      routeRef.current = null;
    }

    if (routeLine && routeLine.length === 2) {
      routeRef.current = new google.maps.Polyline({
        path: routeLine,
        geodesic: true,
        strokeColor: '#4f46e5',
        strokeOpacity: 0.8,
        strokeWeight: 4,
        icons: [
          {
            icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, scale: 4 },
            offset: '0',
            repeat: '20px',
          },
        ],
      });
      routeRef.current.setMap(mapInstanceRef.current);
    }
  }, [routeLine]);

  return <div ref={mapRef} style={{ height: 500, width: '100%', borderRadius: 'var(--radius-md)' }} />;
}
