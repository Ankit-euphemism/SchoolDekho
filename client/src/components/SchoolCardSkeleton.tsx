export function SchoolCardSkeleton() {
  return (
    <div className="bg-slate-800 rounded-lg overflow-hidden shadow-lg animate-pulse border border-slate-700">
      {/* Image skeleton */}
      <div className="w-full h-48 bg-slate-700"></div>

      {/* Content skeleton */}
      <div className="p-4 space-y-4">
        {/* Title */}
        <div className="h-6 bg-slate-700 rounded w-3/4"></div>

        {/* Location */}
        <div className="h-4 bg-slate-700 rounded w-1/2"></div>

        {/* Rating */}
        <div className="flex space-x-1">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="w-4 h-4 bg-slate-700 rounded"></div>
          ))}
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="h-4 bg-slate-700 rounded"></div>
          <div className="h-4 bg-slate-700 rounded"></div>
        </div>

        {/* Button */}
        <div className="h-10 bg-slate-700 rounded w-full pt-2"></div>
      </div>
    </div>
  );
}

export function SchoolCardSkeleton3Pack() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {[1, 2, 3].map((i) => (
        <SchoolCardSkeleton key={i} />
      ))}
    </div>
  );
}
