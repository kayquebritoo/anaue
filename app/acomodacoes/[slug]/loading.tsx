// ============================================================
// app/acomodacoes/[slug]/loading.tsx
// Skeleton de Carregamento para a Página de Detalhes
// ============================================================

import { Skeleton } from '@/components/ui/Skeleton';

export default function RoomDetailLoading() {
  return (
    <div className="min-h-screen bg-forest-950 text-white pb-32">
      {/* Hero Skeleton Edge-to-Edge */}
      <div className="relative w-full h-[52vh] sm:h-[60vh] md:h-[68vh] overflow-hidden">
        <Skeleton className="w-full h-full rounded-none" />
      </div>

      {/* Content Skeleton */}
      <div className="max-w-4xl mx-auto px-5 sm:px-6 pt-6 sm:pt-8 space-y-8">
        {/* Header Skeleton */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Skeleton className="h-6 w-28 rounded-full" />
            <Skeleton className="h-6 w-36 rounded-full" />
          </div>
          <Skeleton className="h-10 sm:h-12 w-3/4 rounded-2xl" />
          <Skeleton className="h-6 w-full rounded-xl" />
          <Skeleton className="h-6 w-2/3 rounded-xl" />
        </div>

        {/* Specs Grid Skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>

        {/* Long Description Skeleton */}
        <div className="glass-dark rounded-3xl p-6 sm:p-8 space-y-4">
          <Skeleton className="h-7 w-48 rounded-xl" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-full rounded-lg" />
          <Skeleton className="h-4 w-4/5 rounded-lg" />
        </div>

        {/* Amenities Skeleton */}
        <div className="space-y-4">
          <Skeleton className="h-7 w-56 rounded-xl" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-14 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>

      {/* Sticky Bar Skeleton */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-forest-950/80 backdrop-blur-2xl border-t border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-20 rounded-md" />
            <Skeleton className="h-7 w-32 rounded-xl" />
          </div>
          <Skeleton className="h-12 w-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
