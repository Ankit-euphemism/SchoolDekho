import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../hooks/useCompare';
import { useSeo } from '../hooks/useSeo';
import SchoolMap, { type School as SchoolMapSchool } from '../components/SchoolMap';
import { getNearbySchools } from '../api/schools';
import type { NearbySchool, SchoolLocation, SchoolType, NearbySchoolFilters } from '../types/school';
import { Star, GitCompareArrows, Check, Crosshair, List, Map } from 'lucide-react';

const TYPES: Array<'All' | SchoolType> = ['All', 'primary', 'secondary', 'international'];
const DEFAULT_LOCATION: SchoolLocation = { lat: 26.8393, lng: 80.9231 };
const DEFAULT_RADIUS_KM = 20;

function toMapType(type: string): SchoolMapSchool['type'] {
  const lower = type.toLowerCase();
  if (lower === 'primary') return 'primary';
  if (lower === 'secondary') return 'secondary';
  if (lower === 'international') return 'international';
  return 'charter';
}

function formatSchoolType(type: SchoolType) {
  if (type === 'primary') return 'Primary';
  if (type === 'secondary') return 'Secondary';
  return 'International';
}

function formatTypeLabel(type: string) {
  if (type === 'All') return 'All';
  return formatSchoolType(type as SchoolType);
}

