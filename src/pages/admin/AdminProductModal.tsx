import React, { useState } from 'react';
import { Plus, Trash2, Upload, X } from 'lucide-react';
import type { Category, Product } from '../../types';

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'Unique'];

interface VariantDraft {
  size: string;
  color_name: string;
  color_hex: string;
  stock: number;
}

interface Props {
  product: Product | null;
  categories: Category[];
  adminToken: string | null;
  onClose: () => void;
  onSaved: () => void;
  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export function AdminProductModal({
  product,
  categories,
  adminToken,
  onClose,
  onSaved,
  showToast,
}: Props) {
  const [name, setName] = useState(product?.name || '');
  const [description, setDescription] = useState(product?.description || '');
  const [brand, setBrand] = useState(product?.brand || 'CASA STYLE');
  const [categoryId, setCategoryId] = useState<number>(
    product?.category_id || categories[0]?.id || 1
  );
  const [gender, setGender] = useState<'Femme' | 'Homme' | 'Mixte'>(product?.gender || 'Femme');
  const [priceMad, setPriceMad] = useState(product ? String(product.price_mad) : '');
  const [promoPriceMad, setPromoPriceMad] = useState(
    product?.promo_price_mad ? String(product.promo_price_mad) : ''
  );
  const [isNew, setIsNew] = useState(product ? product.is_new === 1 : true);
  const [isBestseller, setIsBestseller] = useState(product ? product.is_bestseller === 1 : false);
  const [isActive, setIsActive] = useState(product ? product.is_active === 1 : true);

  const [images, setImages] = useState<string[]>(
    product?.images?.map((i) => i.image_url) || []
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const [variants, setVariants] = useState<VariantDraft[]>(
    product?.variants?.length
      ? product.variants.map((v) => ({
          size: v.size,
          color_name: v.color_name,
          color_hex: v.color_hex,
          stock: v.stock,
        }))
      : [
          { size: 'S', color_name: 'Noir Onyx', color_hex: '#111111', stock: 8 },
          { size: 'M', color_name: 'Noir Onyx', color_hex: '#111111', stock: 10 },
          { size: 'L', color_name: 'Noir Onyx', color_hex: '#111111', stock: 6 },
        ]
  );

  const [saving, setSaving] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const fd = new FormData();
      Array.from(files).forEach((f) => fd.append('images', f));
      const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
      const res = await fetch('/api/admin/upload', { method: 'POST', headers, body: fd });
      const data = await res.json();
      if (res.ok && Array.isArray(data.urls)) {
        setImages((prev) => [...prev, ...data.urls]);
        showToast(`${data.urls.length} photo(s) téléchargée(s)`);
      } else {
        showToast(data.error || 'Échec du téléchargement', 'error');
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const addImageUrl = () => {
    if (!newImageUrl.trim()) return;
    setImages((prev) => [...prev, newImageUrl.trim()]);
    setNewImageUrl('');
  };

  const addVariantRow = () => {
    setVariants((prev) => [...prev, { size: 'M', color_name: 'Beige Sable', color_hex: '#D8C7AE', stock: 5 }]);
  };

  const updateVariant = (idx: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((v, i) => (i === idx ? { ...v, ...patch } : v)));
  };

  const removeVariant = (idx: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      };
      if (adminToken) headers.Authorization = `Bearer ${adminToken}`;

      const payload = {
        name,
        description,
        brand,
        category_id: categoryId,
        gender,
        price_mad: Number(priceMad),
        promo_price_mad: promoPriceMad ? Number(promoPriceMad) : null,
        is_new: isNew,
        is_bestseller: isBestseller,
        is_active: isActive,
        images,
        variants,
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers, body: JSON.stringify(payload) });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Erreur enregistrement produit', 'error');
        return;
      }
      showToast(product ? 'Produit mis à jour' : 'Produit ajouté au catalogue');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 overflow-y-auto">
      <div className="my-8 w-full max-w-3xl border border-[#E5DEC9] bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5DEC9] px-6 py-4">
          <h2 className="font-display text-2xl font-semibold text-[#111111]">
            {product ? `Modifier : ${product.name}` : 'Ajouter un nouveau produit'}
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 text-[#5D574F] hover:text-[#111111] cursor-pointer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[80vh] overflow-y-auto p-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Nom du produit *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Marque / Ligne</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Catégorie *</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="mt-1 w-full border border-[#D7CFC0] bg-white px-3 py-2 text-sm"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Genre</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'Femme' | 'Homme' | 'Mixte')}
                className="mt-1 w-full border border-[#D7CFC0] bg-white px-3 py-2 text-sm"
              >
                <option value="Femme">Femme</option>
                <option value="Homme">Homme</option>
                <option value="Mixte">Mixte</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Prix (MAD) *</label>
              <input
                type="number"
                required
                min={1}
                value={priceMad}
                onChange={(e) => setPriceMad(e.target.value)}
                className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 text-sm tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[#3B3732]">Prix promo (MAD)</label>
              <input
                type="number"
                min={0}
                value={promoPriceMad}
                onChange={(e) => setPromoPriceMad(e.target.value)}
                placeholder="Optionnel"
                className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 text-sm tabular-nums"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#3B3732]">Description détaillée</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 text-sm focus:border-[#111111] focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-6 text-xs font-medium">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#111111]" />
              <span>Produit actif (visible en boutique)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isNew} onChange={(e) => setIsNew(e.target.checked)} className="accent-[#111111]" />
              <span>Nouveauté</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isBestseller} onChange={(e) => setIsBestseller(e.target.checked)} className="accent-[#111111]" />
              <span>Meilleure vente</span>
            </label>
          </div>

          {/* Multi-Image Upload */}
          <div className="border-t border-[#E5DEC9] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Photos du produit (la 1ère est principale)
              </h3>
              <label className="inline-flex items-center gap-1.5 bg-[#111111] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer">
                <Upload className="h-3.5 w-3.5" />
                <span>{uploading ? 'Envoi...' : 'Télécharger des photos'}</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFileUpload} />
              </label>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Ou coller une URL d'image (/src/assets/...)"
                className="flex-1 border border-[#D7CFC0] px-3 py-1.5 text-xs"
              />
              <button
                type="button"
                onClick={addImageUrl}
                className="border border-[#111111] px-3 py-1.5 text-xs font-medium cursor-pointer"
              >
                Ajouter URL
              </button>
            </div>

