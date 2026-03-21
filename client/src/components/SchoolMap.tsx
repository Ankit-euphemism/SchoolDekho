import { useState, useCallback, useRef, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  GoogleMap,
  useLoadScript,
  MarkerF,
  InfoWindowF,
  CircleF,
  Autocomplete,
} from '@react-google-maps/api';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface School {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'public' | 'private' | 'charter' | 'international' | 'primary' | 'secondary' | string;
  rating?: number; // 0-5
}

interface SchoolMapProps {
  schools: School[];
  userCoords?: { lat: number; lng: number };
  radius?: number; // metres
  onMarkerClick?: (school: School) => void;
  hoveredSchoolId?: string | null;
  onLocationChange?: (coords: { lat: number; lng: number }) => void;
}

export type { SchoolMapProps };

// ── Constants ──────────────────────────────────────────────────────────────────

const INDIA_CENTER = { lat: 26.8393, lng: 80.9231 };
const DEFAULT_ZOOM = 12;
const LIBRARIES: ('places')[] = ['places'];

const MAP_CONTAINER: CSSProperties = { width: '100%', height: '100%' };

const MARKER_COLORS: Record<string, string> = {
  public: '#2563eb',      // blue-600
  private: '#9333ea',     // purple-600
  charter: '#ea580c',     // orange-600
  primary: '#2563eb',
  secondary: '#ea580c',
  international: '#059669', // emerald-600
};

const TYPE_BADGE_CLASS: Record<string, string> = {
  public: 'bg-blue-600',
  private: 'bg-purple-600',
  charter: 'bg-orange-600',
  primary: 'bg-blue-600',
  secondary: 'bg-orange-600',
  international: 'bg-emerald-600',
};

function markerIcon(type: string, bounce: boolean) {
  const fill = MARKER_COLORS[type] ?? '#6b7280';
  return {
    url:
      'data:image/svg+xml;charset=UTF-8,' +
      encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
          <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 24 16 24s16-12 16-24C32 7.16 24.84 0 16 0z" fill="${fill}"/>
          <circle cx="16" cy="14" r="6" fill="#fff"/>
        </svg>`,
      ),
    scaledSize: new google.maps.Size(bounce ? 40 : 32, bounce ? 50 : 40),
    anchor: new google.maps.Point(16, bounce ? 50 : 40),
  };
}

function ratingStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    '★'.repeat(full) +
    (half ? '½' : '') +
    '☆'.repeat(empty)
  );
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SchoolMap({
  schools,
  userCoords,
  radius = 8000,
  onMarkerClick,
  hoveredSchoolId,
  onLocationChange,
}: SchoolMapProps) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_KEY ?? '',
    libraries: LIBRARIES,
  });

  const [activeSchool, setActiveSchool] = useState<School | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const center = userCoords ?? INDIA_CENTER;
  const visibleActiveSchool =
    activeSchool && hoveredSchoolId && activeSchool.id !== hoveredSchoolId ? null : activeSchool;

  const onLoad = useCallback((m: google.maps.Map) => setMap(m), []);
  const onUnmount = useCallback(() => setMap(null), []);

  const onAutocompleteLoad = useCallback(
    (ac: google.maps.places.Autocomplete) => {
      autocompleteRef.current = ac;
    },
    [],
  );

  const onPlaceChanged = useCallback(() => {
    const place = autocompleteRef.current?.getPlace();
    if (place?.geometry?.location && map) {
      const nextCoords = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
      };
      map.panTo(nextCoords);
      map.setZoom(14);
      onLocationChange?.(nextCoords);
    }
  }, [map, onLocationChange]);

  if (loadError) return <div className="p-4 text-rose-300 bg-slate-950">Failed to load Google Maps</div>;
  if (!isLoaded) return <div className="p-4 text-slate-300 bg-slate-950">Loading map...</div>;

  return (
    <GoogleMap
      mapContainerStyle={MAP_CONTAINER}
      center={center}
      zoom={DEFAULT_ZOOM}
      onLoad={onLoad}
      onUnmount={onUnmount}
      options={{ disableDefaultUI: false, zoomControl: true, streetViewControl: false }}
    >
      {/* Places Autocomplete search box */}
      <div className="absolute top-2.5 left-2.5 z-10">
        <Autocomplete onLoad={onAutocompleteLoad} onPlaceChanged={onPlaceChanged}>
          <input
            type="text"
            placeholder="Search location…"
            className="px-3 py-2 rounded shadow-md border border-slate-600 bg-slate-950/90 text-slate-100 w-64 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </Autocomplete>
      </div>

      {/* Search radius circle */}
      <CircleF
        center={center}
        radius={radius}
        options={{
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          strokeColor: '#3b82f6',
          strokeOpacity: 0.3,
          strokeWeight: 1,
        }}
      />

      {/* School markers */}
      {schools.map((school) => {
        const isBouncing = hoveredSchoolId === school.id;
        return (
          <MarkerF
            key={school.id}
            position={{ lat: school.lat, lng: school.lng }}
            icon={markerIcon(school.type, isBouncing)}
            title={school.name}
            animation={isBouncing ? google.maps.Animation.BOUNCE : undefined}
            onClick={() => {
              setActiveSchool(school);
              onMarkerClick?.(school);
            }}
            label={{
              text: school.name.substring(0, 15),
              fontSize: '11px',
              fontWeight: 'bold',
              color: '#ffffff',
            }}
          />
        );
      })}

      {/* InfoWindow */}
      {visibleActiveSchool && (
        <InfoWindowF
          position={{ lat: visibleActiveSchool.lat, lng: visibleActiveSchool.lng }}
          onCloseClick={() => setActiveSchool(null)}
        >
          <div className="p-1 min-w-45">
            <h3 className="font-semibold text-amber-700 text-sm mb-1">{visibleActiveSchool.name}</h3>
            {visibleActiveSchool.rating != null && (
              <p className="text-yellow-500 text-sm mb-1">
                {ratingStars(visibleActiveSchool.rating)}{' '}
                <span className="text-gray-500 text-xs">({visibleActiveSchool.rating})</span>
              </p>
            )}
            <span
              className={`inline-block text-xs px-2 py-0.5 rounded-full text-white mb-2 ${TYPE_BADGE_CLASS[visibleActiveSchool.type] ?? 'bg-gray-500'}`}
            >
              {visibleActiveSchool.type}
            </span>
            <br />
            <Link
              to={`/school/${visibleActiveSchool.id}`}
              className="inline-flex items-center rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700"
            >
              View Profile
            </Link>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  );
}
