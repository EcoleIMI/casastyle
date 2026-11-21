import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, ShieldCheck, Sparkles, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

export function HomePage() {
  const { settings, promotions } = useStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    fetch('/api/products')
      .then((r) => r.json())
      .then((data) => {
        if (mounted) setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const newArrivals = products.filter((p) => p.is_new === 1).slice(0, 4);
  const bestsellers = products.filter((p) => p.is_bestseller === 1).slice(0, 4);
  const promos = products.filter((p) => p.promo_price_mad !== null && p.promo_price_mad < p.price_mad).slice(0, 4);

  const heroImage = settings?.hero_banner_url || '/src/assets/images/hero_casastyle_editorial_1795271843982.jpg';

  return (
    <div>
      {/* Hero Banner */}
      <section className="relative h-[78vh] min-h-[540px] max-h-[820px] w-full overflow-hidden bg-[#181614]">
        <img
          src={heroImage}
          alt={settings?.store_name || 'CASA STYLE Casablanca'}
          referrerPolicy="no-referrer"
          className="h-full w-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/15" />

        <div className="absolute inset-0 mx-auto flex max-w-7xl flex-col justify-end px-4 pb-14 sm:px-6 sm:pb-20 lg:px-8">
          <div className="max-w-2xl">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-[#D4B876]">
              {settings?.slogan || 'CASA STYLE – Votre style, votre identité'}
            </p>
            <h1 className="mt-3 font-display text-4xl font-medium leading-[1.08] text-white sm:text-6xl">
              {settings?.hero_title || 'L’allure contemporaine née à Casablanca'}
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-[#E7E1D6] sm:text-base">
              {settings?.hero_subtitle ||
                'Silhouettes épurées, matières nobles et coupes architecturales pour femme et homme.'}
            </p>
            <div className="mt-7 flex flex-wrap items-center gap-4">
              <Link
                to="/boutique"
                className="inline-flex items-center gap-2.5 bg-[#FAF8F5] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#111111] transition-colors hover:bg-[#D4B876]"
              >
                <span>Découvrir la boutique</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/boutique?isNew=1"
                className="inline-flex items-center gap-2 border border-white/60 px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white transition-colors hover:border-white hover:bg-white/10"
              >
                <span>Nouveautés</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Section 1: Nos nouveautés */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E5DEC9] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Édition de Saison</p>
            <h2 className="mt-1 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
              Nos nouveautés
            </h2>
          </div>
          <Link
            to="/boutique?isNew=1"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] hover:text-[#9E7B32]"
          >
            <span>Tout voir</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="aspect-[3/4] animate-pulse bg-[#EDE8DF]" />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {(newArrivals.length > 0 ? newArrivals : products.slice(0, 4)).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      {/* Section 2: Nos collections */}
      <section className="border-y border-[#E5DEC9] bg-[#F3EFE7] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10 text-center">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Univers CASA STYLE</p>
            <h2 className="mt-1 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
              Nos collections
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <Link
              to="/boutique?gender=Femme"
              className="group relative aspect-[3/4] overflow-hidden bg-[#181614]"
            >
              <img
                src="/src/assets/images/cat_femme_collection_1795271844020.jpg"
                alt="Collection Femme CASA STYLE"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#D4B876]">Prêt-à-porter</p>
                <h3 className="mt-1 font-display text-3xl font-medium">Femme</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/90 group-hover:text-[#D4B876]">
                  Explorer <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            <Link
              to="/boutique?gender=Homme"
              className="group relative aspect-[3/4] overflow-hidden bg-[#181614]"
            >
              <img
                src="/src/assets/images/cat_homme_collection_1795271844099.jpg"
                alt="Collection Homme CASA STYLE"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#D4B876]">Tailoring & Essentiels</p>
                <h3 className="mt-1 font-display text-3xl font-medium">Homme</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/90 group-hover:text-[#D4B876]">
                  Explorer <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>

            <Link
              to="/boutique?category=accessoires"
              className="group relative aspect-[3/4] overflow-hidden bg-[#181614]"
            >
              <img
                src="/src/assets/images/prod_sac_cuir_dore_1795271843503.jpg"
                alt="Maroquinerie et Accessoires CASA STYLE"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute inset-x-6 bottom-6 text-white">
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#D4B876]">Cuir & Finitions Or</p>
                <h3 className="mt-1 font-display text-3xl font-medium">Accessoires</h3>
                <span className="mt-3 inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-white/90 group-hover:text-[#D4B876]">
                  Explorer <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Section 3: Meilleures ventes */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <div className="flex flex-col justify-between gap-4 border-b border-[#E5DEC9] pb-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Pièces Plébiscitées</p>
            <h2 className="mt-1 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
              Meilleures ventes
            </h2>
          </div>
          <Link
            to="/boutique?sort=bestseller"
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] hover:text-[#9E7B32]"
          >
            <span>Voir la sélection</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
          {(bestsellers.length > 0 ? bestsellers : products.slice(0, 4)).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* Section 4: Promotions */}
      {promos.length > 0 && (
        <section className="border-t border-[#E5DEC9] bg-white py-16 lg:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 border-b border-[#E5DEC9] pb-5 sm:flex-row sm:items-end">
              <div>
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">
                  {promotions[0]?.title || 'Offres Privilèges'}
                </p>
                <h2 className="mt-1 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
                  Promotions en cours
                </h2>
              </div>
              <Link
                to="/boutique?onPromo=1"
                className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[#111111] hover:text-[#9E7B32]"
              >
                <span>Toutes les promotions</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {promos.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Section 5: Pourquoi choisir CASA STYLE ? */}
      <section className="border-t border-[#E5DEC9] bg-[#FAF8F5] py-16 lg:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Nos Engagements</p>
            <h2 className="mt-1 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
              Pourquoi choisir CASA STYLE ?
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 divide-y divide-[#E5DEC9] border-y border-[#E5DEC9] md:grid-cols-4 md:divide-x md:divide-y-0">
            <div className="py-6 md:px-6 md:first:pl-0">
              <Sparkles className="h-5 w-5 text-[#9E7B32]" />
              <h3 className="mt-4 font-display text-xl font-semibold text-[#111111]">
                Matières Nobles
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5D574F]">
                Lin naturel, satin de soie, laine mérinos et coton Pima sélectionnés avec rigueur.
              </p>
            </div>

            <div className="py-6 md:px-6">
              <Truck className="h-5 w-5 text-[#9E7B32]" />
              <h3 className="mt-4 font-display text-xl font-semibold text-[#111111]">
                Livraison Express Maroc
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5D574F]">
                Expédition en 24h à Casablanca et 48–72h partout au Maroc avec suivi dédié.
              </p>
            </div>

            <div className="py-6 md:px-6">
              <ShieldCheck className="h-5 w-5 text-[#9E7B32]" />
              <h3 className="mt-4 font-display text-xl font-semibold text-[#111111]">
                Paiement à la Livraison
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5D574F]">
                Réglez sereinement en espèces à la réception de votre colis (Cash on Delivery).
              </p>
            </div>

            <div className="py-6 md:px-6 md:last:pr-0">
              <Check className="h-5 w-5 text-[#9E7B32]" />
              <h3 className="mt-4 font-display text-xl font-semibold text-[#111111]">
                Boutique & Échanges
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5D574F]">
                Essayage et retours facilités sous 14 jours ou directement à notre adresse Boulevard d’Anfa.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
