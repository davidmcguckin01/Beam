"use client";

export function GhostCards() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden hidden md:block">
      {/* Messy feedback cards on the left */}
      <div 
        className="absolute left-[5%] top-[45%] w-48 md:w-56 opacity-25 blur-[2px] animate-float-slow"
        style={{
          animation: 'float 6s ease-in-out infinite',
          animationDelay: '0s'
        }}
      >
        <div className="bg-white/12 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white/25">
          <div className="space-y-2">
            <div className="h-2 bg-gray-400/40 rounded w-3/4" />
            <div className="h-2 bg-gray-400/40 rounded w-full" />
            <div className="h-2 bg-gray-400/40 rounded w-5/6" />
            <div className="h-2 bg-gray-400/40 rounded w-2/3 mt-3" />
          </div>
        </div>
      </div>

      <div 
        className="absolute left-[8%] top-[55%] w-44 md:w-52 opacity-20 blur-[2px] animate-float-slow"
        style={{
          animation: 'float 8s ease-in-out infinite',
          animationDelay: '1s'
        }}
      >
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-3 shadow-xl border border-white/20">
          <div className="space-y-2">
            <div className="h-2 bg-gray-400/35 rounded w-full" />
            <div className="h-2 bg-gray-400/35 rounded w-4/5" />
          </div>
        </div>
      </div>

      {/* Organized task cards on the right */}
      <div 
        className="absolute right-[5%] top-[40%] w-52 md:w-64 opacity-30 blur-[2px] animate-float-slow"
        style={{
          animation: 'float 7s ease-in-out infinite',
          animationDelay: '0.5s'
        }}
      >
        <div className="bg-white/18 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white/30">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-400/50 rounded-full animate-pulse" />
              <div className="h-2 bg-gray-300/50 rounded w-1/2" />
            </div>
            <div className="h-2 bg-gray-300/50 rounded w-full" />
            <div className="h-2 bg-gray-300/50 rounded w-3/4" />
            <div className="flex gap-2 mt-3">
              <div className="h-4 w-16 bg-orange-400/40 rounded" />
              <div className="h-4 w-20 bg-gray-400/40 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div 
        className="absolute right-[8%] top-[52%] w-48 md:w-60 opacity-25 blur-[2px] animate-float-slow"
        style={{
          animation: 'float 6.5s ease-in-out infinite',
          animationDelay: '1.5s'
        }}
      >
        <div className="bg-white/15 backdrop-blur-md rounded-lg p-4 shadow-xl border border-white/28">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 bg-orange-400/45 rounded-full" />
              <div className="h-2 bg-gray-300/45 rounded w-2/3" />
            </div>
            <div className="h-2 bg-gray-300/45 rounded w-full" />
            <div className="flex gap-2 mt-3">
              <div className="h-4 w-14 bg-orange-400/35 rounded" />
            </div>
          </div>
        </div>
      </div>

      <div 
        className="absolute right-[6%] top-[64%] w-44 md:w-56 opacity-20 blur-[2px] animate-float-slow"
        style={{
          animation: 'float 7.5s ease-in-out infinite',
          animationDelay: '2s'
        }}
      >
        <div className="bg-white/15 backdrop-blur-md rounded-lg p-3 shadow-xl border border-white/25">
          <div className="space-y-2">
            <div className="h-2 bg-gray-300/45 rounded w-full" />
            <div className="h-2 bg-gray-300/45 rounded w-4/5" />
          </div>
        </div>
      </div>

    </div>
  );
}

