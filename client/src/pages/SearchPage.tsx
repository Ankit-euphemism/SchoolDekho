import { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCompare } from '../hooks/useCompare';
import { useSeo } from '../hooks/useSeo';
import { GraduationCap, MapPinned, AlertCircle } from 'lucide-react';
import SchoolMap, { type School as SchoolMapSchool } from '../components/SchoolMap';
import { SchoolCard, SchoolCardSkeleton } from '../components/SchoolCard';
import CompareTray from '../components/CompareTray';
import { getNearbySchools } from '../api/schools';
import { getErrorMessage, parseHttpError } from '../utils/httpError';
import { FACILITY_OPTIONS } from '../constants/facilities';
import type { NearbySchool, NearbySchoolFilters, SchoolBoard, SchoolLocation, SchoolType } from '../types/school';

const DEFAULT_LOCATION: SchoolLocation = { lat: 26.8393, lng: 80.9231 };

const SCHOOL_TYPE_OPTIONS: Array<{ label: string; value: SchoolType }> = [
  { label: 'Primary', value: 'primary' },
  { label: 'Secondary', value: 'secondary' },
  { label: 'International', value: 'international' },
];

const BOARD_OPTIONS: Array<{ label: string; value: SchoolBoard | 'all' }> = [
  { label: 'All Boards', value: 'all' },
  { label: 'CBSE', value: 'CBSE' },
  { label: 'ICSE', value: 'ICSE' },
  { label: 'IB', value: 'IB' },
  { label: 'State Board', value: 'state' },
];

const DEFAULT_FILTERS: NearbySchoolFilters = {
  types: [],
  board: 'all',
  minRating: 0,
  radiusKm: 10,
  facilities: [],
};

function toMapSchool(school: NearbySchool): SchoolMapSchool {
  return {
    id: school.id,
    name: school.name,
    lat: school.location.lat,
    lng: school.location.lng,
    type: school.type,
    rating: school.averageRating,
  };
}

function formatBoardValue(board: NearbySchoolFilters['board']) {
  return board === 'state' ? 'State Board' : board;
}

