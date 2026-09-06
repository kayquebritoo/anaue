import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { getExperienceBySlugAsync, getExperiencesAsync } from '@/lib/supabaseData';
import { formatPrice } from '@/lib/mockData';
import { Clock, Users, ArrowLeft, Sparkles, Shield, CalendarDays } from 'lucide-react';
import { ExperienceBookingWidget } from '@/components/experience/ExperienceBookingWidget';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const experiences = await getExperiencesAsync();
  return experiences.map((exp) => ({
    slug: exp.slug,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const experience = await getExperienceBySlugAsync(slug);

  if (!experience) {
    return { title: 'Experiência Não Encontrada — Anauê Amazônia' };
  }

  return {
    title: `${experience.name} — Experiência Anauê Amazônia`,
    description: experience.shortDescription,
    openGraph: {
      title: `${experience.name} — Experiência Anauê Amazônia`,
      description: experience.shortDescription,
      images: [experience.imageUrl],
    },
  };
}

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

export default async function ExperienceDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const experience = await getExperienceBySlugAsync(slug);

  if (!experience) notFound();

  return (
    <div className="min-h-screen gradient-amazon pb-32">
      {/* Hero Image */}
      <section className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
        <Image
          src={experience.imageUrl}
          alt={experience.name}
          fill
          sizes="100vw"
          className="object-cover object-center"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-t from-forest-950 via-forest-950/40 to-transparent" />

        {/* Back link */}
        <div className="absolute top-6 left-4 sm:left-6 z-10">
          <Link
            href="/experiencias"
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm glass-dark px-4 py-2 rounded-full"
          >
            <ArrowLeft className="w-4 h-4" />
            Experiências
          </Link>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 inset-x-0 p-6 sm:p-10">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-3">
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
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-white mb-2">
              {experience.name}
            </h1>
            <p className="text-white/60 text-sm sm:text-base max-w-2xl">
              {experience.shortDescription}
            </p>
          </div>
        </div>
      </section>

      {/* Details */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-8">
          {/* Left: Description */}
          <div className="space-y-8">
            {/* Quick info */}
            <div className="grid grid-cols-3 gap-3">
              <div className="glass-dark rounded-2xl p-4 border border-white/10 text-center">
                <Clock className="w-5 h-5 text-forest-400 mx-auto mb-1.5" />
                <p className="text-white font-bold text-sm">{experience.duration}</p>
                <p className="text-white/40 text-[10px] uppercase">Duração</p>
              </div>
              <div className="glass-dark rounded-2xl p-4 border border-white/10 text-center">
                <Users className="w-5 h-5 text-gold-400 mx-auto mb-1.5" />
                <p className="text-white font-bold text-sm">
                  {experience.priceType === 'per_person' ? 'Por pessoa' : 'Fixo'}
                </p>
                <p className="text-white/40 text-[10px] uppercase">Tipo</p>
              </div>
              <div className="glass-dark rounded-2xl p-4 border border-white/10 text-center">
                <Sparkles className="w-5 h-5 text-agua-400 mx-auto mb-1.5" />
                <p className="text-white font-bold text-sm capitalize">
                  {CATEGORY_LABEL[experience.category] || experience.category}
                </p>
                <p className="text-white/40 text-[10px] uppercase">Categoria</p>
              </div>
            </div>

            {/* Long description */}
            <div className="glass-dark rounded-3xl p-6 sm:p-8 border border-white/10">
              <h2 className="font-serif text-lg font-bold text-white mb-4">Sobre a Experiência</h2>
              <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">
                {experience.longDescription}
              </p>
            </div>

            {/* Gallery */}
            {experience.gallery_images && experience.gallery_images.length > 0 && (
              <div className="glass-dark rounded-3xl p-6 border border-white/10">
                <h2 className="font-serif text-lg font-bold text-white mb-4">Galeria</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {experience.gallery_images.slice(0, 6).map((img, i) => (
                    <div key={i} className="relative aspect-square rounded-xl overflow-hidden">
                      <Image
                        src={img}
                        alt={`${experience.name} - ${i + 1}`}
                        fill
                        sizes="200px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking widget (sticky) */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <ExperienceBookingWidget experience={experience} />
          </div>
        </div>
      </section>
    </div>
  );
}
