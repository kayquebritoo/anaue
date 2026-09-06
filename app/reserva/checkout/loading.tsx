// ============================================================
// app/reserva/checkout/loading.tsx
// Skeleton da página de Checkout
// ============================================================

export default function CheckoutLoading() {
  return (
    <div className="min-h-screen gradient-amazon pb-36 animate-pulse">
      {/* Header skeleton */}
      <div className="sticky top-0 z-30 glass-dark border-b border-white/8 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="h-5 w-20 rounded-full bg-white/10" />
          <div className="h-5 w-36 rounded-full bg-white/10" />
          <div className="h-5 w-24 rounded-full bg-white/10" />
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 sm:pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 xl:gap-8 items-start">
          {/* Coluna formulários */}
          <div className="space-y-8 order-2 lg:order-1">
            {/* Add-ons skeleton */}
            <div className="space-y-4">
              <div className="h-7 w-56 rounded-full bg-white/10" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-52 rounded-2xl bg-white/5" />
                ))}
              </div>
            </div>

            {/* Guest form skeleton */}
            <div className="space-y-4">
              <div className="h-7 w-48 rounded-full bg-white/10" />
              <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 space-y-4">
                <div className="h-12 rounded-2xl bg-white/5" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-12 rounded-2xl bg-white/5" />
                  <div className="h-12 rounded-2xl bg-white/5" />
                </div>
                <div className="h-12 rounded-2xl bg-white/5" />
                <div className="h-20 rounded-2xl bg-white/5" />
              </div>
            </div>

            {/* Payment skeleton */}
            <div className="space-y-4">
              <div className="h-7 w-44 rounded-full bg-white/10" />
              <div className="h-14 rounded-2xl bg-white/5" />
              <div className="h-52 rounded-3xl bg-white/5" />
            </div>
          </div>

          {/* Coluna resumo */}
          <div className="order-1 lg:order-2">
            <div className="glass-dark rounded-3xl p-5 sm:p-6 border border-white/10 space-y-6">
              <div className="flex gap-4">
                <div className="w-20 h-20 rounded-2xl bg-white/10 shrink-0" />
                <div className="space-y-2 flex-1">
                  <div className="h-5 w-3/4 rounded-full bg-white/10" />
                  <div className="h-4 w-1/2 rounded-full bg-white/10" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="h-16 rounded-xl bg-white/5" />
                <div className="h-16 rounded-xl bg-white/5" />
              </div>
              <div className="space-y-3 pt-4 border-t border-white/10">
                <div className="h-4 w-full rounded-full bg-white/5" />
                <div className="h-4 w-3/4 rounded-full bg-white/5" />
                <div className="h-8 w-1/2 ml-auto rounded-full bg-white/10 mt-4" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar skeleton */}
      <div className="fixed bottom-0 inset-x-0 z-40 p-4 bg-forest-950/90 border-t border-white/10">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="h-3 w-28 rounded-full bg-white/10" />
            <div className="h-8 w-36 rounded-full bg-white/10" />
          </div>
          <div className="h-14 w-44 rounded-full bg-forest-700/60" />
        </div>
      </div>
    </div>
  );
}
