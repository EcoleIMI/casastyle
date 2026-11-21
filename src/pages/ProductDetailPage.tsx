import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronRight, Heart, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMad, type Product } from '../types';

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart, isFavorite, toggleFavorite, settings } = useStore();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImageIdx, setActiveImageIdx] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch(`/api/products/${encodeURIComponent(slug || '')}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!active) return;
        const prod = data?.product as Product | null;
        setProduct(prod);
        setActiveImageIdx(0);
        setQuantity(1);
        if (prod?.variants?.length) {
          const firstAvail = prod.variants.find((v) => v.stock > 0) || prod.variants[0];
          setSelectedSize(firstAvail.size);
          setSelectedColor(firstAvail.color_name);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [slug]);

  const sizes = useMemo(() => {
    if (!product?.variants?.length) return [];
    return Array.from(new Set(product.variants.map((v) => v.size)));
  }, [product]);

  const colors = useMemo(() => {
    if (!product?.variants?.length) return [];
    const map = new Map<string, string>();
    for (const v of product.variants) {
      map.set(v.color_name, v.color_hex);
    }
    return Array.from(map.entries());
  }, [product]);

  const activeVariant = useMemo(() => {
    if (!product?.variants?.length) return null;
    return (
      product.variants.find((v) => v.size === selectedSize && v.color_name === selectedColor) ||
      product.variants.find((v) => v.size === selectedSize) ||
      product.variants.find((v) => v.color_name === selectedColor) ||
      product.variants[0]
    );
  }, [product, selectedSize, selectedColor]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
          <div className="aspect-[3/4] animate-pulse bg-[#EDE8DF]" />
          <div className="space-y-4">
            <div className="h-8 w-2/3 animate-pulse bg-[#EDE8DF]" />
            <div className="h-6 w-1/3 animate-pulse bg-[#EDE8DF]" />
            <div className="h-32 w-full animate-pulse bg-[#EDE8DF]" />
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-4xl text-[#111111]">Pièce introuvable</h1>
        <p className="mt-3 text-sm text-[#6B655D]">
          Ce produit n’est plus disponible dans notre catalogue.
        </p>
        <Link
          to="/boutique"
          className="mt-6 inline-block bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white"
        >
          Retour à la boutique
        </Link>
      </div>
    );
  }

  const images = product.images?.length
    ? product.images.map((i) => i.image_url)
    : product.primary_image
    ? [product.primary_image]
    : [];

  const effectivePrice =
    product.promo_price_mad !== null && product.promo_price_mad < product.price_mad
      ? product.promo_price_mad
      : product.price_mad;
  const hasPromo = product.promo_price_mad !== null && product.promo_price_mad < product.price_mad;

  const variantStock = activeVariant ? activeVariant.stock : product.stock_total;
  const isOut = variantStock <= 0;
  const fav = isFavorite(product.id);

  const handleAddToCart = () => {
    if (isOut) return;
    addToCart({
      product_id: product.id,
      variant_id: activeVariant?.id,
      slug: product.slug,
      name: product.name,
      image: images[0] || '',
      size: activeVariant?.size || selectedSize || 'Unique',
      color_name: activeVariant?.color_name || selectedColor || 'Standard',
      unit_price_mad: effectivePrice,
      quantity,
      max_stock: variantStock,
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-2 text-xs text-[#6B655D]">
        <Link to="/" className="hover:text-[#111111]">Accueil</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link to="/boutique" className="hover:text-[#111111]">Boutique</Link>
        {product.category_name && (
          <>
            <ChevronRight className="h-3.5 w-3.5" />
            <Link to={`/boutique?category=${product.category_slug}`} className="hover:text-[#111111]">
              {product.category_name}
            </Link>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="truncate text-[#111111] font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:items-start">
        {/* Left: Multi-Image Gallery */}
        <div className="lg:col-span-7 flex flex-col-reverse gap-4 sm:flex-row">
          {images.length > 1 && (
            <div className="flex sm:flex-col gap-3 overflow-x-auto sm:w-20 shrink-0">
              {images.map((img, idx) => (
                <button
                  key={`${img}-${idx}`}
                  type="button"
                  onClick={() => setActiveImageIdx(idx)}
                  className={`aspect-[3/4] w-16 sm:w-full overflow-hidden border transition-all cursor-pointer ${
                    activeImageIdx === idx ? 'border-[#111111]' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img}
                    alt={`${product.name} vue ${idx + 1}`}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="aspect-[3/4] w-full overflow-hidden bg-[#EDE8DF]">
            {images[activeImageIdx] ? (
              <img
                src={images[activeImageIdx]}
                alt={product.name}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center p-8 text-center font-display text-3xl text-[#111111]">
                {product.name}
              </div>
            )}
          </div>
        </div>

        {/* Right: Contiguous Purchase Module */}
        <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">
              {product.brand} · {product.category_name || product.gender}
            </p>
            <h1 className="mt-2 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
              {product.name}
            </h1>

            <div className="mt-4 flex items-baseline gap-3 tabular-nums">
              <span className="text-2xl font-semibold text-[#111111]">{formatMad(effectivePrice)}</span>
              {hasPromo && (
                <span className="text-base text-[#8B847A] line-through">{formatMad(product.price_mad)}</span>
              )}
            </div>

            <p className="mt-2 text-xs font-medium">
              {isOut ? (
                <span className="text-red-700">Rupture de stock sur cette combinaison</span>
              ) : variantStock <= 4 ? (
                <span className="text-amber-700">Stock limité — {variantStock} disponible(s)</span>
              ) : (
                <span className="text-emerald-800">En stock ({variantStock} disponibles)</span>
              )}
            </p>
          </div>

          <p className="text-sm leading-relaxed text-[#4A453E] border-t border-[#E5DEC9] pt-5">
            {product.description}
          </p>

          {/* Colors */}
          {colors.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#111111]">Couleur</span>
                <span className="text-[#5D574F]">{selectedColor}</span>
              </div>
              <div className="mt-2.5 flex flex-wrap gap-2.5">
                {colors.map(([colorName, colorHex]) => (
                  <button
                    key={colorName}
                    type="button"
                    onClick={() => setSelectedColor(colorName)}
                    className={`flex items-center gap-2 border px-3 py-2 text-xs transition-colors cursor-pointer ${
                      selectedColor === colorName
                        ? 'border-[#111111] bg-[#111111] text-white'
                        : 'border-[#D7CFC0] bg-white text-[#111111] hover:border-[#111111]'
                    }`}
                  >
                    <span
                      className="h-3.5 w-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span>{colorName}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {sizes.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase tracking-wider text-[#111111]">Taille</span>
                <span className="text-[#5D574F]">Guide standard Maroc / EU</span>
              </div>
              <div className="mt-2.5 grid grid-cols-4 gap-2 sm:grid-cols-6">
                {sizes.map((size) => {
                  const hasStock = product.variants.some(
                    (v) => v.size === size && (!selectedColor || v.color_name === selectedColor) && v.stock > 0
                  );
                  return (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setSelectedSize(size)}
                      className={`py-2.5 text-xs font-medium border transition-colors cursor-pointer ${
                        selectedSize === size
                          ? 'border-[#111111] bg-[#111111] text-white'
                          : hasStock
                          ? 'border-[#D7CFC0] bg-white text-[#111111] hover:border-[#111111]'
                          : 'border-[#E5DEC9] bg-[#F4EFE6] text-[#9C958B]'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Add to Cart + Wishlist */}
          <div className="flex flex-col gap-3 pt-2 sm:flex-row">
            <div className="flex h-12 items-center border border-[#D7CFC0] bg-white sm:w-32">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Diminuer quantité"
                className="flex h-full flex-1 items-center justify-center hover:bg-[#F4EFE6] cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="w-10 text-center text-sm font-medium tabular-nums">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(Math.max(1, variantStock), q + 1))}
                aria-label="Augmenter quantité"
                className="flex h-full flex-1 items-center justify-center hover:bg-[#F4EFE6] cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>

            <button
              type="button"
              disabled={isOut}
              onClick={handleAddToCart}
              className="flex h-12 flex-1 items-center justify-center gap-2.5 bg-[#111111] px-6 text-xs font-semibold uppercase tracking-[0.14em] text-[#FAF8F5] transition-colors hover:bg-[#B89446] hover:text-[#111111] disabled:cursor-not-allowed disabled:bg-neutral-400 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{isOut ? 'Rupture de stock' : 'Ajouter au panier'}</span>
            </button>

            <button
              type="button"
              onClick={() => void toggleFavorite(product)}
              aria-label="Ajouter aux favoris"
              className="flex h-12 w-12 shrink-0 items-center justify-center border border-[#D7CFC0] bg-white text-[#111111] hover:border-[#111111] cursor-pointer"
            >
              <Heart className={`h-4 w-4 ${fav ? 'fill-[#B89446] text-[#B89446]' : ''}`} />
            </button>
          </div>

          {/* Delivery & COD Info */}
          <div className="space-y-3 border-t border-[#E5DEC9] pt-5 text-xs text-[#4A453E]">
            <div className="flex items-start gap-3">
              <Truck className="h-4 w-4 text-[#9E7B32] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Livraison à Casablanca & partout au Maroc</p>
                <p className="mt-0.5">
                  Casablanca : {formatMad(settings?.shipping_casablanca_mad ?? 30)} · Autres villes :{' '}
                  {formatMad(settings?.shipping_other_cities_mad ?? 50)} · Offerte dès{' '}
                  {formatMad(settings?.free_shipping_threshold_mad ?? 1200)}.
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-[#9E7B32] shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-[#111111]">Paiement à la livraison (Cash on Delivery)</p>
                <p className="mt-0.5">
                  Vérifiez votre commande avant de régler. Échanges gratuits sous 14 jours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
