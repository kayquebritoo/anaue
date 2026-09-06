// ============================================================
// app/reserva/sucesso/[id]/loading.tsx
// Skeleton da página de Confirmação
// ============================================================

export default function SuccessLoading() {
  return (
    <div className="min-h-screen gradient-amazon animate-pulse">
      {/* Header */}
      <div className="px-4 pt-5 pb-2 flex items-center justify-between max-w-2xl mx-auto">
        <div className="h-5 w-20 rounded-full bg-white/10" />
        <div className="h-6 w-36 rounded-full bg-white/10" />
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Celebração skeleton */}
        <div className="flex flex-col items-center space-y-5 py-4">
          <div className="w-32 h-32 rounded-full bg-white/10" />
          <div className="space-y-3 text-center w-full">
            <div className="h-5 w-48 rounded-full bg-white/10 mx-auto" />
            <div className="h-9 w-72 rounded-2xl bg-white/10 mx-auto" />
            <div className="h-4 w-64 rounded-full bg-white/5 mx-auto" />
          </div>
        </div>

        {/* Voucher skeleton */}
        <div className="glass-dark rounded-3xl overflow-hidden border border-white/10">
          <div className="bg-forest-900/50 p-8 text-center space-y-3">
            <div className="h-4 w-32 rounded-full bg-white/10 mx-auto" />
            <div className="h-12 w-48 rounded-2xl bg-white/15 mx-auto" />
            <div className="h-3 w-40 rounded-full bg-white/5 mx-auto" />
          </div>
          <div className="p-5 sm:p-6 space-y-5">
            <div className="text-center pb-4 border-b border-white/8 space-y-2">
              <div className="h-3 w-24 rounded-full bg-white/10 mx-auto" />
              <div className="h-5 w-40 rounded-full bg-white/10 mx-auto" />
              <div className="h-3 w-48 rounded-full bg-white/5 mx-auto" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/5" />
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-white/10">
              <div className="h-4 w-20 rounded-full bg-white/10" />
              <div className="h-8 w-32 rounded-full bg-white/10" />
            </div>
          </div>
        </div>

        {/* Instruções skeleton */}
        <div className="glass rounded-3xl p-5 border border-white/10 space-y-3">
          <div className="h-5 w-36 rounded-full bg-white/10" />
          <div className="space-y-2.5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-white/10 shrink-0 mt-0.5" />
                <div className="h-4 flex-1 rounded-full bg-white/5" />
              </div>
            ))}
          </div>
        </div>

        {/* Botões skeleton */}
        <div className="grid grid-cols-2 gap-3">
          <div className="h-14 rounded-2xl bg-white/5" />
          <div className="h-14 rounded-2xl bg-white/5" />
        </div>

        {/* Botão voltar skeleton */}
        <div className="h-14 rounded-full bg-white/5" />
      </div>
    </div>
  );
}
