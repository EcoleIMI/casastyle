import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SlidersHorizontal, X } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import type { Product } from '../types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'];

export function CatalogPage() {
  const { categories } = useStore();
  const [searchParams, setSearchParams] = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const selectedCategory = searchParams.get('category') || 'all';
  const selectedGender = searchParams.get('gender') || 'all';
  const selectedSize = searchParams.get('size') || 'all';
  const selectedColor = searchParams.get('color') || 'all';
  const searchQuery = searchParams.get('search') || '';
  const isNew = searchParams.get('isNew') === '1';
  const onPromo = searchParams.get('onPromo') === '1';
  const inStock = searchParams.get('inStock') === '1';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sort = searchParams.get('sort') || 'newest';

  const updateParam = (key: string, val: string | null) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === 'all' || val === '0') {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next);
  };

  const resetFilters = () => {
    setSearchParams({});
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    const q = new URLSearchParams();
    if (selectedCategory !== 'all') q.set('category', selectedCategory);
    if (selectedGender !== 'all') q.set('gender', selectedGender);
    if (selectedSize !== 'all') q.set('size', selectedSize);
    if (selectedColor !== 'all') q.set('color', selectedColor);
    if (searchQuery) q.set('search', searchQuery);
    if (isNew) q.set('isNew', '1');
    if (onPromo) q.set('onPromo', '1');
    if (inStock) q.set('inStock', '1');
    if (minPrice) q.set('minPrice', minPrice);
    if (maxPrice) q.set('maxPrice', maxPrice);
    if (sort) q.set('sort', sort);

    fetch(`/api/products?${q.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) setProducts(data.products || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [
    selectedCategory,
    selectedGender,
    selectedSize,
    selectedColor,
    searchQuery,
    isNew,
    onPromo,
    inStock,
    minPrice,
    maxPrice,
    sort,
  ]);

  const availableColors = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of products) {
      for (const v of p.variants || []) {
        if (!map.has(v.color_name)) map.set(v.color_name, v.color_hex);
      }
    }
    if (map.size === 0) {
      return [
        ['Noir Onyx', '#111111'],
        ['Beige Sable', '#D8C7AE'],
        ['Ivoire', '#F4EFE6'],
        ['Anthracite', '#2B2B2D'],
        ['Champagne', '#EAE0CE'],
      ] as Array<[string, string]>;
    }
    return Array.from(map.entries());
  }, [products]);

  const pageTitle = isNew
    ? 'Nouveautés'
    : onPromo
    ? 'Promotions'
    : selectedGender !== 'all'
    ? `Collection ${selectedGender}`
    : selectedCategory !== 'all'
    ? categories.find((c) => c.slug === selectedCategory)?.name || 'Catalogue'
    : 'Toute la Boutique';

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header & Controls */}
      <div className="flex flex-col justify-between gap-4 border-b border-[#E5DEC9] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">CASA STYLE Casablanca</p>
          <h1 className="mt-1 font-display text-4xl font-medium text-[#111111]">{pageTitle}</h1>
          {searchQuery && (
            <p className="mt-2 text-sm text-[#6B655D]">
              Résultats pour « <span className="font-medium text-[#111111]">{searchQuery}</span> »
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            className="inline-flex items-center gap-2 border border-[#D7CFC0] bg-white px-4 py-2 text-xs font-medium text-[#111111] lg:hidden cursor-pointer"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filtres</span>
          </button>

          <select
            aria-label="Trier les produits"
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="border border-[#D7CFC0] bg-white px-3.5 py-2 text-xs font-medium text-[#111111] focus:border-[#111111] focus:outline-none"
          >
            <option value="newest">Trier : Nouveautés</option>
            <option value="bestseller">Trier : Meilleures ventes</option>
            <option value="price_asc">Prix : Croissant</option>
            <option value="price_desc">Prix : Décroissant</option>
          </select>

          <span className="text-xs text-[#6B655D] tabular-nums">
            {products.length} {products.length > 1 ? 'pièces' : 'pièce'}
          </span>
        </div>
      </div>

      <div className="mt-8 flex flex-col gap-10 lg:flex-row">
        {/* Sidebar Filters */}
        <aside className={`${filtersOpen ? 'block' : 'hidden'} lg:block w-full lg:w-64 shrink-0 space-y-7`}>
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111111]">Filtres</h2>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[#6B655D] underline hover:text-[#111111] cursor-pointer"
            >
              Réinitialiser
            </button>
          </div>

          {/* Search input inside filters */}
          <div>
            <label className="block text-xs font-medium text-[#5D574F]">Mot-clé</label>
            <div className="relative mt-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => updateParam('search', e.target.value || null)}
                placeholder="Nom, matière..."
                className="w-full border border-[#D7CFC0] bg-white px-3 py-2 text-xs text-[#111111] focus:border-[#111111] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => updateParam('search', null)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B655D] cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Genre */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Collection</h3>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {['all', 'Femme', 'Homme'].map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateParam('gender', g)}
                  className={`px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer ${
                    selectedGender === g
                      ? 'border-[#111111] bg-[#111111] text-white'
                      : 'border-[#D7CFC0] bg-white text-[#3B3732] hover:border-[#111111]'
                  }`}
                >
                  {g === 'all' ? 'Tout' : g}
                </button>
              ))}
            </div>
          </div>

          {/* Catégories */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Catégories</h3>
            <ul className="mt-2.5 space-y-1.5 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => updateParam('category', 'all')}
                  className={`text-left transition-colors cursor-pointer ${
                    selectedCategory === 'all' ? 'font-semibold text-[#111111]' : 'text-[#5D574F] hover:text-[#111111]'
                  }`}
                >
                  Toutes les catégories
                </button>
              </li>
              {categories.map((cat) => (
                <li key={cat.id}>
                  <button
                    type="button"
                    onClick={() => updateParam('category', cat.slug)}
                    className={`text-left transition-colors cursor-pointer ${
                      selectedCategory === cat.slug
                        ? 'font-semibold text-[#9E7B32]'
                        : 'text-[#5D574F] hover:text-[#111111]'
                    }`}
                  >
                    {cat.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* Tailles */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Tailles</h3>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              <button
                type="button"
                onClick={() => updateParam('size', 'all')}
                className={`py-1.5 text-xs font-medium border cursor-pointer ${
                  selectedSize === 'all'
                    ? 'border-[#111111] bg-[#111111] text-white'
                    : 'border-[#D7CFC0] bg-white text-[#3B3732]'
                }`}
              >
                Toutes
              </button>
              {SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => updateParam('size', selectedSize === s ? 'all' : s)}
                  className={`py-1.5 text-xs font-medium border cursor-pointer ${
                    selectedSize === s
                      ? 'border-[#111111] bg-[#111111] text-white'
                      : 'border-[#D7CFC0] bg-white text-[#3B3732] hover:border-[#111111]'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Couleurs */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Couleurs</h3>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {availableColors.map(([name, hex]) => {
                const active = selectedColor.toLowerCase() === name.toLowerCase();
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => updateParam('color', active ? 'all' : name)}
                    title={name}
                    className={`flex items-center gap-1.5 border px-2.5 py-1 text-xs cursor-pointer ${
                      active ? 'border-[#111111] bg-[#111111] text-white' : 'border-[#D7CFC0] bg-white text-[#3B3732]'
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-black/15"
                      style={{ backgroundColor: hex }}
                    />
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Prix MAD */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">Prix (MAD)</h3>
            <div className="mt-2.5 grid grid-cols-2 gap-2">
              <input
                type="number"
                min={0}
                placeholder="Min"
                value={minPrice}
                onChange={(e) => updateParam('minPrice', e.target.value || null)}
                className="border border-[#D7CFC0] bg-white px-2.5 py-1.5 text-xs tabular-nums focus:border-[#111111] focus:outline-none"
              />
              <input
                type="number"
                min={0}
                placeholder="Max"
                value={maxPrice}
                onChange={(e) => updateParam('maxPrice', e.target.value || null)}
                className="border border-[#D7CFC0] bg-white px-2.5 py-1.5 text-xs tabular-nums focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>

          {/* Disponibilité & Offres */}
          <div className="space-y-2.5 border-t border-[#E5DEC9] pt-4 text-xs">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={inStock}
                onChange={(e) => updateParam('inStock', e.target.checked ? '1' : null)}
                className="accent-[#111111]"
              />
              <span>En stock uniquement</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={isNew}
                onChange={(e) => updateParam('isNew', e.target.checked ? '1' : null)}
                className="accent-[#111111]"
              />
              <span>Nouveautés seulement</span>
            </label>
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={onPromo}
                onChange={(e) => updateParam('onPromo', e.target.checked ? '1' : null)}
                className="accent-[#111111]"
              />
              <span>Promotions seulement</span>
            </label>
          </div>
        </aside>

        {/* Products Grid */}
        <div className="flex-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="aspect-[3/4] animate-pulse bg-[#EDE8DF]" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-[#E5DEC9] bg-white p-12 text-center">
              <h3 className="font-display text-2xl text-[#111111]">Aucune pièce ne correspond à vos critères</h3>
              <p className="mt-2 text-sm text-[#6B655D]">
                Essayez d’élargir vos filtres de taille, couleur ou budget.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 bg-[#111111] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
              >
                Voir toute la collection
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
