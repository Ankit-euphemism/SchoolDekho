import { Link } from 'react-router-dom';
import { X, ArrowRight } from 'lucide-react';
import { useCompare } from '../hooks/useCompare';
import type { NearbySchool } from '../types/school';

interface CompareTrayProps {
  schoolsData?: NearbySchool[];
}

export default function CompareTray({ schoolsData }: CompareTrayProps) {
  const { compareList, removeSchool } = useCompare();

  if (compareList.length === 0) {
    return null;
  }

  const schoolsById = new Map((schoolsData ?? []).map((school) => [school.id, school]));
  const selectedSchools = compareList.map((school) => {
    const schoolDetails = schoolsById.get(school.id);
    return {
      id: school.id,
      name: school.name,
      type: schoolDetails?.type ?? 'School',
      photo: schoolDetails?.photos?.[0],
    };
  });
  const selectedCount = compareList.length;
  const canCompare = selectedCount >= 2;

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 shadow-[0_16px_50px_rgba(2,6,23,0.5)] p-4 max-w-sm w-80">
        {/* Compare Tray Header */}
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="flex -space-x-2">
              {selectedSchools.map((school) => (
                <div
                  key={school.id}
                  className="w-6 h-6 rounded-full border-2 border-slate-800 overflow-hidden bg-slate-700 shrink-0"
                  title={school.name}
                >
                  {school.photo ? (
                    <img
                      src={school.photo}
                      alt={school.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-600" />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm font-medium text-slate-300">
              {selectedCount} school{selectedCount === 1 ? '' : 's'} selected
            </p>
          </div>

          {/* School List in Tray */}
          <div className="space-y-2 mb-4">
            {selectedSchools.map((school) => (
              <div key={school.id} className="flex items-start justify-between gap-2 bg-slate-800/50 p-2 rounded-lg">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-100 line-clamp-1">{school.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{school.type}</p>
                </div>
                <button
                  onClick={() => removeSchool(school.id)}
                  className="mt-1 p-1 text-slate-500 hover:text-rose-400 transition-colors shrink-0"
                  aria-label={`Remove ${school.name}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Compare Now Button */}
        {canCompare ? (
          <Link
            to="/compare"
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Compare Now
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <div className="w-full rounded-lg border border-slate-700 bg-slate-800/70 px-4 py-2.5 text-center text-xs text-slate-300">
            Select at least 2 schools to compare
          </div>
        )}
      </div>
    </div>
  );
}
