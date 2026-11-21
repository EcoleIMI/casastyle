import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, CreditCard, Lock, Minus, Plus, ShoppingBag, Tag, Trash2, Truck } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMad, type Order } from '../types';

const MOROCCAN_CITIES = [
  'Casablanca',
  'Rabat',
  'Marrakech',
  'Tanger',
  'Agadir',
  'Fès',
  'Meknès',
  'Oujda',
  'Kénitra',
  'Tétouan',
  'Mohammedia',
  'El Jadida',
  'Bouskoura',
  'Autre ville',
];

export function CartPage() {
  const {
    cart,
    subtotalMad,
    updateCartQty,
    removeFromCart,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getShippingFee,
    settings,
  } = useStore();
  const [couponInput, setCouponInput] = useState('');
  const [selectedCity, setSelectedCity] = useState('Casablanca');

  const discount = appliedCoupon ? appliedCoupon.discount_mad : 0;
  const shipping = getShippingFee(selectedCity);
  const total = Math.max(0, subtotalMad - discount + shipping);

  const handleCouponSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!couponInput.trim()) return;
    const ok = await applyCoupon(couponInput.trim());
    if (ok) setCouponInput('');
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <h1 className="font-display text-4xl font-medium text-[#111111]">Mon Panier</h1>

      {cart.length === 0 ? (
        <div className="mt-8 border border-[#E5DEC9] bg-white p-12 text-center">
          <ShoppingBag className="mx-auto h-10 w-10 text-[#B5AEA2]" />
          <p className="mt-4 font-display text-2xl text-[#111111]">Votre panier est actuellement vide</p>
          <p className="mt-2 text-sm text-[#6B655D]">
            Découvrez nos créations femme, homme et accessoires.
          </p>
          <Link
            to="/boutique"
            className="mt-6 inline-block bg-[#111111] px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111]"
          >
            Explorer la boutique
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="border-t border-[#E5DEC9] divide-y divide-[#E5DEC9]">
              {cart.map((item) => (
                <div
                  key={`${item.product_id}-${item.size}-${item.color_name}`}
                  className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center"
                >
                  <Link
                    to={`/produit/${item.slug}`}
                    className="h-28 w-22 shrink-0 bg-[#EDE8DF] overflow-hidden"
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
                  <div className="flex-1 min-w-0">
                    <Link
                      to={`/produit/${item.slug}`}
                      className="font-display text-xl font-medium text-[#111111] hover:text-[#9E7B32]"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-1 text-xs text-[#6B655D]">
                      Taille : {item.size} · Couleur : {item.color_name}
                    </p>
                    <p className="mt-1 text-xs font-medium tabular-nums text-[#4A453E]">
                      Prix unitaire : {formatMad(item.unit_price_mad)}
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-6 sm:justify-end">
                    <div className="flex items-center border border-[#D7CFC0] bg-white">
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product_id, item.size, item.color_name, item.quantity - 1)}
                        className="flex h-9 w-9 items-center justify-center hover:bg-[#F4EFE6] cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-9 text-center text-sm font-medium tabular-nums">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => updateCartQty(item.product_id, item.size, item.color_name, item.quantity + 1)}
                        className="flex h-9 w-9 items-center justify-center hover:bg-[#F4EFE6] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="w-28 text-right text-sm font-semibold tabular-nums text-[#111111]">
                      {formatMad(item.unit_price_mad * item.quantity)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product_id, item.size, item.color_name)}
                      className="text-[#8B847A] hover:text-red-700 cursor-pointer"
                      aria-label="Retirer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Summary Box */}
          <aside className="lg:col-span-4 border border-[#E5DEC9] bg-white p-6 h-fit space-y-5">
            <h2 className="font-display text-2xl font-medium text-[#111111]">Récapitulatif</h2>

            <form onSubmit={handleCouponSubmit} className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value)}
                placeholder="Code promo (ex: CASA10)"
                className="flex-1 border border-[#D7CFC0] px-3 py-2 text-xs uppercase focus:border-[#111111] focus:outline-none"
              />
              <button
                type="submit"
                className="bg-[#111111] px-4 py-2 text-xs font-medium text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
              >
                Appliquer
              </button>
            </form>

            {appliedCoupon && (
              <div className="flex items-center justify-between bg-[#F4EFE6] px-3 py-2 text-xs">
                <span className="flex items-center gap-1.5 font-medium text-[#111111]">
                  <Tag className="h-3.5 w-3.5 text-[#9E7B32]" />
                  {appliedCoupon.code}
                </span>
                <button type="button" onClick={removeCoupon} className="text-red-700 underline cursor-pointer">
                  Retirer
                </button>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-[#5D574F]">Estimation livraison</label>
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                className="mt-1.5 w-full border border-[#D7CFC0] bg-white px-3 py-2 text-xs focus:border-[#111111] focus:outline-none"
              >
                <option value="Casablanca">Casablanca ({formatMad(settings?.shipping_casablanca_mad ?? 30)})</option>
                <option value="Rabat">Autres villes du Maroc ({formatMad(settings?.shipping_other_cities_mad ?? 50)})</option>
              </select>
            </div>

            <div className="space-y-2.5 border-t border-[#E5DEC9] pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5D574F]">Sous-total</span>
                <span className="tabular-nums font-medium">{formatMad(subtotalMad)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-800">
                  <span>Réduction ({appliedCoupon?.code})</span>
                  <span className="tabular-nums font-medium">-{formatMad(discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-[#5D574F]">Livraison</span>
                <span className="tabular-nums font-medium">
                  {shipping === 0 ? 'Offerte' : formatMad(shipping)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E5DEC9] pt-3 text-base font-semibold text-[#111111]">
                <span>Total</span>
                <span className="tabular-nums">{formatMad(total)}</span>
              </div>
            </div>

            <Link
              to="/commande"
              className="flex w-full items-center justify-center gap-2 bg-[#111111] py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#B89446] hover:text-[#111111] transition-colors"
            >
              <span>Valider ma commande</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}

export function CheckoutPage() {
  const {
    cart,
    subtotalMad,
    appliedCoupon,
    applyCoupon,
    removeCoupon,
    getShippingFee,
    clearCart,
    customer,
    customerToken,
    showToast,
  } = useStore();

  const [fullName, setFullName] = useState(customer?.full_name || '');
  const [phone, setPhone] = useState(customer?.phone || '');
  const [email, setEmail] = useState(customer?.email || '');
  const [city, setCity] = useState(customer?.city || 'Casablanca');
  const [customCity, setCustomCity] = useState('');
  const [neighborhood, setNeighborhood] = useState(customer?.neighborhood || '');
  const [address, setAddress] = useState(customer?.address || '');
  const [postalCode, setPostalCode] = useState(customer?.postal_code || '');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (customer) {
      setFullName((v) => v || customer.full_name);
      setPhone((v) => v || customer.phone);
      setEmail((v) => v || customer.email);
      setCity((v) => v || customer.city || 'Casablanca');
      setNeighborhood((v) => v || customer.neighborhood);
      setAddress((v) => v || customer.address);
      setPostalCode((v) => v || customer.postal_code);
    }
  }, [customer]);

  const effectiveCity = city === 'Autre ville' ? customCity || 'Maroc' : city;
  const discount = appliedCoupon ? appliedCoupon.discount_mad : 0;
  const shippingFee = getShippingFee(effectiveCity);
  const totalMad = Math.max(0, subtotalMad - discount + shippingFee);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setSubmitting(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (customerToken) headers.Authorization = `Bearer ${customerToken}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customer_name: fullName,
          customer_phone: phone,
          customer_email: email,
          city: effectiveCity,
          neighborhood,
          address,
          postal_code: postalCode,
          notes,
          coupon_code: appliedCoupon?.code || '',
          payment_method: 'cod',
          items: cart.map((i) => ({
            product_id: i.product_id,
            variant_id: i.variant_id,
            size: i.size,
            color_name: i.color_name,
            quantity: i.quantity,
          })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Impossible de valider la commande.', 'error');
        return;
      }
      setConfirmedOrder({ ...data.order, items: data.items });
      clearCart();
      showToast(`Commande ${data.order.order_number} confirmée`);
    } catch {
      showToast('Erreur réseau lors de la validation.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmedOrder) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <div className="border border-[#E5DEC9] bg-white p-8 sm:p-10">
          <div className="flex items-center gap-3 text-emerald-800">
            <CheckCircle2 className="h-7 w-7" />
            <span className="text-xs font-semibold uppercase tracking-[0.18em]">Commande enregistrée</span>
          </div>
          <h1 className="mt-3 font-display text-3xl font-medium text-[#111111] sm:text-4xl">
            Merci pour votre confiance, {confirmedOrder.customer_name}
          </h1>
          <p className="mt-2 text-sm text-[#5D574F]">
            Votre commande numéro{' '}
            <span className="font-mono font-semibold text-[#111111]">{confirmedOrder.order_number}</span> a été
            transmise à notre équipe de Casablanca.
          </p>

          <div className="mt-6 grid grid-cols-1 gap-4 border-y border-[#E5DEC9] py-5 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wider text-[#6B655D]">Livraison</p>
              <p className="mt-1 font-medium text-[#111111]">{confirmedOrder.address}</p>
              <p className="text-[#5D574F]">
                {confirmedOrder.neighborhood ? `${confirmedOrder.neighborhood}, ` : ''}
                {confirmedOrder.city} {confirmedOrder.postal_code}
              </p>
              <p className="mt-1 tabular-nums text-[#5D574F]">{confirmedOrder.customer_phone}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-[#6B655D]">Paiement & Statut</p>
              <p className="mt-1 font-medium text-[#111111]">Paiement à la livraison (Cash on Delivery)</p>
              <p className="mt-1 text-xs font-semibold text-[#9E7B32]">Statut : {confirmedOrder.status}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {confirmedOrder.items?.map((it) => (
              <div key={it.id} className="flex items-center justify-between text-sm">
                <span>
                  {it.product_name} ({it.size} / {it.color_name}) × {it.quantity}
                </span>
                <span className="font-medium tabular-nums">{formatMad(it.line_total_mad)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between border-t border-[#E5DEC9] pt-3 text-base font-semibold">
              <span>Total à régler à la livraison</span>
              <span className="tabular-nums">{formatMad(confirmedOrder.total_mad)}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/boutique"
              className="bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111]"
            >
              Continuer mes achats
            </Link>
            <Link
              to="/compte"
              className="border border-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-[#111111] hover:bg-[#FAF8F5]"
            >
              Suivre mes commandes
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (cart.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl text-[#111111]">Votre panier est vide</h1>
        <Link
          to="/boutique"
          className="mt-6 inline-block bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white"
        >
          Retour à la boutique
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="border-b border-[#E5DEC9] pb-5">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Finalisation sécurisée</p>
        <h1 className="mt-1 font-display text-4xl font-medium text-[#111111]">Validation de la commande</h1>
      </div>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-8">
          {/* Coordonnées de livraison */}
          <div className="border border-[#E5DEC9] bg-white p-6 sm:p-8 space-y-5">
            <h2 className="font-display text-2xl font-medium text-[#111111]">1. Coordonnées de livraison</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Nom et prénom *</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Salma El Amrani"
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Numéro de téléphone *</label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+212 6 XX XX XX XX"
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm tabular-nums focus:border-[#111111] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3B3732]">E-mail (pour le suivi de commande)</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.ma"
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Ville *</label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1.5 w-full border border-[#D7CFC0] bg-white px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                >
                  {MOROCCAN_CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              {city === 'Autre ville' ? (
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">Précisez la ville *</label>
                  <input
                    type="text"
                    required
                    value={customCity}
                    onChange={(e) => setCustomCity(e.target.value)}
                    placeholder="Nom de votre ville"
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">Quartier *</label>
                  <input
                    type="text"
                    required
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                    placeholder="Ex: Gauthier, Maârif, Anfa..."
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-[#3B3732]">Adresse complète de livraison *</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rue, numéro d'immeuble, appartement..."
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Code postal (facultatif)</label>
                <input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="20000"
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm tabular-nums focus:border-[#111111] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Informations complémentaires</label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Créneau horaire souhaité, indications pour le livreur..."
                className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>

          {/* Moyen de paiement */}
          <div className="border border-[#E5DEC9] bg-white p-6 sm:p-8 space-y-4">
            <h2 className="font-display text-2xl font-medium text-[#111111]">2. Mode de paiement</h2>

            <div className="border border-[#111111] bg-[#FAF8F5] p-4 flex items-start gap-3">
              <input type="radio" checked readOnly className="mt-1 accent-[#111111]" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-[#111111]">
                    Paiement à la livraison (Cash on Delivery)
                  </span>
                  <Truck className="h-4 w-4 text-[#9E7B32]" />
                </div>
                <p className="mt-1 text-xs text-[#5D574F]">
                  Payez en espèces directement au livreur lors de la réception de votre commande.
                </p>
              </div>
            </div>

            <div className="border border-[#E5DEC9] bg-[#F8F6F2] p-4 opacity-70 flex items-start gap-3">
              <Lock className="h-4 w-4 text-[#6B655D] mt-0.5 shrink-0" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#3B3732]">
                    Carte Bancaire Marocaine & Internationale / CMI
                  </span>
                  <CreditCard className="h-4 w-4 text-[#6B655D]" />
                </div>
                <p className="mt-1 text-xs text-[#6B655D]">
                  Intégration passerelle CMI en cours d’activation — non disponible pour le moment.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary */}
        <aside className="lg:col-span-5 border border-[#E5DEC9] bg-white p-6 sm:p-8 h-fit space-y-5">
          <h2 className="font-display text-2xl font-medium text-[#111111]">Votre commande</h2>

          <ul className="divide-y divide-[#EDE8DF]">
            {cart.map((it) => (
              <li key={`${it.product_id}-${it.size}-${it.color_name}`} className="flex items-center gap-3 py-3">
                {it.image && (
                  <img
                    src={it.image}
                    alt={it.name}
                    referrerPolicy="no-referrer"
                    className="h-14 w-11 object-cover bg-[#EDE8DF] shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#111111] truncate">{it.name}</p>
                  <p className="text-xs text-[#6B655D]">
                    {it.size} · {it.color_name} × {it.quantity}
                  </p>
                </div>
                <span className="text-sm font-medium tabular-nums">
                  {formatMad(it.unit_price_mad * it.quantity)}
                </span>
              </li>
            ))}
          </ul>

          {/* Code promo */}
          <div className="flex gap-2 border-t border-[#E5DEC9] pt-4">
            <input
              type="text"
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value)}
              placeholder="Code promo"
              className="flex-1 border border-[#D7CFC0] px-3 py-2 text-xs uppercase focus:border-[#111111] focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void applyCoupon(couponInput)}
              className="border border-[#111111] px-4 py-2 text-xs font-medium text-[#111111] hover:bg-[#111111] hover:text-white cursor-pointer"
            >
              Appliquer
            </button>
          </div>

          {appliedCoupon && (
            <div className="flex items-center justify-between bg-[#F4EFE6] px-3 py-2 text-xs">
              <span>Code actif : {appliedCoupon.code}</span>
              <button type="button" onClick={removeCoupon} className="text-red-700 underline cursor-pointer">
                Supprimer
              </button>
            </div>
          )}

          <div className="space-y-2 border-t border-[#E5DEC9] pt-4 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5D574F]">Sous-total</span>
              <span className="tabular-nums font-medium">{formatMad(subtotalMad)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-emerald-800">
                <span>Réduction</span>
                <span className="tabular-nums font-medium">-{formatMad(discount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#5D574F]">Livraison ({effectiveCity})</span>
              <span className="tabular-nums font-medium">
                {shippingFee === 0 ? 'Offerte' : formatMad(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#E5DEC9] pt-3 text-lg font-semibold text-[#111111]">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatMad(totalMad)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-[#111111] py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#FAF8F5] transition-colors hover:bg-[#B89446] hover:text-[#111111] disabled:opacity-60 cursor-pointer"
          >
            {submitting ? 'Confirmation en cours...' : `Confirmer la commande (${formatMad(totalMad)})`}
          </button>
        </aside>
      </form>
    </div>
  );
}
