import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Mail, MapPin, MessageCircle, Phone } from 'lucide-react';
import { useStore } from '../context/StoreContext';
import { formatMad } from '../types';

export function ContactPage() {
  const { settings, showToast } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, subject, message }),
      });
      const data = await res.json();
      if (res.ok) {
        setSent(true);
        setName('');
        setEmail('');
        setPhone('');
        setSubject('');
        setMessage('');
        showToast('Message envoyé à notre équipe');
      } else {
        showToast(data.error || 'Erreur envoi', 'error');
      }
    } finally {
      setSending(false);
    }
  };

  const whatsappNum = (settings?.whatsapp_number || '212661482090').replace(/[^0-9]/g, '');

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="border-b border-[#E5DEC9] pb-6">
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">Maison CASA STYLE</p>
        <h1 className="mt-1 font-display text-4xl font-medium text-[#111111]">
          Contact & Boutique à Casablanca
        </h1>
      </div>

      <div className="mt-10 grid grid-cols-1 gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5 space-y-6">
          <div className="border border-[#E5DEC9] bg-white p-7 space-y-5">
            <h2 className="font-display text-2xl font-medium text-[#111111]">Nos Coordonnées</h2>

            <div className="flex items-start gap-3 text-sm">
              <MapPin className="h-4 w-4 text-[#9E7B32] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Adresse Boutique</p>
                <p className="text-[#5D574F]">
                  {settings?.casablanca_address || "48 Boulevard d'Anfa, Quartier Gauthier, Casablanca"}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <Clock className="h-4 w-4 text-[#9E7B32] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Horaires d’ouverture</p>
                <p className="text-[#5D574F]">
                  {settings?.opening_hours || 'Lun – Sam : 10h00 – 20h30 · Dim : 11h00 – 19h00'}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <Phone className="h-4 w-4 text-[#9E7B32] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">Téléphone</p>
                <p className="tabular-nums text-[#5D574F]">{settings?.phone || '+212 5 22 39 48 10'}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 text-sm">
              <Mail className="h-4 w-4 text-[#9E7B32] mt-1 shrink-0" />
              <div>
                <p className="font-semibold text-[#111111]">E-mail</p>
                <p className="text-[#5D574F]">{settings?.email || 'bonjour@casastyle.ma'}</p>
              </div>
            </div>

            <a
              href={`https://wa.me/${whatsappNum}`}
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex w-full items-center justify-center gap-2 bg-[#111111] py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] transition-colors"
            >
              <MessageCircle className="h-4 w-4" />
              <span>Discuter sur WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="lg:col-span-7 border border-[#E5DEC9] bg-white p-7 sm:p-9">
          <h2 className="font-display text-2xl font-medium text-[#111111]">Écrire à notre équipe</h2>

          {sent ? (
            <div className="mt-6 border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
              Merci pour votre message. Un conseiller CASA STYLE Casablanca vous répondra dans les plus brefs délais.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">Nom complet *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">E-mail *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">Téléphone</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#3B3732]">Objet *</label>
                  <input
                    type="text"
                    required
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Conseil taille, commande, presse..."
                    className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#3B3732]">Message *</label>
                <textarea
                  rows={5}
                  required
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="mt-1.5 w-full border border-[#D7CFC0] px-3.5 py-2.5 text-sm focus:border-[#111111] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={sending}
                className="bg-[#111111] px-8 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
              >
                {sending ? 'Envoi...' : 'Envoyer le message'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function LegalShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#9E7B32]">{subtitle}</p>
      <h1 className="mt-1 font-display text-4xl font-medium text-[#111111]">{title}</h1>
      <div className="mt-8 border border-[#E5DEC9] bg-white p-7 sm:p-10 space-y-5 text-sm leading-relaxed text-[#4A453E]">
        {children}
      </div>
    </div>
  );
}

export function DeliveryPage() {
  const { settings } = useStore();
  return (
    <LegalShell title="Politique de Livraison" subtitle="Expéditions Casablanca & Maroc">
      <h2 className="font-display text-2xl font-medium text-[#111111]">Tarifs et délais au Maroc</h2>
      <p>
        CASA STYLE assure la livraison à domicile à Casablanca et dans toutes les villes du Royaume du Maroc
        en partenariat avec nos coursiers dédiés.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>
          <strong>Casablanca :</strong> {formatMad(settings?.shipping_casablanca_mad ?? 30)} — Livraison sous 24h ouvrées.
        </li>
        <li>
          <strong>Autres villes du Maroc :</strong> {formatMad(settings?.shipping_other_cities_mad ?? 50)} — Livraison sous 48h à 72h ouvrées.
        </li>
        <li>
          <strong>Livraison offerte :</strong> Gratuite partout au Maroc dès{' '}
          {formatMad(settings?.free_shipping_threshold_mad ?? 1200)} d’achat.
        </li>
      </ul>
      <p>
        Un conseiller vous contacte par téléphone ou WhatsApp avant le passage du livreur afin de confirmer votre créneau de réception.
      </p>
    </LegalShell>
  );
}

export function ReturnsPage() {
  return (
    <LegalShell title="Politique de Retour & Échange" subtitle="Satisfaction Client">
      <h2 className="font-display text-2xl font-medium text-[#111111]">Délai de retour de 14 jours</h2>
      <p>
        Vous disposez d’un délai de 14 jours calendaires après réception de votre commande pour demander un échange de taille ou un retour.
      </p>
      <p>
        Les pièces doivent être retournées dans leur état d’origine, non portées, non lavées, avec toutes les étiquettes CASA STYLE intactes.
      </p>
      <p>
        Les échanges peuvent être effectués directement dans notre boutique du Boulevard d’Anfa à Casablanca ou par collecte via notre service coursier.
      </p>
    </LegalShell>
  );
}

export function TermsPage() {
  return (
    <LegalShell title="Conditions Générales de Vente" subtitle="Cadre Commercial">
      <h2 className="font-display text-2xl font-medium text-[#111111]">1. Objet & Devise</h2>
      <p>
        Les présentes Conditions Générales de Vente régissent l’ensemble des ventes conclues sur la boutique en ligne CASA STYLE (Casablanca, Maroc). Tous les prix sont affichés en Dirhams marocains (MAD), toutes taxes comprises.
      </p>
      <h2 className="font-display text-2xl font-medium text-[#111111]">2. Commandes & Paiement</h2>
      <p>
        Chaque commande validée génère un numéro de suivi unique. Le règlement s’effectue en espèces à la livraison (Cash on Delivery) au moment de la remise du colis.
      </p>
      <h2 className="font-display text-2xl font-medium text-[#111111]">3. Disponibilité des stocks</h2>
      <p>
        Nos stocks sont mis à jour en temps réel. En cas d’indisponibilité exceptionnelle après validation, notre service client vous informe immédiatement pour un remplacement ou une annulation sans frais.
      </p>
    </LegalShell>
  );
}

export function PrivacyPage() {
  return (
    <LegalShell title="Politique de Confidentialité" subtitle="Protection des Données">
      <h2 className="font-display text-2xl font-medium text-[#111111]">Collecte & Utilisation</h2>
      <p>
        CASA STYLE collecte uniquement les données nécessaires au traitement de vos commandes, à la livraison et à la gestion de votre espace client (nom, téléphone, adresse, e-mail).
      </p>
      <p>
        Vos mots de passe sont chiffrés côté serveur et vos coordonnées ne sont jamais vendues ni cédées à des tiers commerciaux. Conformément à la loi marocaine n° 09-08 relative à la protection des personnes physiques à l’égard du traitement des données à caractère personnel, vous pouvez modifier ou demander la suppression de vos données à tout moment via bonjour@casastyle.ma.
      </p>
    </LegalShell>
  );
}

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#9E7B32]">Erreur 404</p>
      <h1 className="mt-2 font-display text-5xl font-medium text-[#111111]">Page introuvable</h1>
      <p className="mt-3 text-sm text-[#5D574F]">
        La page que vous recherchez n’existe plus ou a été déplacée.
      </p>
      <Link
        to="/"
        className="mt-8 inline-block bg-[#111111] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.14em] text-white hover:bg-[#B89446] hover:text-[#111111]"
      >
        Retour à l’accueil
      </Link>
    </div>
  );
}
