import { Link } from 'react-router-dom';
import { GitCompareArrows, ImageOff, MapPin, Star } from 'lucide-react';
import type { NearbySchool, School } from '../types/school';

interface SchoolCardProps {
  school: NearbySchool;
  isInCompare: boolean;
  isCompareFull: boolean;
  onAddToCompare: (school: School) => void;
  onCardClick?: (schoolId: string) => void;
  onHoverChange?: (schoolId: string | null) => void;
}

function formatSchoolType(type: NearbySchool['type']) {
  if (type === 'primary') return 'Primary';
  if (type === 'secondary') return 'Secondary';
  return 'International';
}

function formatBoard(board: NearbySchool['board']) {
  return board === 'state' ? 'State Board' : board;
}

function formatDistance(distance: number) {
  if (distance < 1000) return `${distance} m away`;
  return `${(distance / 1000).toFixed(distance >= 10_000 ? 0 : 1)} km away`;
}

function renderStars(rating: number) {
  return Array.from({ length: 5 }, (_, index) => {
    const filled = rating >= index + 1 || rating > index + 0.4;
    return (
      <Star
        key={index}
        className={`h-3.5 w-3.5 ${filled ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`}
      />
    );
  });
}

export function SchoolCard({
  school,
  isInCompare,
  isCompareFull,
  onAddToCompare,
  onCardClick,
  onHoverChange,
}: SchoolCardProps) {
  const thumbnail = school.photos[0];
  const facilities = school.facilities.slice(0, 3);
  const disableCompare = isInCompare || isCompareFull;

  return (
    <article
      className="rounded-2xl border border-slate-700/70 bg-slate-900/70 p-4 transition-colors hover:border-sky-500/70 hover:bg-slate-900 cursor-pointer"
      onMouseEnter={() => onHoverChange?.(school.id)}
      onMouseLeave={() => onHoverChange?.(null)}
      onFocus={() => onHoverChange?.(school.id)}
      onBlur={() => onHoverChange?.(null)}
      onClick={() => onCardClick?.(school.id)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onCardClick?.(school.id);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`Open ${school.name} profile`}
    >
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-700/70 bg-slate-950/80">
          {thumbnail ? (
            <img src={thumbnail} alt={school.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-slate-500">
              <ImageOff className="h-6 w-6" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <Link to={`/school/${school.id}`} className="block text-base font-semibold text-white transition-colors hover:text-sky-300">
                {school.name}
              </Link>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full border border-sky-500/40 bg-sky-500/10 px-2.5 py-1 font-medium text-sky-200">
                  {formatSchoolType(school.type)}
                </span>
                <span className="rounded-full border border-slate-700 bg-slate-800/80 px-2.5 py-1 font-medium text-slate-200">
                  {formatBoard(school.board)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <div className="flex items-center justify-end gap-1">{renderStars(school.averageRating)}</div>
              <p className="mt-1 text-xs text-slate-400">
                {school.averageRating.toFixed(1)} · {school.reviewCount} review{school.reviewCount === 1 ? '' : 's'}
              </p>
            </div>
          </div>

          <p className="mt-3 flex items-start gap-2 text-sm text-slate-300">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-300" />
            <span>{school.address}</span>
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {facilities.map((facility) => (
              <span
                key={facility}
                className="rounded-full border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-xs text-slate-200"
              >
                {facility}
              </span>
            ))}
            {facilities.length === 0 && (
              <span className="rounded-full border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-xs text-slate-500">
                Facilities unavailable
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800 pt-4">
        <p className="text-sm font-medium text-slate-300">{formatDistance(school.distance)}</p>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAddToCompare({ id: school.id, name: school.name });
          }}
          disabled={disableCompare}
          className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            disableCompare
              ? 'cursor-not-allowed border border-slate-700 bg-slate-800 text-slate-500'
              : 'border border-sky-500/50 bg-sky-500/10 text-sky-100 hover:bg-sky-500/20'
          }`}
        >
          <GitCompareArrows className="h-4 w-4" />
          {isInCompare ? 'In Compare' : isCompareFull ? 'Compare Full' : 'Add to Compare'}
        </button>
      </div>
    </article>
  );
}

export function SchoolCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex gap-4">
        <div className="h-24 w-24 shrink-0 animate-pulse rounded-2xl bg-slate-800" />
        <div className="flex-1 space-y-3">
          <div className="h-4 w-2/3 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-1/3 animate-pulse rounded bg-slate-800" />
          <div className="h-3 w-full animate-pulse rounded bg-slate-800" />
          <div className="flex gap-2">
            <div className="h-7 w-20 animate-pulse rounded-full bg-slate-800" />
            <div className="h-7 w-24 animate-pulse rounded-full bg-slate-800" />
            <div className="h-7 w-16 animate-pulse rounded-full bg-slate-800" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-slate-800 pt-4">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-800" />
        <div className="h-10 w-36 animate-pulse rounded-full bg-slate-800" />
      </div>
    </div>
  );
}