            {images.length > 0 && (
              <div className="flex flex-wrap gap-3">
                {images.map((url, idx) => (
                  <div key={`${url}-${idx}`} className="relative h-24 w-20 border border-[#D7CFC0] bg-[#EDE8DF]">
                    <img src={url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-700 text-white text-xs cursor-pointer"
                    >
                      ×
                    </button>
                    {idx === 0 && (
                      <span className="absolute bottom-0 inset-x-0 bg-black/70 text-[10px] text-center text-white py-0.5">
                        Principale
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Variants Matrix */}
          <div className="border-t border-[#E5DEC9] pt-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#111111]">
                Tailles, Couleurs & Stocks
              </h3>
              <button
                type="button"
                onClick={addVariantRow}
                className="inline-flex items-center gap-1 border border-[#111111] px-3 py-1 text-xs font-medium hover:bg-[#111111] hover:text-white cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Ajouter une variante</span>
              </button>
            </div>

            <div className="space-y-2">
              {variants.map((v, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                  <select
                    value={v.size}
                    onChange={(e) => updateVariant(idx, { size: e.target.value })}
                    className="col-span-3 border border-[#D7CFC0] bg-white px-2 py-1.5 text-xs"
                  >
                    {SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={v.color_name}
                    onChange={(e) => updateVariant(idx, { color_name: e.target.value })}
                    placeholder="Couleur"
                    className="col-span-4 border border-[#D7CFC0] px-2 py-1.5 text-xs"
                  />
                  <input
                    type="color"
                    value={v.color_hex}
                    onChange={(e) => updateVariant(idx, { color_hex: e.target.value })}
                    className="col-span-1 h-8 w-full border border-[#D7CFC0] p-0.5 cursor-pointer"
                  />
                  <input
                    type="number"
                    min={0}
                    value={v.stock}
                    onChange={(e) => updateVariant(idx, { stock: Number(e.target.value) })}
                    placeholder="Stock"
                    className="col-span-3 border border-[#D7CFC0] px-2 py-1.5 text-xs tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => removeVariant(idx)}
                    className="col-span-1 flex justify-center text-red-700 hover:text-red-900 cursor-pointer"
                    aria-label="Supprimer variante"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-[#E5DEC9] pt-5">
            <button
              type="button"
              onClick={onClose}
              className="border border-[#D7CFC0] px-5 py-2.5 text-xs font-medium text-[#111111] cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="bg-[#111111] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le produit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
