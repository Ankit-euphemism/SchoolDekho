export default function PageLoadingFallback() {
  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="space-y-4">
          {/* Logo/Header loading */}
          <div className="text-center mb-8">
            <div className="inline-block">
              <div className="w-12 h-12 bg-linear-to-r from-blue-500 to-cyan-500 rounded-lg animate-pulse"></div>
            </div>
          </div>

          {/* Main content skeleton */}
          <div className="space-y-4">
            <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
            <div className="h-4 bg-slate-700 rounded animate-pulse w-3/4"></div>
            
            {/* Card skeleton */}
            <div className="mt-8 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-slate-800 rounded-lg p-4 space-y-3 animate-pulse">
                  <div className="h-6 bg-slate-700 rounded"></div>
                  <div className="h-4 bg-slate-700 rounded w-4/5"></div>
                  <div className="h-4 bg-slate-700 rounded w-3/5"></div>
                </div>
              ))}
            </div>
          </div>

          {/* Loading text */}
          <div className="text-center mt-12">
            <div className="inline-flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
            </div>
            <p className="text-slate-400 mt-4 text-sm">Loading...</p>
          </div>
        </div>
      </div>
    </div>
  );
}
