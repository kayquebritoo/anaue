// ============================================================
// app/busca/loading.tsx
// Skeleton de Carregamento para a Página de Busca
// ============================================================

import { Skeleton } from '@/components/ui/Skeleton';

export default function SearchLoading() {
  return (
    <div className="min-h-screen bg-forest-950 text-white pb-32">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        {/* Search summary skeleton */}
        <Skeleton className="h-20 w-full rounded-2xl" />

        {/* Filter chips skeleton */}
        <div className="flex gap-2 overflow-hidden py-1">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-9 w-28 rounded-full shrink-0" />
          ))}
        </div>

        {/* Header title skeleton */}
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Vertical cards skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="glass-dark rounded-3xl overflow-hidden p-0 border border-white/10 flex flex-col md:flex-row h-auto md:h-64"
            >
              <Skeleton className="h-56 md:h-full md:w-80 lg:w-96 shrink-0 rounded-none" />
              <div className="p-6 flex-1 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <Skeleton className="h-7 w-3/4 rounded-xl" />
                  <Skeleton className="h-4 w-full rounded-md" />
                  <Skeleton className="h-4 w-2/3 rounded-md" />
                </div>
                <div className="flex justify-between items-end pt-4 border-t border-white/10">
                  <Skeleton className="h-8 w-28 rounded-xl" />
                  <Skeleton className="h-10 w-32 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