export default function SchoolMapPage() {
  useSeo({
    title: 'School Map Explorer',
    description: 'Explore schools on an interactive map. View locations, ratings, and details of schools near you.',
  });
  const [selectedType, setSelectedType] = useState<'All' | SchoolType>('All');
  const [showList, setShowList] = useState(true);
  const [schools, setSchools] = useState<NearbySchool[]>([]);
  const [userCoords, setUserCoords] = useState<SchoolLocation>(DEFAULT_LOCATION);
  const [locationObtained, setLocationObtained] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { compareList, addSchool, removeSchool } = useCompare();

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      return;
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
        setLocationObtained(true);
      },
      () => {
        setLocationObtained(true);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );

    // Set location obtained after timeout if not already set to avoid infinite waiting
    const timer = setTimeout(() => {
      setLocationObtained(true);
    }, 9000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    // Only fetch schools after user location is determined
    if (!locationObtained) return;

    queueMicrotask(() => {
      setIsLoading(true);
      setErrorMessage(null);
    });

    const filters: NearbySchoolFilters = {
      types: selectedType === 'All' ? ['primary', 'secondary', 'international'] : [selectedType],
      board: 'all',
      minRating: 0,
      radiusKm: DEFAULT_RADIUS_KM,
      facilities: [],
    };

    getNearbySchools({ location: userCoords, filters, signal: controller.signal })
      .then((data) => setSchools(data.schools))
      .catch(() => {
        setErrorMessage('Unable to load schools near your location right now.');
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [locationObtained, userCoords, selectedType]);

  const filtered = useMemo(
    () => schools, // Schools are already filtered by location and type from the API
    [schools],
  );

  const mapSchools: SchoolMapSchool[] = useMemo(
    () =>
      filtered.map((school) => ({
        id: school.id,
        name: school.name,
        lat: school.location.lat,
        lng: school.location.lng,
        type: toMapType(school.type),
        rating: school.averageRating,
      })),
    [filtered],
  );

  const isInCompare = (id: string) => compareList.some((school) => school.id === id);

  function recenterToCurrentLocation() {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
      },
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100dvh-64px)]">
      <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-700/80 bg-slate-950/80 backdrop-blur-md">
        <span className="text-sm font-medium text-slate-200 mr-1">Type:</span>
        {TYPES.map((type) => (
          <button
            key={type}
            onClick={() => setSelectedType(type)}
            className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${
              selectedType === type
                ? 'border-sky-700 bg-sky-700 text-white'
                : 'border-slate-600 text-slate-300 hover:bg-slate-800/80'
            }`}
          >
            {formatTypeLabel(type)}
          </button>
        ))}

        <div className="flex-1" />

        <button
          onClick={() => setShowList((prev) => !prev)}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-200 border border-slate-600 rounded-lg hover:bg-slate-800/80 transition-colors"
        >
          {showList ? <Map className="w-3.5 h-3.5" /> : <List className="w-3.5 h-3.5" />}
          {showList ? 'Map Only' : 'Show List'}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 relative bg-slate-950">
          <SchoolMap schools={mapSchools} userCoords={userCoords} radius={DEFAULT_RADIUS_KM * 1000} onLocationChange={setUserCoords} />

          {isLoading ? (
            <div className="absolute left-4 top-16 rounded-lg border border-slate-700 bg-slate-950/90 px-3 py-2 text-xs text-slate-300">
              Loading schools...
            </div>
          ) : null}

          {errorMessage ? (
            <div className="absolute left-4 top-16 rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
              {errorMessage}
            </div>
          ) : null}

          <button
            onClick={recenterToCurrentLocation}
            className="absolute bottom-4 right-4 p-2.5 bg-slate-900/90 border border-slate-600 rounded-lg text-slate-200 hover:bg-slate-800 transition-colors"
            aria-label="Center map"
          >
            <Crosshair className="w-4 h-4" />
          </button>
        </div>

        {showList && (
          <aside className="w-80 border-l border-slate-700/80 bg-linear-to-b from-slate-950 to-slate-900 overflow-y-auto hidden md:block">
            <div className="px-4 py-3 border-b border-slate-700/80">
              <p className="text-sm font-medium text-slate-200">{filtered.length} schools</p>
            </div>
            <div className="divide-y divide-slate-800">
              {filtered.map((school) => {
                const inCompare = isInCompare(school.id);
                return (
                  <div key={school.id} className="px-4 py-3 hover:bg-slate-800/70 transition-colors">
                    <Link to={`/school/${school.id}`} className="block">
                      <h3 className="text-sm font-medium text-slate-100 hover:text-sky-300 transition-colors">
                        {school.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{formatSchoolType(school.type)}</span>
                        <span className="flex items-center gap-0.5 text-xs text-amber-400">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {school.averageRating.toFixed(1)}
                        </span>
                      </div>
                    </Link>
                    <button
                      onClick={() =>
                        inCompare ? removeSchool(school.id) : addSchool({ id: school.id, name: school.name })
                      }
                      className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                        inCompare ? 'text-emerald-300' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {inCompare ? <Check className="w-3 h-3" /> : <GitCompareArrows className="w-3 h-3" />}
                      {inCompare ? 'In Compare' : 'Compare'}
                    </button>
                  </div>
                );
              })}
            </div>
          </aside>
        )}
      </div>

      {showList && (
        <div className="md:hidden border-t border-slate-700/80 bg-linear-to-b from-slate-950 to-slate-900 max-h-72 overflow-y-auto">
          <div className="px-4 py-3 border-b border-slate-700/80">
            <p className="text-sm font-medium text-slate-200">{filtered.length} schools</p>
          </div>
          <div className="divide-y divide-slate-800">
            {filtered.map((school) => {
              const inCompare = isInCompare(school.id);
              return (
                <div key={school.id} className="px-4 py-3 hover:bg-slate-800/70 transition-colors">
                  <Link to={`/school/${school.id}`} className="block">
                    <h3 className="text-sm font-medium text-slate-100 hover:text-sky-300 transition-colors">
                      {school.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-slate-300 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">{formatSchoolType(school.type)}</span>
                      <span className="flex items-center gap-0.5 text-xs text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" /> {school.averageRating.toFixed(1)}
                      </span>
                    </div>
                  </Link>
                  <button
                    onClick={() =>
                      inCompare ? removeSchool(school.id) : addSchool({ id: school.id, name: school.name })
                    }
                    className={`mt-1.5 inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                      inCompare ? 'text-emerald-300' : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {inCompare ? <Check className="w-3 h-3" /> : <GitCompareArrows className="w-3 h-3" />}
                    {inCompare ? 'In Compare' : 'Compare'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
