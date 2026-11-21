import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Heart,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMad, type Product } from '../types';

export function Layout({ children }: { children: React.ReactNode }) {
  const {
    settings,
    cart,
    cartCount,
    subtotalMad,
    isCartOpen,
    setIsCartOpen,
    updateCartQty,
    removeFromCart,
    customer,
    favorites,
    guestFavoriteIds,
  } = useStore();

  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!searchOpen) return;
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(trimmed)}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults((data.products || []).slice(0, 6));
        }
      } finally {
        setSearching(false);
      }
    }, 220);
    return () => clearTimeout(timer);
  }, [searchTerm, searchOpen]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearchOpen(false);
    navigate(`/boutique?search=${encodeURIComponent(searchTerm.trim())}`);
  };

  const favCount = customer ? favorites.length : guestFavoriteIds.length;
  const freeThreshold = settings?.free_shipping_threshold_mad ?? 1200;
  const remainingForFree = Math.max(0, freeThreshold - subtotalMad);
  const whatsappClean = (settings?.whatsapp_number || '212661482090').replace(/[^0-9]/g, '');
  const whatsappHref = `https://wa.me/${whatsappClean}?text=${encodeURIComponent(
    'Bonjour CASA STYLE, je souhaite obtenir un renseignement.'
  )}`;

  return (
    <div className="min-h-screen flex flex-col bg-[#FAF8F5] text-[#111111]">
      {/* Slim Dismissible Announcement Bar */}
      {!bannerDismissed && (
        <div className="no-print relative flex h-9 items-center justify-center bg-[#111111] px-10 text-center text-[12px] tracking-wide text-[#FAF8F5]">
          <span className="truncate">
            Livraison offerte au Maroc dès {formatMad(freeThreshold)} · Paiement à la livraison disponible
          </span>
          <button
            type="button"
            onClick={() => setBannerDismissed(true)}
            aria-label="Fermer l'annonce"
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[#FAF8F5]/70 hover:text-white cursor-pointer"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* 3-Zone Top Navigation Bar */}
      <header className="no-print sticky top-0 z-40 border-b border-[#E5DEC9] bg-[#FAF8F5]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8">
          {/* Zone 1: Brand Wordmark */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label="Ouvrir le menu"
              className="flex h-10 w-10 items-center justify-center text-[#111111] md:hidden cursor-pointer"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Link
              to="/"
              className="flex items-center gap-2.5 font-display text-2xl font-semibold tracking-[0.12em] text-[#111111] whitespace-nowrap shrink-0"
            >
              {settings?.logo_url ? (
                <img
                  src={settings.logo_url}
                  alt={settings.store_name || 'CASA STYLE'}
                  referrerPolicy="no-referrer"
                  className="h-8 w-auto object-contain"
                />
              ) : null}
              <span>{settings?.store_name || 'CASA STYLE'}</span>
            </Link>
          </div>

          {/* Zone 2: Clean Single-Line Nav Links */}
          <nav className="hidden md:flex items-center gap-7 text-[13px] font-medium tracking-wide text-[#3B3732]">
            {[
              { label: 'Accueil', to: '/' },
              { label: 'Femme', to: '/boutique?gender=Femme' },
              { label: 'Homme', to: '/boutique?gender=Homme' },
              { label: 'Nouveautés', to: '/boutique?isNew=1' },
              { label: 'Promotions', to: '/boutique?onPromo=1' },
              { label: 'Contact', to: '/contact' },
            ].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className="relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#111111] after:absolute after:bottom-0 after:left-0 after:h-[1px] after:w-0 after:bg-[#B89446] after:transition-all hover:after:w-full"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Zone 3: Interactive Store Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setSearchOpen((v) => !v)}
              aria-label="Rechercher"
              className="flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#B89446] cursor-pointer"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>

            <Link
              to="/compte?tab=favoris"
              aria-label="Favoris"
              className="relative hidden sm:flex h-10 w-10 items-center justify-center text-[#111111] transition-colors hover:text-[#B89446]"
            >
              <Heart className="h-[18px] w-[18px]" />
              {favCount > 0 && (
                <span className="absolute right-1.5 top-2 text-[10px] font-mono font-semibold text-[#9E7B32] tabular-nums">
                  {favCount}
                </span>
              )}
            </Link>

            <Link
              to="/compte"
              aria-label="Compte client"
              className="flex h-10 items-center gap-1.5 px-2 text-xs font-medium text-[#111111] transition-colors hover:text-[#B89446] whitespace-nowrap shrink-0"
            >
              <User className="h-[18px] w-[18px]" />
              <span className="hidden lg:inline">{customer ? customer.full_name.split(' ')[0] : 'Compte'}</span>
            </Link>

            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              aria-label="Ouvrir le panier"
              className="flex h-10 items-center gap-2 bg-[#111111] px-3.5 text-xs font-medium text-[#FAF8F5] transition-colors hover:bg-[#2A2622] whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShoppingBag className="h-4 w-4 text-[#D4B876]" />
              <span className="tabular-nums">Panier ({cartCount})</span>
            </button>
          </div>
        </div>

        {/* Smart Search Bar Dropdown */}
        {searchOpen && (
          <div className="border-t border-[#E5DEC9] bg-[#FAF8F5] px-4 py-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl">
              <form onSubmit={handleSearchSubmit} className="relative flex items-center">
                <Search className="absolute left-3.5 h-4 w-4 text-[#6B655D]" />
                <input
                  type="text"
                  autoFocus
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher une robe, un blazer, une chemise, un sac..."
                  className="w-full border border-[#D7CFC0] bg-white py-2.5 pl-10 pr-24 text-sm text-[#111111] placeholder-[#8B847A] focus:border-[#111111] focus:outline-none"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 bg-[#111111] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#B89446] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  Rechercher
                </button>
              </form>

              {searchTerm.trim() && (
                <div className="mt-3 border border-[#E5DEC9] bg-white">
                  {searching ? (
                    <div className="p-4 text-xs text-[#6B655D]">Recherche en cours...</div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-4 text-xs text-[#6B655D]">
                      Aucun résultat pour « {searchTerm} ».
                    </div>
                  ) : (
                    <ul className="divide-y divide-[#F0ECE3]">
                      {searchResults.map((p) => (
                        <li key={p.id}>
                          <Link
                            to={`/produit/${p.slug}`}
                            className="flex items-center justify-between gap-4 p-3 transition-colors hover:bg-[#FAF8F5]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {p.primary_image && (
                                <img
                                  src={p.primary_image}
                                  alt={p.name}
                                  referrerPolicy="no-referrer"
                                  className="h-12 w-9 object-cover bg-[#EDE8DF] shrink-0"
                                />
                              )}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[#111111] truncate">{p.name}</p>
                                <p className="text-xs text-[#6B655D]">{p.category_name}</p>
                              </div>
                            </div>
                            <span className="text-xs font-semibold tabular-nums text-[#111111] shrink-0">
                              {formatMad(p.promo_price_mad ?? p.price_mad)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Mobile Drawer Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-[#E5DEC9] bg-[#FAF8F5] px-6 py-5 md:hidden">
            <nav className="flex flex-col gap-3.5 text-sm font-medium text-[#111111]">
              <Link to="/">Accueil</Link>
              <Link to="/boutique">Toute la boutique</Link>
              <Link to="/boutique?gender=Femme">Collection Femme</Link>
              <Link to="/boutique?gender=Homme">Collection Homme</Link>
              <Link to="/boutique?isNew=1">Nouveautés</Link>
              <Link to="/boutique?onPromo=1">Promotions</Link>
              <Link to="/compte?tab=favoris">Mes Favoris ({favCount})</Link>
              <Link to="/contact">Contact & Boutique</Link>
            </nav>
          </div>
        )}
      </header>

      {/* Main Page Content */}
      <main className="flex-1">{children}</main>

      {/* Editorial Footer */}
      <footer className="no-print border-t border-[#22201E] bg-[#111111] text-[#EAE4D8]">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h3 className="font-display text-2xl font-semibold tracking-[0.12em] text-white">
                {settings?.store_name || 'CASA STYLE'}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-[#B5AEA2]">
                {settings?.slogan || 'CASA STYLE – Votre style, votre identité'}. Maison de prêt-à-porter féminin et masculin établie à Casablanca.
              </p>
              <div className="mt-5 flex items-center gap-4 text-xs font-medium tracking-wider uppercase text-[#D4B876]">
                {settings?.instagram_url && (
                  <a href={settings.instagram_url} target="_blank" rel="noreferrer" className="hover:text-white">
                    Instagram
                  </a>
                )}
                {settings?.facebook_url && (
                  <a href={settings.facebook_url} target="_blank" rel="noreferrer" className="hover:text-white">
                    Facebook
                  </a>
                )}
                {settings?.tiktok_url && (
                  <a href={settings.tiktok_url} target="_blank" rel="noreferrer" className="hover:text-white">
                    TikTok
                  </a>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#D4B876]">Boutique</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#C7C0B4]">
                <li><Link to="/boutique" className="hover:text-white">Catalogue complet</Link></li>
                <li><Link to="/boutique?gender=Femme" className="hover:text-white">Collection Femme</Link></li>
                <li><Link to="/boutique?gender=Homme" className="hover:text-white">Collection Homme</Link></li>
                <li><Link to="/boutique?isNew=1" className="hover:text-white">Nouveautés</Link></li>
                <li><Link to="/boutique?onPromo=1" className="hover:text-white">Promotions</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#D4B876]">Service Client</h4>
              <ul className="mt-4 space-y-2.5 text-sm text-[#C7C0B4]">
                <li><Link to="/compte" className="hover:text-white">Mon Compte & Commandes</Link></li>
                <li><Link to="/livraison" className="hover:text-white">Politique de Livraison</Link></li>
                <li><Link to="/retours" className="hover:text-white">Politique de Retour</Link></li>
                <li><Link to="/cgv" className="hover:text-white">Conditions Générales de Vente</Link></li>
                <li><Link to="/confidentialite" className="hover:text-white">Politique de Confidentialité</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-[0.12em] text-[#D4B876]">Boutique Casablanca</h4>
              <div className="mt-4 space-y-2.5 text-sm text-[#C7C0B4]">
                <p>{settings?.casablanca_address || "48 Boulevard d'Anfa, Casablanca"}</p>
                <p>{settings?.opening_hours || 'Lun – Sam : 10h00 – 20h30'}</p>
                <p className="tabular-nums">{settings?.phone || '+212 5 22 39 48 10'}</p>
                <p>{settings?.email || 'bonjour@casastyle.ma'}</p>
              </div>
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[#262320] pt-6 text-xs text-[#8E877C] sm:flex-row">
            <p>© {new Date().getFullYear()} {settings?.store_name || 'CASA STYLE'} Casablanca. Tous droits réservés.</p>
            <Link to="/admin" className="hover:text-[#D4B876] transition-colors">
              Accès Administration
            </Link>
          </div>
        </div>
      </footer>

      {/* Slide-Over Cart Drawer */}
      {isCartOpen && (
        <div className="no-print fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-[1px]"
            onClick={() => setIsCartOpen(false)}
          />
          <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FAF8F5] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E5DEC9] px-6 py-4">
              <h2 className="font-display text-2xl font-semibold text-[#111111]">
                Votre Panier ({cartCount})
              </h2>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                aria-label="Fermer le panier"
                className="p-2 text-[#111111] hover:text-[#B89446] cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Free Shipping Progress */}
            <div className="border-b border-[#EDE8DF] bg-[#F4EFE6] px-6 py-3 text-xs text-[#3B3732]">
              {remainingForFree === 0 ? (
                <p className="font-medium text-[#111111]">
                  Livraison offerte débloquée partout au Maroc.
                </p>
              ) : (
                <p>
                  Plus que <span className="font-semibold tabular-nums">{formatMad(remainingForFree)}</span> pour bénéficier de la livraison offerte.
                </p>
              )}
              <div className="mt-2 h-1 w-full bg-[#E0D8C8]">
                <div
                  className="h-full bg-[#B89446] transition-all duration-300"
                  style={{ width: `${Math.min(100, (subtotalMad / freeThreshold) * 100)}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <ShoppingBag className="h-10 w-10 text-[#B5AEA2]" />
                  <p className="mt-4 font-display text-xl text-[#111111]">Votre panier est vide</p>
                  <p className="mt-1 text-sm text-[#6B655D]">
                    Explorez nos collections femme et homme de Casablanca.
                  </p>
                  <Link
                    to="/boutique"
                    onClick={() => setIsCartOpen(false)}
                    className="mt-6 bg-[#111111] px-6 py-2.5 text-xs font-medium uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] transition-colors"
                  >
                    Découvrir le catalogue
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-[#E5DEC9]">
                  {cart.map((item) => (
                    <li
                      key={`${item.product_id}-${item.size}-${item.color_name}`}
                      className="flex gap-4 py-4"
                    >
                      <Link
                        to={`/produit/${item.slug}`}
                        onClick={() => setIsCartOpen(false)}
                        className="h-24 w-20 shrink-0 bg-[#EDE8DF] overflow-hidden"
                      >
                        {item.image && (
                          <img
                            src={item.image}
                            alt={item.name}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        )}
                      </Link>
                      <div className="flex flex-1 flex-col justify-between min-w-0">
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <Link
                              to={`/produit/${item.slug}`}
                              onClick={() => setIsCartOpen(false)}
                              className="text-sm font-semibold text-[#111111] line-clamp-1"
                            >
                              {item.name}
                            </Link>
                            <button
                              type="button"
                              onClick={() => removeFromCart(item.product_id, item.size, item.color_name)}
                              aria-label="Supprimer l'article"
                              className="text-[#8B847A] hover:text-red-700 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-[#6B655D]">
                            Taille : {item.size} · Couleur : {item.color_name}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center border border-[#D7CFC0] bg-white">
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(item.product_id, item.size, item.color_name, item.quantity - 1)
                              }
                              className="flex h-7 w-7 items-center justify-center text-[#111111] hover:bg-[#F4EFE6] cursor-pointer"
                              aria-label="Diminuer la quantité"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-8 text-center text-xs font-medium tabular-nums">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                updateCartQty(item.product_id, item.size, item.color_name, item.quantity + 1)
                              }
                              className="flex h-7 w-7 items-center justify-center text-[#111111] hover:bg-[#F4EFE6] cursor-pointer"
                              aria-label="Augmenter la quantité"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-sm font-semibold tabular-nums text-[#111111]">
                            {formatMad(item.unit_price_mad * item.quantity)}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-[#E5DEC9] bg-white px-6 py-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[#6B655D]">Sous-total</span>
                  <span className="font-semibold tabular-nums text-[#111111]">{formatMad(subtotalMad)}</span>
                </div>
                <p className="text-xs text-[#6B655D]">
                  Frais de livraison calculés à l’étape de validation ({formatMad(settings?.shipping_casablanca_mad ?? 30)} Casablanca / {formatMad(settings?.shipping_other_cities_mad ?? 50)} Maroc).
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Link
                    to="/panier"
                    onClick={() => setIsCartOpen(false)}
                    className="flex items-center justify-center border border-[#111111] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#FAF8F5]"
                  >
                    Voir le panier
                  </Link>
                  <Link
                    to="/commande"
                    onClick={() => setIsCartOpen(false)}
                    className="flex items-center justify-center bg-[#111111] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#FAF8F5] hover:bg-[#B89446] hover:text-[#111111] transition-colors"
                  >
                    Commander
                  </Link>
                </div>
              </div>
            )}
          </aside>
        </div>
      )}

      {/* Floating WhatsApp Contact Button */}
      <a
        href={whatsappHref}
        target="_blank"
        rel="noreferrer"
        aria-label="Contacter CASA STYLE sur WhatsApp"
        className="no-print fixed bottom-5 right-5 z-40 flex h-12 items-center gap-2 rounded-full bg-[#111111] px-4 text-xs font-medium text-[#FAF8F5] shadow-lg ring-1 ring-[#B89446]/60 transition-transform hover:scale-105 hover:bg-[#1E1C1A]"
      >
        <MessageCircle className="h-4 w-4 text-[#D4B876]" />
        <span className="hidden sm:inline">WhatsApp Casablanca</span>
      </a>
    </div>
  );
}
