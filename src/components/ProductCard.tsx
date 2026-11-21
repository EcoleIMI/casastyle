import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, ShoppingBag } from 'lucide-react';
import { formatMad, type Product } from '../types';
import { useStore } from '../context/StoreContext';

export function ProductCard({ product }: { product: Product }) {
  const { addToCart, isFavorite, toggleFavorite } = useStore();
  const [hovered, setHovered] = useState(false);
  const [imgError, setImgError] = useState(false);

  const primaryImg = product.primary_image || product.images?.[0]?.image_url || '';
  const secondaryImg = product.images?.[1]?.image_url || primaryImg;
  const activeImg = hovered && secondaryImg ? secondaryImg : primaryImg;

  const effectivePrice =
    product.promo_price_mad !== null && product.promo_price_mad < product.price_mad
      ? product.promo_price_mad
      : product.price_mad;
  const hasPromo = product.promo_price_mad !== null && product.promo_price_mad < product.price_mad;
  const fav = isFavorite(product.id);
  const outOfStock = product.stock_total <= 0;

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (outOfStock) return;
    const firstAvailable = product.variants?.find((v) => v.stock > 0) || product.variants?.[0];
    addToCart({
      product_id: product.id,
      variant_id: firstAvailable?.id,
      slug: product.slug,
      name: product.name,
      image: primaryImg,
      size: firstAvailable?.size || 'M',
      color_name: firstAvailable?.color_name || 'Standard',
      unit_price_mad: effectivePrice,
      quantity: 1,
      max_stock: firstAvailable?.stock ?? product.stock_total,
    });
  };

  return (
    <article
      className="group flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative aspect-[3/4] w-full overflow-hidden bg-[#EDE8DF]">
        <Link to={`/produit/${product.slug}`} className="block h-full w-full">
          {!imgError && activeImg ? (
            <img
              src={activeImg}
              alt={product.name}
              referrerPolicy="no-referrer"
              onError={() => setImgError(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#EDE8DF] to-[#DFD7C8] p-6 text-center">
              <span className="font-display text-2xl text-[#111111]">{product.name}</span>
              <span className="mt-1 text-xs text-[#6B655D]">{product.category_name || 'CASA STYLE'}</span>
            </div>
          )}
        </Link>

        {/* Wishlist Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void toggleFavorite(product);
          }}
          aria-label={fav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
          className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center bg-white/90 text-[#111111] backdrop-blur-sm transition-colors hover:bg-[#111111] hover:text-white cursor-pointer"
        >
          <Heart className={`h-4 w-4 ${fav ? 'fill-[#B89446] text-[#B89446]' : ''}`} />
        </button>

        {/* Quick Add Bottom Bar */}
        <div className="absolute inset-x-3 bottom-3 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
          <button
            type="button"
            disabled={outOfStock}
            onClick={handleQuickAdd}
            className="flex w-full items-center justify-center gap-2 bg-[#111111]/95 px-4 py-2.5 text-xs font-medium tracking-wide text-[#FAF8F5] transition-colors hover:bg-[#B89446] hover:text-[#111111] disabled:cursor-not-allowed disabled:bg-neutral-400 cursor-pointer"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>{outOfStock ? 'Rupture de stock' : 'Ajout rapide'}</span>
          </button>
        </div>
      </div>

      {/* Clean Unboxed Metadata */}
      <div className="mt-3 flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-[0.08em] text-[#6B655D]">
          <span className="truncate">
            {product.category_name || product.gender} · {product.brand}
          </span>
          {outOfStock ? (
            <span className="text-red-700 font-medium shrink-0">Épuisé</span>
          ) : hasPromo ? (
            <span className="text-[#9E7B32] font-medium shrink-0">Offre</span>
          ) : product.is_new === 1 ? (
            <span className="text-[#111111] font-medium shrink-0">Nouveau</span>
          ) : null}
        </div>

        <Link
          to={`/produit/${product.slug}`}
          className="text-[15px] font-semibold leading-snug text-[#111111] transition-colors hover:text-[#9E7B32] line-clamp-1"
        >
          {product.name}
        </Link>

        <div className="flex items-baseline gap-2.5 tabular-nums">
          <span className="text-[14px] font-medium text-[#111111]">{formatMad(effectivePrice)}</span>
          {hasPromo && (
            <span className="text-[13px] text-[#8B847A] line-through">{formatMad(product.price_mad)}</span>
          )}
        </div>
      </div>
    </article>
  );
}
