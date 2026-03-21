import { X, Check, Minus } from 'lucide-react';
import type { SchoolProfileResponse } from '../api/schools';
import { FACILITY_CATEGORIES } from '../constants/facilities';

interface ComparisonTableProps {
  schools: SchoolProfileResponse[];
  onRemoveSchool: (id: string) => void;
}

// Numeric value extractors for highlighting winners
function extractNumericValue(value: unknown): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    // Extract number from fee range like "Rs 1.2L/yr"
    const match = value.match(/[\d.]+/);
    if (match) return parseFloat(match[0]);
  }
  return null;
}

function getWinnerForMetric(metric: string, values: (unknown | null)[]): number {
  const numericValues = values.map((v) => extractNumericValue(v));
  const validValues = numericValues.filter((v) => v !== null) as number[];
  
  if (validValues.length === 0) return -1;
  
  // For fees and student ratio, lower is better; for rating/facilities, higher is better
  if (metric === 'fees' || metric === 'studentTeacherRatio') {
    const min = Math.min(...validValues);
    return values.findIndex((v) => extractNumericValue(v) === min);
  }
  
  const max = Math.max(...validValues);
  return values.findIndex((v) => extractNumericValue(v) === max);
}

function calculateTotalFacilities(school: SchoolProfileResponse): number {
  return school.facilities?.length ?? 0;
}

function hasFacilityInCategory(school: SchoolProfileResponse, facilityList: string[]): boolean {
  const schoolFacilities = school.facilities ?? [];
  return facilityList.some(f => schoolFacilities.some(sf => sf.toLowerCase().includes(f.toLowerCase())));
}

export default function ComparisonTable({ schools, onRemoveSchool }: ComparisonTableProps) {
  if (schools.length === 0) return null;

  // Prepare data for numeric rows
  const ratings = schools.map((s) => s.averageRating ?? 0);
  const ratingWinner = getWinnerForMetric('rating', ratings);

  const fees = schools.map((s) => s.fees?.max ?? null);
  const feeWinner = getWinnerForMetric('fees', fees);

  const facilities = schools.map((s) => calculateTotalFacilities(s));
  const facilityWinner = getWinnerForMetric('facilities', facilities);

  return (
    <div className="space-y-6">
      {/* School Headers */}
      <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-4 overflow-x-auto">
        <div className="flex gap-4 min-w-max">
          <div className="w-48"></div>
          {schools.map((school) => (
            <div key={school._id} className="w-44 shrink-0">
              <div className="relative">
                {school.photos?.[0] && (
                  <img
                    src={school.photos[0]}
                    alt={school.name}
                    className="w-40 h-24 rounded-xl object-cover border border-slate-700"
                  />
                )}
                <div className="mt-2 pr-6">
                  <h3 className="font-semibold text-slate-100 text-sm line-clamp-2">{school.name}</h3>
                  <p className="text-xs text-slate-400 mt-1">{school.board}</p>
                </div>
                <button
                  onClick={() => onRemoveSchool(school._id)}
                  className="absolute -top-2 -right-2 p-1 bg-slate-900 border border-slate-700 rounded-full text-slate-400 hover:text-rose-400 transition-colors"
                  aria-label="Remove school"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="space-y-4">
        {/* Basic Info */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Type', key: 'type', numeric: false },
                { label: 'Board', key: 'board', numeric: false },
              ].map((row, idx) => (
                <tr key={row.key} className={idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/40'}>
                  <td className="px-4 py-3 font-medium text-slate-200 w-48 whitespace-nowrap">{row.label}</td>
                  {schools.map((school) => (
                    <td key={school._id} className="px-4 py-3 text-slate-300 min-w-max">
                    {String(school[row.key as keyof SchoolProfileResponse] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Numeric Metrics (with highlighting) */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Average Rating', values: ratings, winner: ratingWinner },
                { label: 'Max Annual Fee', values: fees, winner: feeWinner },
                { label: 'Total Facilities', values: facilities, winner: facilityWinner },
              ].map((row, idx) => (
                <tr key={row.label} className={idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/40'}>
                  <td className="px-4 py-3 font-medium text-slate-200 w-48 whitespace-nowrap">{row.label}</td>
                  {schools.map((school, schoolIdx) => {
                    const isWinner = row.winner === schoolIdx;
                    return (
                      <td
                        key={school._id}
                        className={`px-4 py-3 min-w-max font-medium ${
                          isWinner ? 'bg-emerald-900/40 text-emerald-200' : 'text-slate-300'
                        }`}
                      >
                        {row.values[schoolIdx] ?? '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Location and Other Details */}
        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[
                { label: 'Address', key: 'address', numeric: false },
                { label: 'Established', key: 'established', numeric: false },
              ].map((row, idx) => (
                <tr key={row.key} className={idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/40'}>
                  <td className="px-4 py-3 font-medium text-slate-200 w-48 whitespace-nowrap">{row.label}</td>
                  {schools.map((school) => (
                    <td key={school._id} className="px-4 py-3 text-slate-300 min-w-max">
                      {String(school[row.key as keyof SchoolProfileResponse] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Facilities by Category */}
        {Object.entries(FACILITY_CATEGORIES).map(([category, facilityList]) => (
          <div key={category} className="rounded-2xl border border-slate-700/70 bg-slate-900/40 overflow-x-auto">
            <div className="bg-slate-800/60 px-4 py-2 border-b border-slate-700">
              <h3 className="font-semibold text-slate-200 text-sm">{category}</h3>
            </div>
            <table className="w-full text-sm">
              <tbody>
                {facilityList.map((facility, facilityIdx) => (
                  <tr key={facility} className={facilityIdx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-800/40'}>
                    <td className="px-4 py-3 font-medium text-slate-200 w-48 whitespace-nowrap text-xs">{facility}</td>
                    {schools.map((school) => (
                      <td key={school._id} className="px-4 py-3 min-w-max">
                        {hasFacilityInCategory(school, [facility]) ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <Minus className="w-4 h-4 text-slate-600" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}