export default function SearchPage() {
  useSeo({
    title: 'Search Schools',
    description: 'Find schools near your location. Filter by type, board, ratings, and facilities to find the perfect school for your child.',
  });

  const navigate = useNavigate();
  const [filters, setFilters] = useState<NearbySchoolFilters>(DEFAULT_FILTERS);
  const [userCoords, setUserCoords] = useState<SchoolLocation>(DEFAULT_LOCATION);
  const [schools, setSchools] = useState<NearbySchool[]>([]);
  const [hoveredSchoolId, setHoveredSchoolId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { compareList, addSchool } = useCompare();

  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setUserCoords({ lat: coords.latitude, lng: coords.longitude });
      },
      () => {
        setUserCoords((currentCoords) => currentCoords);
      },
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  // Initial fetch when filters/location changes
  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setErrorMessage(null);
    setHasMore(true);

    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await getNearbySchools({
          location: userCoords,
          filters,
          signal: controller.signal,
          includeMeta: false,
        });
        setSchools(response.schools);
        setHasMore(response.schools.length >= 20); // Assume more if got full page
      } catch (error) {
        if (controller.signal.aborted) return;
        const errorInfo = parseHttpError(error);
        setErrorMessage(
          errorInfo.isRateLimited
            ? `${errorInfo.message} Please wait before trying again.`
            : getErrorMessage(error, 'Unable to load nearby schools right now.'),
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, 350); // Debounce filter changes

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [filters, userCoords]);

  // Infinite scroll handler
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || isLoading || errorMessage) return;

    setIsLoadingMore(true);
    try {
      const response = await getNearbySchools({
        location: userCoords,
        filters,
        signal: undefined,
        includeMeta: false,
      });

      if (response.schools.length > 0) {
        const newSchools = response.schools.filter(
          (school) => !schools.find((s) => s.id === school.id)
        );
        setSchools((prev) => [...prev, ...newSchools]);
        setHasMore(newSchools.length >= 20);
      } else {
        setHasMore(false);
      }
    } catch (error) {
      console.error('Error loading more schools:', error);
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [userCoords, filters, isLoadingMore, hasMore, isLoading, errorMessage, schools]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    const loadMoreElement = scrollContainerRef.current?.querySelector('[data-load-more]');
    if (loadMoreElement) {
      observer.observe(loadMoreElement);
    }

    return () => observer.disconnect();
  }, [handleLoadMore, hasMore, isLoadingMore, isLoading]);

  const mapSchools = useMemo(() => schools.map(toMapSchool), [schools]);
  const compareIds = useMemo(() => new Set(compareList.map((school) => school.id)), [compareList]);
  const isCompareFull = compareList.length >= 3;

  function toggleType(type: SchoolType) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      types: currentFilters.types.includes(type)
        ? currentFilters.types.filter((value) => value !== type)
        : [...currentFilters.types, type],
    }));
  }

  function toggleFacility(facility: string) {
    setFilters((currentFilters) => ({
      ...currentFilters,
      facilities: currentFilters.facilities.includes(facility)
        ? currentFilters.facilities.filter((value) => value !== facility)
        : [...currentFilters.facilities, facility],
    }));
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-sky-300/80">Nearby Search</p>
          <h1 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">Find schools around your location</h1>
        </div>
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/70 px-4 py-3 text-sm text-slate-300">
          <p>Radius: {filters.radiusKm} km</p>
          <p>Board: {formatBoardValue(filters.board)}</p>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[55%_45%]">
        <div className="overflow-hidden rounded-[1.75rem] border border-slate-700/70 bg-slate-950 shadow-[0_24px_70px_rgba(2,6,23,0.42)] lg:h-[calc(100dvh-12rem)]">
          <SchoolMap
            schools={mapSchools}
            userCoords={userCoords}
            radius={filters.radiusKm * 1000}
            hoveredSchoolId={hoveredSchoolId}
            onLocationChange={setUserCoords}
          />
        </div>

        <div className="flex min-h-190 flex-col overflow-hidden rounded-[1.75rem] border border-slate-700/70 bg-linear-to-b from-slate-950 via-slate-900 to-slate-950 shadow-[0_24px_70px_rgba(2,6,23,0.38)] lg:h-[calc(100dvh-12rem)]">
          <div className="border-b border-slate-800/90 px-4 py-4 sm:px-5">
            <div className="grid gap-4 xl:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">School Type</p>
                <div className="flex flex-wrap gap-2">
                  {SCHOOL_TYPE_OPTIONS.map((typeOption) => {
                    const checked = filters.types.includes(typeOption.value);
                    return (
                      <label
                        key={typeOption.value}
                        className={`inline-flex cursor-pointer items-center gap-2 rounded-full border px-3 py-2 text-sm transition-colors ${
                          checked
                            ? 'border-sky-500/60 bg-sky-500/10 text-sky-100'
                            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800/80'
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-600 bg-slate-950 text-sky-500"
                          checked={checked}
                          onChange={() => toggleType(typeOption.value)}
                        />
                        {typeOption.label}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label htmlFor="board-filter" className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  Board
                </label>
                <select
                  id="board-filter"
                  value={filters.board}
                  onChange={(event) =>
                    setFilters((currentFilters) => ({
                      ...currentFilters,
                      board: event.target.value as NearbySchoolFilters['board'],
                    }))
                  }
                  className="w-full rounded-2xl border border-slate-700 bg-slate-900/80 px-3 py-3 text-sm text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {BOARD_OPTIONS.map((boardOption) => (
                    <option key={boardOption.value} value={boardOption.value}>
                      {boardOption.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="rating-filter" className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span>Minimum Rating</span>
                  <span className="text-slate-200">{filters.minRating.toFixed(1)}</span>
                </label>
                <input
                  id="rating-filter"
                  type="range"
                  min="0"
                  max="5"
                  step="0.5"
                  value={filters.minRating}
                  onChange={(event) =>
                    setFilters((currentFilters) => ({
                      ...currentFilters,
                      minRating: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>

              <div>
                <label htmlFor="radius-filter" className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
                  <span>Radius</span>
                  <span className="text-slate-200">{filters.radiusKm} km</span>
                </label>
                <input
                  id="radius-filter"
                  type="range"
                  min="1"
                  max="20"
                  step="1"
                  value={filters.radiusKm}
                  onChange={(event) =>
                    setFilters((currentFilters) => ({
                      ...currentFilters,
                      radiusKm: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-sky-400"
                />
              </div>
            </div>

            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Facilities</p>
              <div className="flex flex-wrap gap-2">
                {FACILITY_OPTIONS.map((facility) => {
                  const selected = filters.facilities.includes(facility);
                  return (
                    <button
                      key={facility}
                      type="button"
                      onClick={() => toggleFacility(facility)}
                      className={`rounded-full border px-3 py-2 text-sm transition-colors ${
                        selected
                          ? 'border-emerald-500/60 bg-emerald-500/10 text-emerald-100'
                          : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:bg-slate-800/80'
                      }`}
                    >
                      {facility}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800/90 px-4 py-3 text-sm sm:px-5">
            <div>
              <p className="font-medium text-slate-100">{schools.length} school{schools.length === 1 ? '' : 's'} nearby</p>
              <p className="text-slate-400">Refetches automatically when filters or location change.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300">
              <MapPinned className="h-3.5 w-3.5 text-sky-300" />
              {userCoords.lat.toFixed(3)}, {userCoords.lng.toFixed(3)}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5" ref={scrollContainerRef}>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }, (_, index) => (
                  <SchoolCardSkeleton key={index} />
                ))}
              </div>
            ) : errorMessage ? (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm text-red-200">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 flex-0 mt-0.5" />
                  <div>
                    <p className="font-medium">{errorMessage}</p>
                    <p className="mt-1 text-xs text-red-200/70">
                      Please try again or adjust your filters.
                    </p>
                  </div>
                </div>
              </div>
            ) : schools.length === 0 ? (
              <div className="flex h-full min-h-72 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-700 bg-slate-950/60 px-6 text-center">
                <GraduationCap className="h-10 w-10 text-slate-500" />
                <h2 className="mt-4 text-lg font-semibold text-slate-100">No nearby schools matched those filters</h2>
                <p className="mt-2 max-w-sm text-sm text-slate-400">
                  Adjust the board, radius, rating, or facility filters and the list will refetch automatically.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {schools.map((school) => (
                  <SchoolCard
                    key={school.id}
                    school={school}
                    isInCompare={compareIds.has(school.id)}
                    isCompareFull={isCompareFull}
                    onAddToCompare={addSchool}
                    onCardClick={(schoolId) => navigate(`/school/${schoolId}`)}
                    onHoverChange={setHoveredSchoolId}
                  />
                ))}

                {/* Infinite scroll trigger */}
                <div
                  data-load-more
                  className="py-8 flex items-center justify-center"
                >
                  {isLoadingMore ? (
                    <div className="text-sm text-slate-400 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                      <span>Loading more schools...</span>
                    </div>
                  ) : hasMore && schools.length > 0 ? (
                    <button
                      onClick={handleLoadMore}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Load More
                    </button>
                  ) : schools.length > 0 ? (
                    <p className="text-sm text-slate-500">No more schools to load</p>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CompareTray schoolsData={schools} />
    </section>
  );
}
