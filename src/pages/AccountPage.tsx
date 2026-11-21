import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Heart, LogOut, Package, User as UserIcon } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { ProductCard } from '../components/ProductCard';
import { formatMad, type Order, type Product } from '../types';

export function AccountPage() {
  const {
    customer,
    customerToken,
    favorites,
    guestFavoriteIds,
    loginCustomer,
    registerCustomer,
    logoutCustomer,
    refreshCustomer,
    showToast,
  } = useStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'profil' | 'commandes' | 'favoris') || 'commandes';
  const [activeTab, setActiveTab] = useState<'profil' | 'commandes' | 'favoris'>(initialTab);

  // Auth form states
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('Casablanca');
  const [authError, setAuthError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Profile edit state
  const [profName, setProfName] = useState('');
  const [profPhone, setProfPhone] = useState('');
  const [profCity, setProfCity] = useState('');
  const [profHood, setProfHood] = useState('');
  const [profAddr, setProfAddr] = useState('');
  const [profZip, setProfZip] = useState('');
  const [savingProf, setSavingProf] = useState(false);

  // Orders & guest favs
  const [orders, setOrders] = useState<Order[]>([]);
  const [guestFavProducts, setGuestFavProducts] = useState<Product[]>([]);

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t === 'profil' || t === 'commandes' || t === 'favoris') {
      setActiveTab(t);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!customer) return;
    setProfName(customer.full_name || '');
    setProfPhone(customer.phone || '');
    setProfCity(customer.city || 'Casablanca');
    setProfHood(customer.neighborhood || '');
    setProfAddr(customer.address || '');
    setProfZip(customer.postal_code || '');

    const headers: Record<string, string> = {};
    if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
    fetch('/api/customer/orders', { headers })
      .then((r) => (r.ok ? r.json() : { orders: [] }))
      .then((d) => setOrders(d.orders || []))
      .catch(() => {});
  }, [customer, customerToken]);

  useEffect(() => {
    if (customer || guestFavoriteIds.length === 0) {
      setGuestFavProducts([]);
      return;
    }
    fetch('/api/products')
      .then((r) => r.json())
      .then((d) => {
        const list = (d.products || []) as Product[];
        setGuestFavProducts(list.filter((p) => guestFavoriteIds.includes(p.id)));
      })
      .catch(() => {});
  }, [customer, guestFavoriteIds]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    try {
      if (authMode === 'login') {
        const res = await loginCustomer(email, password);
        if (!res.ok) setAuthError(res.error || 'Connexion impossible.');
      } else {
        const res = await registerCustomer({
          full_name: fullName,
          email,
          phone,
          password,
          city,
        });
        if (!res.ok) setAuthError(res.error || 'Inscription impossible.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProf(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
      const res = await fetch('/api/customer/profile', {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          full_name: profName,
          phone: profPhone,
          city: profCity,
          neighborhood: profHood,
          address: profAddr,
          postal_code: profZip,
        }),
      });
      if (res.ok) {
        await refreshCustomer();
        showToast('Informations personnelles mises à jour');
      } else {
        const d = await res.json();
        showToast(d.error || 'Erreur mise à jour', 'error');
      }
    } finally {
      setSavingProf(false);
    }
  };

  const switchTab = (tab: 'profil' | 'commandes' | 'favoris') => {
    setActiveTab(tab);
    setSearchParams({ tab });
  };

  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-6 border border-[#E5DEC9] bg-white p-7 sm:p-9">
            <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Espace Client</p>
            <h1 className="mt-1 font-display text-3xl font-medium text-[#111111]">
              {authMode === 'login' ? 'Connexion' : 'Créer un compte'}
            </h1>

            <div className="mt-5 flex border-b border-[#E5DEC9] text-xs font-semibold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('login');
                  setAuthError('');
                }}
                className={`pb-3 pr-6 cursor-pointer ${
                  authMode === 'login' ? 'border-b-2 border-[#111111] text-[#111111]' : 'text-[#8B847A]'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('register');
                  setAuthError('');
                }}
                className={`pb-3 px-6 cursor-pointer ${
                  authMode === 'register' ? 'border-b-2 border-[#111111] text-[#111111]' : 'text-[#8B847A]'
                }`}
              >
                S’inscrire
              </button>
            </div>

            {authError && (
              <div className="mt-4 border border-red-300 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                {authError}
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="mt-6 space-y-4">
              {authMode === 'register' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#3B3732]">Nom et prénom *</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-[#3B3732]">Téléphone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+212 6 ..."
                        className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#3B3732]">Ville</label>
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Adresse e-mail *</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Mot de passe *</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full bg-[#111111] py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#B89446] hover:text-[#111111] transition-colors cursor-pointer"
              >
                {authLoading
                  ? 'Chargement...'
                  : authMode === 'login'
                  ? 'Accéder à mon compte'
                  : 'Créer mon compte client'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-6">
            <div className="border border-[#E5DEC9] bg-[#F3EFE7] p-7">
              <h2 className="font-display text-2xl font-medium text-[#111111]">
                Vos favoris enregistrés ({guestFavProducts.length})
              </h2>
              <p className="mt-1.5 text-sm text-[#5D574F]">
                Connectez-vous pour synchroniser vos favoris et suivre toutes vos commandes en temps réel.
              </p>
              {guestFavProducts.length > 0 && (
                <div className="mt-6 grid grid-cols-2 gap-4">
                  {guestFavProducts.slice(0, 4).map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between gap-4 border-b border-[#E5DEC9] pb-6 sm:flex-row sm:items-end">
        <div>
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Espace Client</p>
          <h1 className="mt-1 font-display text-4xl font-medium text-[#111111]">
            Bonjour, {customer.full_name}
          </h1>
          <p className="mt-1 text-sm text-[#5D574F]">{customer.email}</p>
        </div>

        <button
          type="button"
          onClick={() => void logoutCustomer()}
          className="inline-flex items-center gap-2 border border-[#D7CFC0] bg-white px-4 py-2 text-xs font-medium text-[#111111] hover:border-[#111111] cursor-pointer"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Déconnexion</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-[#E5DEC9] pb-4">
        {[
          { key: 'commandes' as const, label: `Mes commandes (${orders.length})`, icon: Package },
          { key: 'favoris' as const, label: `Mes favoris (${favorites.length})`, icon: Heart },
          { key: 'profil' as const, label: 'Mes informations', icon: UserIcon },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => switchTab(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-[#111111] text-white'
                  : 'bg-white text-[#3B3732] border border-[#D7CFC0] hover:border-[#111111]'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Orders Tab */}
      {activeTab === 'commandes' && (
        <div className="mt-8 space-y-6">
          {orders.length === 0 ? (
            <div className="border border-[#E5DEC9] bg-white p-10 text-center">
              <p className="font-display text-2xl text-[#111111]">Aucune commande pour le moment</p>
              <Link
                to="/boutique"
                className="mt-5 inline-block bg-[#111111] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Découvrir nos collections
              </Link>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="border border-[#E5DEC9] bg-white p-6">
                <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#EDE8DF] pb-4">
                  <div>
                    <span className="font-mono text-sm font-semibold text-[#111111]">
                      {order.order_number}
                    </span>
                    <span className="mx-2 text-[#B5AEA2]">·</span>
                    <span className="text-xs text-[#6B655D]">
                      {new Date(order.created_at).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9E7B32]">
                      Statut : {order.status}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-[#111111]">
                      {formatMad(order.total_mad)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 space-y-2.5">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-[#3B3732]">
                        {item.product_name} ({item.size} / {item.color_name}) × {item.quantity}
                      </span>
                      <span className="tabular-nums font-medium">{formatMad(item.line_total_mad)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Favorites Tab */}
      {activeTab === 'favoris' && (
        <div className="mt-8">
          {favorites.length === 0 ? (
            <div className="border border-[#E5DEC9] bg-white p-10 text-center">
              <p className="font-display text-2xl text-[#111111]">Votre liste de favoris est vide</p>
              <Link
                to="/boutique"
                className="mt-5 inline-block bg-[#111111] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
              >
                Explorer le catalogue
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {favorites.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Profile Tab */}
      {activeTab === 'profil' && (
        <form onSubmit={handleSaveProfile} className="mt-8 max-w-2xl border border-[#E5DEC9] bg-white p-6 sm:p-8 space-y-4">
          <h2 className="font-display text-2xl font-medium text-[#111111]">Coordonnées personnelles</h2>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Nom et prénom *</label>
              <input
                type="text"
                required
                value={profName}
                onChange={(e) => setProfName(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Téléphone</label>
              <input
                type="tel"
                value={profPhone}
                onChange={(e) => setProfPhone(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Ville</label>
              <input
                type="text"
                value={profCity}
                onChange={(e) => setProfCity(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Quartier</label>
              <input
                type="text"
                value={profHood}
                onChange={(e) => setProfHood(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Code postal</label>
              <input
                type="text"
                value={profZip}
                onChange={(e) => setProfZip(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3B3732]">Adresse de livraison</label>
            <input
              type="text"
              value={profAddr}
              onChange={(e) => setProfAddr(e.target.value)}
              className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={savingProf}
            className="bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
          >
            {savingProf ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </form>
      )}
    </div>
  );
}
