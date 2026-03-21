import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../hooks/useCompare';
import { useSeo } from '../hooks/useSeo';
import { getSchoolById, type SchoolProfileResponse } from '../api/schools';
import ComparisonTable from '../components/ComparisonTable';
import { getErrorMessage } from '../utils/httpError';
import { Plus, GraduationCap, AlertCircle, Loader } from 'lucide-react';

export default function ComparePage() {
  useSeo({
    title: 'Compare Schools',
    description: 'Compare schools side-by-side. View fees, facilities, ratings, and other details to help you make the best choice for your child.',
  });
  const { compareList, removeSchool } = useCompare();
  const [schools, setSchools] = useState<SchoolProfileResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUpdatingCompare, setIsUpdatingCompare] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (compareList.length === 0) {
      queueMicrotask(() => {
        setSchools([]);
        setLoading(false);
        setIsUpdatingCompare(false);
      });
      return;
    }

    const controller = new AbortController();
    let isMounted = true;

    // Defer initial state updates to next microtask
    queueMicrotask(() => {
      if (isMounted) {
        // Keep UI in sync when schools are removed from compare list.
        setSchools((prev) => prev.filter((school) => compareList.some((compareSchool) => compareSchool.id === school._id)));
        setLoading(true);
        setError(null);
      }
    });

    Promise.all(
      compareList.map((school) =>
        getSchoolById(school.id, controller.signal).catch(() => {
          return null;
        }),
      ),
    )
      .then((results) => {
        if (isMounted) {
          setSchools(results.filter(Boolean) as SchoolProfileResponse[]);
          setError(null);
          setLoading(false);
          setIsUpdatingCompare(false);
        }
      })
      .catch((err) => {
        if (isMounted && err.name !== 'AbortError') {
          setError(getErrorMessage(err, 'Failed to load school details. Please try again.'));
          setLoading(false);
          setIsUpdatingCompare(false);
        }
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [compareList]);

  const emptySlots = Math.max(0, 3 - compareList.length);
  const showAddSchoolUi = !isUpdatingCompare && !loading && compareList.length < 3;

  function handleRemoveSchool(id: string) {
    setIsUpdatingCompare(true);
    removeSchool(id);
  }

  // Empty state
  if (compareList.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-10 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
          <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Compare Schools</h1>
          <p className="text-sm text-slate-300 mb-6">Add schools from search to compare them side by side.</p>
          <Link
            to="/map"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 transition-colors"
          >
            Browse Schools
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="rounded-2xl border border-rose-700/70 bg-rose-950/40 p-8">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Error Loading Schools</h1>
          <p className="text-sm text-slate-300 mb-6">{error}</p>
          <Link
            to="/search"
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 transition-colors"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 sm:py-10">
      <div className="rounded-2xl border border-slate-700/70 bg-linear-to-br from-slate-900 via-slate-800 to-slate-900 p-4 sm:p-6 shadow-[0_16px_50px_rgba(2,6,23,0.35)]">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <h1 className="text-2xl font-bold text-white">Compare Schools</h1>
          {showAddSchoolUi && (
            <Link
              to="/search"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-700 text-white text-sm font-medium rounded-lg hover:bg-sky-800 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add School
            </Link>
          )}
        </div>

        {/* School Cards Header */}
        <div className="mb-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {schools.map((school) => (
            <div key={school._id} className="p-4 border border-slate-700 rounded-xl relative bg-slate-900/50">
              {school.photos?.[0] && (
                <img
                  src={school.photos[0]}
                  alt={school.name}
                  className="w-full h-32 rounded-lg object-cover mb-3 border border-slate-700"
                />
              )}
              <div>
                <h3 className="font-semibold text-slate-100">{school.name}</h3>
                <p className="text-sm text-slate-400 mt-1">{school.board}</p>
                {school.averageRating !== undefined && (
                  <p className="text-sm text-amber-300 font-medium mt-2">
                    ⭐ {school.averageRating.toFixed(0)} / 5
                  </p>
                )}
              </div>
            </div>
          ))}

          {/* Add More Schools Slots */}
          {showAddSchoolUi && Array.from({ length: emptySlots }).map((_, index) => (
            <Link
              key={index}
              to="/search"
              className="flex flex-col items-center justify-center p-4 border border-dashed border-slate-600 rounded-xl text-slate-400 hover:border-sky-400 hover:text-sky-300 transition-colors"
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-medium">Add School</span>
            </Link>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <Loader className="w-8 h-8 text-sky-500 animate-spin" />
              <p className="text-slate-400 text-sm">Loading school details...</p>
            </div>
          </div>
        )}

        {/* Comparison Table */}
        {!loading && schools.length > 0 && (
          <>
            <div className="border-t border-slate-700 pt-8 mt-8">
              <ComparisonTable schools={schools} onRemoveSchool={handleRemoveSchool} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
