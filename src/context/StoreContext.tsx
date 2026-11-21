import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { AdminUser, CartItem, Category, Customer, Product, Promotion, StoreSettings } from '../types';

interface ToastMessage {
  id: number;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface AppliedCoupon {
  code: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  discount_mad: number;
}

interface StoreContextValue {
  settings: StoreSettings | null;
  categories: Category[];
  promotions: Promotion[];
  refreshStore: () => Promise<void>;

  cart: CartItem[];
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: number, size: string, colorName: string) => void;
  updateCartQty: (productId: number, size: string, colorName: string, qty: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotalMad: number;
  appliedCoupon: AppliedCoupon | null;
  applyCoupon: (code: string) => Promise<boolean>;
  removeCoupon: () => void;
  getShippingFee: (city: string) => number;

  customer: Customer | null;
  customerToken: string | null;
  favorites: Product[];
  guestFavoriteIds: number[];
  isFavorite: (productId: number) => boolean;
  toggleFavorite: (product: Product) => Promise<void>;
  loginCustomer: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  registerCustomer: (payload: Record<string, string>) => Promise<{ ok: boolean; error?: string }>;
  logoutCustomer: () => Promise<void>;
  refreshCustomer: () => Promise<void>;

  adminUser: AdminUser | null;
  adminToken: string | null;
  adminChecked: boolean;
  loginAdmin: (username: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logoutAdmin: () => Promise<void>;

  showToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

const StoreContext = createContext<StoreContextValue | null>(null);

const CART_KEY = 'casastyle_cart_v1';
const GUEST_FAV_KEY = 'casastyle_guest_favs_v1';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_KEY);
      return saved ? (JSON.parse(saved) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<Product[]>([]);
  const [guestFavoriteIds, setGuestFavoriteIds] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem(GUEST_FAV_KEY);
      return saved ? (JSON.parse(saved) as number[]) : [];
    } catch {
      return [];
    }
  });

  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [adminToken, setAdminToken] = useState<string | null>(null);
  const [adminChecked, setAdminChecked] = useState(false);

  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3400);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      // ignore storage quota errors
    }
  }, [cart]);

  useEffect(() => {
    try {
      localStorage.setItem(GUEST_FAV_KEY, JSON.stringify(guestFavoriteIds));
    } catch {
      // ignore
    }
  }, [guestFavoriteIds]);

  const refreshStore = useCallback(async () => {
    try {
      const res = await fetch('/api/store');
      if (res.ok) {
        const data = await res.json();
        setSettings(data.settings);
        setCategories(data.categories || []);
        setPromotions(data.promotions || []);
      }
    } catch (e) {
      console.error('Failed to load store data', e);
    }
  }, []);

  const refreshCustomer = useCallback(async (tokenOverride?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      const tk = tokenOverride ?? customerToken;
      if (tk) headers.Authorization = `Bearer ${tk}`;
      const res = await fetch('/api/customer/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setCustomer(data.customer);
        const favRes = await fetch('/api/customer/favorites', { headers });
        if (favRes.ok) {
          const favData = await favRes.json();
          setFavorites(favData.favorites || []);
        }
      } else {
        setCustomer(null);
        setFavorites([]);
      }
    } catch {
      setCustomer(null);
    }
  }, [customerToken]);

  const checkAdminSession = useCallback(async (tokenOverride?: string | null) => {
    try {
      const headers: Record<string, string> = {};
      const tk = tokenOverride ?? adminToken;
      if (tk) headers.Authorization = `Bearer ${tk}`;
      const res = await fetch('/api/admin/me', { headers });
      if (res.ok) {
        const data = await res.json();
        setAdminUser(data.user);
      } else {
        setAdminUser(null);
      }
    } catch {
      setAdminUser(null);
    } finally {
      setAdminChecked(true);
    }
  }, [adminToken]);

  useEffect(() => {
    void refreshStore();
    void refreshCustomer();
    void checkAdminSession();
  }, [refreshStore, refreshCustomer, checkAdminSession]);

  const addToCart = useCallback(
    (item: CartItem) => {
      setCart((prev) => {
        const idx = prev.findIndex(
          (i) => i.product_id === item.product_id && i.size === item.size && i.color_name === item.color_name
        );
        if (idx >= 0) {
          const updated = [...prev];
          const nextQty = Math.min(item.max_stock, updated[idx].quantity + item.quantity);
          updated[idx] = { ...updated[idx], quantity: nextQty, unit_price_mad: item.unit_price_mad };
          return updated;
        }
        return [...prev, item];
      });
      showToast(`« ${item.name} » ajouté au panier`);
      setIsCartOpen(true);
    },
    [showToast]
  );

  const removeFromCart = useCallback((productId: number, size: string, colorName: string) => {
    setCart((prev) =>
      prev.filter((i) => !(i.product_id === productId && i.size === size && i.color_name === colorName))
    );
  }, []);

  const updateCartQty = useCallback((productId: number, size: string, colorName: string, qty: number) => {
    if (qty <= 0) {
      removeFromCart(productId, size, colorName);
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product_id === productId && i.size === size && i.color_name === colorName
          ? { ...i, quantity: Math.min(i.max_stock || 99, qty) }
          : i
      )
    );
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    setAppliedCoupon(null);
  }, []);

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalMad = cart.reduce((sum, i) => sum + i.unit_price_mad * i.quantity, 0);

  const applyCoupon = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        const res = await fetch('/api/coupons/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code, subtotal: subtotalMad }),
        });
        const data = await res.json();
        if (!res.ok) {
          showToast(data.error || 'Code promo invalide', 'error');
          return false;
        }
        setAppliedCoupon(data.coupon);
        showToast(`Code ${data.coupon.code} appliqué (-${data.coupon.discount_mad} MAD)`);
        return true;
      } catch {
        showToast('Impossible de vérifier le code promo', 'error');
        return false;
      }
    },
    [subtotalMad, showToast]
  );

  const removeCoupon = useCallback(() => {
    setAppliedCoupon(null);
  }, []);

  const getShippingFee = useCallback(
    (city: string): number => {
      if (cart.length === 0) return 0;
      const discount = appliedCoupon ? appliedCoupon.discount_mad : 0;
      const netSubtotal = Math.max(0, subtotalMad - discount);
      const threshold = settings?.free_shipping_threshold_mad ?? 1200;
      if (netSubtotal >= threshold) return 0;
      const isCasa = city.trim().toLowerCase() === 'casablanca';
      return isCasa
        ? (settings?.shipping_casablanca_mad ?? 30)
        : (settings?.shipping_other_cities_mad ?? 50);
    },
    [cart.length, appliedCoupon, subtotalMad, settings]
  );

  const isFavorite = useCallback(
    (productId: number) => {
      if (customer) return favorites.some((f) => f.id === productId);
      return guestFavoriteIds.includes(productId);
    },
    [customer, favorites, guestFavoriteIds]
  );

  const toggleFavorite = useCallback(
    async (product: Product) => {
      if (customer) {
        const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
        if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
        const res = await fetch(`/api/customer/favorites/${product.id}`, {
          method: 'POST',
          headers,
        });
        if (res.ok) {
          const data = await res.json();
          if (data.favorited) {
            setFavorites((prev) => (prev.some((f) => f.id === product.id) ? prev : [product, ...prev]));
            showToast('Ajouté à vos favoris');
          } else {
            setFavorites((prev) => prev.filter((f) => f.id !== product.id));
            showToast('Retiré des favoris', 'info');
          }
        }
      } else {
        setGuestFavoriteIds((prev) => {
          const exists = prev.includes(product.id);
          if (exists) {
            showToast('Retiré des favoris', 'info');
            return prev.filter((id) => id !== product.id);
          }
          showToast('Ajouté aux favoris');
          return [...prev, product.id];
        });
      }
    },
    [customer, customerToken, showToast]
  );

  const loginCustomer = useCallback(
    async (email: string, password: string) => {
      const res = await fetch('/api/customer/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Connexion échouée' };
      setCustomerToken(data.token);
      setCustomer(data.customer);
      await refreshCustomer(data.token);
      showToast(`Bienvenue, ${data.customer.full_name}`);
      return { ok: true };
    },
    [refreshCustomer, showToast]
  );

  const registerCustomer = useCallback(
    async (payload: Record<string, string>) => {
      const res = await fetch('/api/customer/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Inscription échouée' };
      setCustomerToken(data.token);
      setCustomer(data.customer);
      await refreshCustomer(data.token);
      showToast('Compte client créé avec succès');
      return { ok: true };
    },
    [refreshCustomer, showToast]
  );

  const logoutCustomer = useCallback(async () => {
    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (customerToken) headers.Authorization = `Bearer ${customerToken}`;
    await fetch('/api/customer/logout', { method: 'POST', headers });
    setCustomer(null);
    setCustomerToken(null);
    setFavorites([]);
    showToast('Vous êtes déconnecté(e)', 'info');
  }, [customerToken, showToast]);

  const loginAdmin = useCallback(
    async (username: string, password: string) => {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) return { ok: false, error: data.error || 'Accès refusé' };
      setAdminToken(data.token);
      setAdminUser(data.user);
      setAdminChecked(true);
      showToast('Connexion administration réussie');
      return { ok: true };
    },
    [showToast]
  );

  const logoutAdmin = useCallback(async () => {
    const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
    if (adminToken) headers.Authorization = `Bearer ${adminToken}`;
    await fetch('/api/admin/logout', { method: 'POST', headers });
    setAdminUser(null);
    setAdminToken(null);
    showToast('Session administration fermée', 'info');
  }, [adminToken, showToast]);

  return (
    <StoreContext.Provider
      value={{
        settings,
        categories,
        promotions,
        refreshStore,
        cart,
        isCartOpen,
        setIsCartOpen,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        cartCount,
        subtotalMad,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        getShippingFee,
        customer,
        customerToken,
        favorites,
        guestFavoriteIds,
        isFavorite,
        toggleFavorite,
        loginCustomer,
        registerCustomer,
        logoutCustomer,
        refreshCustomer,
        adminUser,
        adminToken,
        adminChecked,
        loginAdmin,
        logoutAdmin,
        showToast,
      }}
    >
      {children}

      {/* Minimalist Toast Stack */}
      <div className="fixed bottom-5 left-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto px-4 py-3 text-sm font-medium border shadow-lg transition-all duration-200 ${
              t.type === 'error'
                ? 'bg-[#111111] text-white border-red-500/60'
                : t.type === 'info'
                ? 'bg-white text-[#111111] border-[#E4DDD1]'
                : 'bg-[#111111] text-[#FAF8F5] border-[#B89446]/60'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
