import { Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, Users, Sparkles, ArrowRight, TreePine } from 'lucide-react';
import { getExperiencesAsync } from '@/lib/supabaseData';
import { formatPrice } from '@/lib/mockData';
import type { Experience } from '@/types';

export const dynamic = 'force-dynamic';

const CATEGORY_LABEL: Record<string, string> = {
  'bem-estar': 'Bem-estar',
  aventura: 'Aventura',
  gastronomia: 'Gastronomia',
  logistica: 'Logística',
};

const CATEGORY_COLOR: Record<string, string> = {
  'bem-estar': 'text-gold-400 bg-gold-400/15 border-gold-400/30',
  aventura: 'text-forest-400 bg-forest-400/15 border-forest-400/30',
  gastronomia: 'text-amber-400 bg-amber-400/15 border-amber-400/30',
  logistica: 'text-blue-400 bg-blue-400/15 border-blue-400/30',
};

function ExperienceCard({ experience }: { experience: Experience }) {
  return (
    <Link
      href={`/experiencias/${experience.slug}`}
      className="group relative rounded-3xl overflow-hidden cursor-pointer shadow-2xl shadow-black/40
        hover:shadow-forest-900/40 transition-shadow duration-500"
    >
      {/* Image */}
      <div className="relative h-72 sm:h-80 w-full overflow-hidden">
        <Image
          src={experience.imageUrl}
          alt={experience.name}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover object-center group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border backdrop-blur-sm ${CATEGORY_COLOR[experience.category] || CATEGORY_COLOR['bem-estar']}`}>
            {CATEGORY_LABEL[experience.category] || experience.category}
          </span>
          {experience.isPopular && (
            <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-gold-400/20 border border-gold-400/40 text-gold-300 backdrop-blur-sm">
              <Sparkles className="w-3 h-3" />
              Popular
            </span>
          )}
        </div>

        {/* Duration */}
        <div className="absolute top-4 right-4">
          <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full glass text-white/80 backdrop-blur-sm">
            <Clock className="w-3 h-3" />
            {experience.duration}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="absolute bottom-0 inset-x-0 p-5">
        <h3 className="font-serif text-xl font-bold text-white leading-tight mb-1 group-hover:text-forest-300 transition-colors">
          {experience.name}
        </h3>
        <p className="text-white/60 text-xs leading-relaxed line-clamp-2 mb-3">
          {experience.shortDescription}
        </p>

        <div className="flex items-end justify-between">
          <div>
            <span className="text-white/40 text-[10px] uppercase tracking-wider block">
              {experience.priceType === 'per_person' ? 'Por pessoa' : 'Valor fixo'}
            </span>
            <span className="text-gradient-gold text-xl font-bold font-serif">
              {formatPrice(experience.price)}
            </span>
          </div>

          <span className="flex items-center gap-1.5 text-forest-400 text-xs font-semibold
            group-hover:text-forest-300 group-hover:gap-2.5 transition-all">
            Ver detalhes
            <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  );
}

async function ExperiencesGrid() {
  const experiences = await getExperiencesAsync();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {experiences.map((exp) => (
        <ExperienceCard key={exp.id} experience={exp} />
      ))}
    </div>
  );
}

export default function ExperiencesPage() {
  return (
    <div className="min-h-screen gradient-amazon pb-20">
      {/* Hero */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4">
        <div className="absolute inset-0 opacity-20">
          <TreePine className="absolute -top-20 -right-20 w-96 h-96 text-forest-400/30" />
          <TreePine className="absolute -bottom-32 -left-16 w-80 h-80 text-forest-500/20" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative z-10">
          <span className="text-gold-400/80 text-xs uppercase tracking-[0.25em] font-semibold">
            Amazonia Viva
          </span>
          <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-white mt-3 mb-4">
            Experiencias
          </h1>
          <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Rituais ancestrais, trilhas na selva e imersão na cultura amazônica.
            Cada experiência é guiada por moradores locais que conhecem cada segredo da floresta.
          </p>
        </div>
      </section>

      {/* Grid */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6">
        <Suspense
          fallback={
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => (
                <div key={i} className="rounded-3xl bg-white/5 animate-pulse h-[400px]" />
              ))}
            </div>
          }
        >
          <ExperiencesGrid />
        </Suspense>
      </section>
    </div>
  );
}
