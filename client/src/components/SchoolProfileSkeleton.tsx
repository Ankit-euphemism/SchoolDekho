export function SchoolProfileSkeleton() {
  return (
    <div className="animate-pulse">
      {/* Hero section skeleton */}
      <div className="bg-slate-700 h-96 w-full mb-6"></div>

      {/* Main content */}
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header skeleton */}
        <div className="space-y-4">
          <div className="h-8 bg-slate-700 rounded w-2/3"></div>
          <div className="h-4 bg-slate-700 rounded w-1/3"></div>
          <div className="flex space-x-2">
            <div className="w-4 h-4 bg-slate-700 rounded"></div>
            <div className="w-4 h-4 bg-slate-700 rounded"></div>
            <div className="w-4 h-4 bg-slate-700 rounded"></div>
          </div>
        </div>

        {/* Tabs skeleton */}
        <div className="border-b border-slate-700">
          <div className="flex space-x-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-4 bg-slate-700 rounded w-20"></div>
            ))}
          </div>
        </div>

        {/* Content sections */}
        <div className="space-y-6">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-3">
              <div className="h-6 bg-slate-700 rounded w-1/4"></div>
              <div className="space-y-2">
                {[1, 2, 3].map((line) => (
                  <div key={line} className="h-4 bg-slate-700 rounded w-full"></div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-800 rounded-lg p-4 space-y-3">
              <div className="h-4 bg-slate-700 rounded"></div>
              <div className="h-8 bg-slate-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
