import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  BarChart3,
  Edit3,
  Eye,
  KeyRound,
  LogOut,
  Mail,
  Package,
  Percent,
  Plus,
  Printer,
  Settings,
  ShoppingCart,
  Store,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import {
  formatMad,
  type Coupon,
  type Customer,
  type Order,
  type Product,
  type Promotion,
  type StoreSettings,
} from '../../types';
import { AdminProductModal } from './AdminProductModal';

type AdminTab = 'dashboard' | 'products' | 'orders' | 'customers' | 'promotions' | 'settings';

const ORDER_STATUSES: Order['status'][] = [
  'En attente',
  'Confirmée',
  'En préparation',
  'Expédiée',
  'Livrée',
  'Annulée',
];

interface DashboardData {
  kpis: {
    totalProducts: number;
    outOfStockProducts: number;
    totalOrders: number;
    pendingOrders: number;
    totalCustomers: number;
    totalRevenueMad: number;
  };
  charts: {
    daily: Array<{ label: string; revenue: number; orders: number }>;
    monthly: Array<{ label: string; revenue: number; orders: number }>;
    yearly: Array<{ label: string; revenue: number; orders: number }>;
  };
  recentOrders: Order[];
}

interface ContactMsg {
  id: number;
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
  created_at: string;
}

export function AdminPage() {
  const {
    adminUser,
    adminToken,
    adminChecked,
    loginAdmin,
    logoutAdmin,
    categories,
    settings,
    refreshStore,
    showToast,
  } = useStore();

  // Login Form (never pre-fill or store password)
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Data States
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [chartGranularity, setChartGranularity] = useState<'daily' | 'monthly' | 'yearly'>('daily');

  const [products, setProducts] = useState<Product[]>([]);
  const [prodSearch, setProdSearch] = useState('');
  const [prodCatFilter, setProdCatFilter] = useState('all');
  const [editingProduct, setEditingProduct] = useState<Product | null | undefined>(undefined);

  const [orders, setOrders] = useState<Order[]>([]);
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [custSearch, setCustSearch] = useState('');
  const [selectedCustomerDetail, setSelectedCustomerDetail] = useState<{
    customer: Customer;
    orders: Order[];
  } | null>(null);

  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [messages, setMessages] = useState<ContactMsg[]>([]);

  // New Promo / Coupon form states
  const [promoTitle, setPromoTitle] = useState('');
  const [promoDesc, setPromoDesc] = useState('');
  const [promoDiscount, setPromoDiscount] = useState('15');
  const [promoStart, setPromoStart] = useState('2026-01-01');
  const [promoEnd, setPromoEnd] = useState('2026-12-31');

  const [couponCode, setCouponCode] = useState('');
  const [couponType, setCouponType] = useState<'percent' | 'fixed'>('percent');
  const [couponValue, setCouponValue] = useState('10');
  const [couponMin, setCouponMin] = useState('500');
  const [couponMaxUses, setCouponMaxUses] = useState('100');
  const [couponStart, setCouponStart] = useState('2026-01-01');
  const [couponEnd, setCouponEnd] = useState('2026-12-31');

  // Settings Form
  const [settingsForm, setSettingsForm] = useState<Partial<StoreSettings>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  // Admin Password Change
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');

  const authHeaders = useCallback(
    (json = false): Record<string, string> => {
      const h: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
      if (adminToken) h.Authorization = `Bearer ${adminToken}`;
      if (json) h['Content-Type'] = 'application/json';
      return h;
    },
    [adminToken]
  );

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/admin/dashboard', { headers: authHeaders() });
    if (res.ok) setDashboard(await res.json());
  }, [authHeaders]);

  const loadProducts = useCallback(async () => {
    const q = new URLSearchParams();
    if (prodSearch) q.set('search', prodSearch);
    if (prodCatFilter !== 'all') q.set('category', prodCatFilter);
    const res = await fetch(`/api/admin/products?${q.toString()}`, { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setProducts(d.products || []);
    }
  }, [authHeaders, prodSearch, prodCatFilter]);

  const loadOrders = useCallback(async () => {
    const q = new URLSearchParams();
    if (orderSearch) q.set('search', orderSearch);
    if (orderStatusFilter !== 'all') q.set('status', orderStatusFilter);
    const res = await fetch(`/api/admin/orders?${q.toString()}`, { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setOrders(d.orders || []);
    }
  }, [authHeaders, orderSearch, orderStatusFilter]);

  const loadCustomers = useCallback(async () => {
    const q = custSearch ? `?search=${encodeURIComponent(custSearch)}` : '';
    const res = await fetch(`/api/admin/customers${q}`, { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setCustomers(d.customers || []);
    }
  }, [authHeaders, custSearch]);

  const loadPromotions = useCallback(async () => {
    const res = await fetch('/api/admin/promotions', { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setPromotions(d.promotions || []);
      setCoupons(d.coupons || []);
    }
  }, [authHeaders]);

  const loadMessages = useCallback(async () => {
    const res = await fetch('/api/admin/messages', { headers: authHeaders() });
    if (res.ok) {
      const d = await res.json();
      setMessages(d.messages || []);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (!adminUser) return;
    if (activeTab === 'dashboard') void loadDashboard();
    if (activeTab === 'products') void loadProducts();
    if (activeTab === 'orders') void loadOrders();
    if (activeTab === 'customers') void loadCustomers();
    if (activeTab === 'promotions') void loadPromotions();
    if (activeTab === 'settings') void loadMessages();
  }, [adminUser, activeTab, loadDashboard, loadProducts, loadOrders, loadCustomers, loadPromotions, loadMessages]);

  useEffect(() => {
    if (settings) setSettingsForm(settings);
  }, [settings]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await loginAdmin(username, password);
      if (!res.ok) {
        setLoginError(res.error || 'Identifiants invalides.');
      } else {
        setPassword('');
      }
    } finally {
      setLoggingIn(false);
    }
  };

  const handleToggleProduct = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}/toggle`, {
      method: 'PATCH',
      headers: authHeaders(),
    });
    if (res.ok) {
      void loadProducts();
      showToast('Statut produit mis à jour');
    }
  };

  const handleDeleteProduct = async (id: number) => {
    const res = await fetch(`/api/admin/products/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      void loadProducts();
      showToast('Produit supprimé', 'info');
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, status: Order['status']) => {
    const res = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: 'PATCH',
      headers: authHeaders(true),
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      void loadOrders();
      if (selectedOrder?.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status });
      }
      showToast(`Commande passée au statut « ${status} »`);
    }
  };

  const openCustomerDetail = async (id: number) => {
    const res = await fetch(`/api/admin/customers/${id}`, { headers: authHeaders() });
    if (res.ok) {
      setSelectedCustomerDetail(await res.json());
    }
  };

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/promotions', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        title: promoTitle,
        description: promoDesc,
        discount_percent: Number(promoDiscount),
        start_date: promoStart,
        end_date: promoEnd,
        is_active: 1,
      }),
    });
    if (res.ok) {
      setPromoTitle('');
      setPromoDesc('');
      void loadPromotions();
      void refreshStore();
      showToast('Promotion créée');
    }
  };

  const handleDeletePromo = async (id: number) => {
    await fetch(`/api/admin/promotions/${id}`, { method: 'DELETE', headers: authHeaders() });
    void loadPromotions();
    void refreshStore();
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/coupons', {
      method: 'POST',
      headers: authHeaders(true),
      body: JSON.stringify({
        code: couponCode,
        discount_type: couponType,
        discount_value: Number(couponValue),
        min_order_mad: Number(couponMin),
        max_uses: Number(couponMaxUses),
        start_date: couponStart,
        end_date: couponEnd,
        is_active: 1,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setCouponCode('');
      void loadPromotions();
      showToast(`Code promo ${data.coupon.code} créé`);
    } else {
      showToast(data.error || 'Erreur création code promo', 'error');
    }
  };

  const handleToggleCoupon = async (c: Coupon) => {
    await fetch(`/api/admin/coupons/${c.id}`, {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ ...c, is_active: c.is_active === 1 ? 0 : 1 }),
    });
    void loadPromotions();
  };

  const handleDeleteCoupon = async (id: number) => {
    await fetch(`/api/admin/coupons/${id}`, { method: 'DELETE', headers: authHeaders() });
    void loadPromotions();
  };

  const handleUploadSettingAsset = async (
    e: React.ChangeEvent<HTMLInputElement>,
    field: 'logo_url' | 'hero_banner_url'
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('images', file);
    const res = await fetch('/api/admin/upload', {
      method: 'POST',
      headers: {
        'X-Requested-With': 'XMLHttpRequest',
        ...(adminToken ? { Authorization: `Bearer ${adminToken}` } : {}),
      },
      body: fd,
    });
    const data = await res.json();
    if (res.ok && data.urls?.[0]) {
      setSettingsForm((prev) => ({ ...prev, [field]: data.urls[0] }));
      showToast('Image téléchargée');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: authHeaders(true),
        body: JSON.stringify(settingsForm),
      });
      if (res.ok) {
        await refreshStore();
        showToast('Paramètres de la boutique enregistrés');
      } else {
        showToast('Erreur enregistrement paramètres', 'error');
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      showToast('Les nouveaux mots de passe ne correspondent pas', 'error');
      return;
    }
    const res = await fetch('/api/admin/password', {
      method: 'PUT',
      headers: authHeaders(true),
      body: JSON.stringify({ current_password: currentPwd, new_password: newPwd }),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      showToast('Mot de passe administrateur mis à jour');
    } else {
      showToast(data.error || 'Erreur modification mot de passe', 'error');
    }
  };

  const handlePrintInvoice = (order: Order) => {
    setPrintingOrder(order);
    setTimeout(() => {
      window.print();
    }, 180);
  };

  if (!adminChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] text-[#FAF8F5]">
        <span className="text-xs uppercase tracking-[0.2em]">Vérification de session...</span>
      </div>
    );
  }

  // Admin Login Screen
  if (!adminUser) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#111111] px-4">
        <div className="w-full max-w-md border border-[#2C2925] bg-[#181614] p-8 text-[#FAF8F5] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[#2C2925] pb-5">
            <div>
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#D4B876]">CASA STYLE</p>
              <h1 className="mt-1 font-display text-3xl font-medium">Administration</h1>
            </div>
            <KeyRound className="h-6 w-6 text-[#D4B876]" />
          </div>

          {loginError && (
            <div className="mt-5 border border-red-500/40 bg-red-950/60 px-3.5 py-2.5 text-xs text-red-200">
              {loginError}
            </div>
          )}

          <form onSubmit={handleAdminLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#C7C0B4]">Identifiant administrateur</label>
              <input
                type="text"
                required
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nom d'utilisateur"
                className="mt-1.5 w-full border border-[#35312C] bg-[#111111] px-3.5 py-2.5 text-sm text-white focus:border-[#D4B876] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#C7C0B4]">Mot de passe</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full border border-[#35312C] bg-[#111111] px-3.5 py-2.5 text-sm text-white focus:border-[#D4B876] focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full bg-[#D4B876] py-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#111111] transition-colors hover:bg-[#FAF8F5] cursor-pointer"
            >
              {loggingIn ? 'Connexion...' : 'Se connecter au back-office'}
            </button>
          </form>

          <div className="mt-6 border-t border-[#2C2925] pt-4 text-center">
            <Link to="/" className="text-xs text-[#9C958B] hover:text-[#D4B876]">
              ← Retourner à la boutique en ligne
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const chartData =
    chartGranularity === 'daily'
      ? dashboard?.charts.daily || []
      : chartGranularity === 'monthly'
      ? dashboard?.charts.monthly || []
      : dashboard?.charts.yearly || [];

  return (
    <div className="min-h-screen bg-[#F5F2EC] text-[#111111]">
      {/* Print Invoice Area (only visible when printing) */}
      {printingOrder && (
        <div className="hidden print-only p-8 bg-white text-black">
          <div className="flex justify-between border-b-2 border-black pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-widest">{settings?.store_name || 'CASA STYLE'}</h1>
              <p className="text-xs mt-1">{settings?.casablanca_address}</p>
              <p className="text-xs">{settings?.phone} · {settings?.email}</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold">FACTURE</h2>
              <p className="font-mono text-sm mt-1">{printingOrder.order_number}</p>
              <p className="text-xs mt-1">
                Date : {new Date(printingOrder.created_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
          </div>

          <div className="my-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <p className="font-bold uppercase text-xs text-neutral-600">Client</p>
              <p className="font-semibold mt-1">{printingOrder.customer_name}</p>
              <p>{printingOrder.customer_phone}</p>
              <p>{printingOrder.customer_email}</p>
            </div>
            <div>
              <p className="font-bold uppercase text-xs text-neutral-600">Adresse de livraison</p>
              <p className="mt-1">{printingOrder.address}</p>
              <p>
                {printingOrder.neighborhood ? `${printingOrder.neighborhood}, ` : ''}
                {printingOrder.city} {printingOrder.postal_code}
              </p>
            </div>
          </div>

          <table className="w-full border-collapse text-sm mt-4">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-2">Article</th>
                <th className="py-2">Variante</th>
                <th className="py-2 text-right">Qté</th>
                <th className="py-2 text-right">P.U (MAD)</th>
                <th className="py-2 text-right">Total (MAD)</th>
              </tr>
            </thead>
            <tbody>
              {printingOrder.items?.map((it) => (
                <tr key={it.id} className="border-b border-neutral-200">
                  <td className="py-2">{it.product_name}</td>
                  <td className="py-2">{it.size} / {it.color_name}</td>
                  <td className="py-2 text-right tabular-nums">{it.quantity}</td>
                  <td className="py-2 text-right tabular-nums">{formatMad(it.unit_price_mad)}</td>
                  <td className="py-2 text-right tabular-nums">{formatMad(it.line_total_mad)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-6 ml-auto w-64 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span>Sous-total</span>
              <span className="tabular-nums">{formatMad(printingOrder.subtotal_mad)}</span>
            </div>
            {printingOrder.discount_mad > 0 && (
              <div className="flex justify-between">
                <span>Remise</span>
                <span className="tabular-nums">-{formatMad(printingOrder.discount_mad)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Livraison</span>
              <span className="tabular-nums">{formatMad(printingOrder.shipping_fee_mad)}</span>
            </div>
            <div className="flex justify-between border-t-2 border-black pt-2 font-bold text-base">
              <span>Total TTC</span>
              <span className="tabular-nums">{formatMad(printingOrder.total_mad)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Interactive Admin Shell */}
      <div className="no-print flex min-h-screen flex-col lg:flex-row">
        {/* Sidebar (260px) */}
        <aside className="w-full lg:w-64 shrink-0 bg-[#111111] text-[#EAE4D8] flex flex-col justify-between">
          <div>
            <div className="border-b border-[#262320] px-6 py-5">
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#D4B876]">Back-Office</p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-wider text-white">
                {settings?.store_name || 'CASA STYLE'}
              </h1>
            </div>

            <nav className="p-3 space-y-1 text-xs font-medium">
              {[
                { key: 'dashboard' as const, label: 'Dashboard', icon: BarChart3 },
                { key: 'products' as const, label: 'Gestion des produits', icon: Package },
                { key: 'orders' as const, label: 'Gestion des commandes', icon: ShoppingCart },
                { key: 'customers' as const, label: 'Gestion des clients', icon: Users },
                { key: 'promotions' as const, label: 'Promotions & Codes promo', icon: Percent },
                { key: 'settings' as const, label: 'Paramètres & Sécurité', icon: Settings },
              ].map((nav) => {
                const Icon = nav.icon;
                const active = activeTab === nav.key;
                return (
                  <button
                    key={nav.key}
                    type="button"
                    onClick={() => setActiveTab(nav.key)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#D4B876] text-[#111111] font-semibold'
                        : 'text-[#C7C0B4] hover:bg-[#1E1C1A] hover:text-white'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{nav.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="border-t border-[#262320] p-4 space-y-2">
            <div className="px-2 pb-2">
              <p className="text-xs font-medium text-white truncate">{adminUser.full_name}</p>
              <p className="text-[11px] text-[#9C958B]">@{adminUser.username}</p>
            </div>
            <Link
              to="/"
              className="flex w-full items-center gap-2.5 border border-[#2F2B27] px-3.5 py-2 text-xs text-[#EAE4D8] hover:border-[#D4B876]"
            >
              <Store className="h-3.5 w-3.5 text-[#D4B876]" />
              <span>Voir la boutique</span>
            </Link>
            <button
              type="button"
              onClick={() => void logoutAdmin()}
              className="flex w-full items-center gap-2.5 px-3.5 py-2 text-xs text-[#C7C0B4] hover:text-red-400 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Déconnexion</span>
            </button>
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 p-5 sm:p-8 overflow-x-hidden">
          {/* A. DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Vue d’ensemble</p>
                  <h2 className="font-display text-3xl font-medium text-[#111111]">Tableau de bord</h2>
                </div>
                <div className="flex items-center gap-1 border border-[#D7CFC0] bg-white p-1">
                  {(
                    [
                      ['daily', 'Journalier'],
                      ['monthly', 'Mensuel'],
                      ['yearly', 'Annuel'],
                    ] as const
                  ).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setChartGranularity(key)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                        chartGranularity === key ? 'bg-[#111111] text-white' : 'text-[#5D574F] hover:text-[#111111]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 6 Real KPI Cards */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {[
                  {
                    label: 'Chiffre d’affaires',
                    val: formatMad(dashboard?.kpis.totalRevenueMad ?? 0),
                  },
                  {
                    label: 'Commandes totales',
                    val: String(dashboard?.kpis.totalOrders ?? 0),
                  },
                  {
                    label: 'En attente',
                    val: String(dashboard?.kpis.pendingOrders ?? 0),
                  },
                  {
                    label: 'Clients inscrits',
                    val: String(dashboard?.kpis.totalCustomers ?? 0),
                  },
                  {
                    label: 'Total produits',
                    val: String(dashboard?.kpis.totalProducts ?? 0),
                  },
                  {
                    label: 'Rupture de stock',
                    val: String(dashboard?.kpis.outOfStockProducts ?? 0),
                  },
                ].map((kpi) => (
                  <div key={kpi.label} className="border border-[#E5DEC9] bg-white p-4">
                    <p className="text-[11px] uppercase tracking-wider text-[#6B655D]">{kpi.label}</p>
                    <p className="mt-2 font-mono text-xl font-semibold tabular-nums text-[#111111]">
                      {kpi.val}
                    </p>
                  </div>
                ))}
              </div>

              {/* Recharts Sales Chart */}
              <div className="border border-[#E5DEC9] bg-white p-6">
                <h3 className="font-display text-xl font-medium text-[#111111]">
                  Évolution du chiffre d’affaires (MAD)
                </h3>
                <div className="mt-4 h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#B89446" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#B89446" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EDE8DF" />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B655D' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#6B655D' }} />
                      <Tooltip
                        formatter={(value) => [formatMad(Number(value || 0)), 'Revenu']}
                        contentStyle={{
                          backgroundColor: '#111111',
                          border: 'none',
                          color: '#FAF8F5',
                          fontSize: '12px',
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="revenue"
                        stroke="#B89446"
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#goldFill)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="border border-[#E5DEC9] bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-display text-xl font-medium text-[#111111]">Commandes récentes</h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('orders')}
                    className="text-xs font-medium text-[#9E7B32] underline cursor-pointer"
                  >
                    Gérer toutes les commandes
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#E5DEC9] text-[#6B655D] uppercase">
                        <th className="py-2.5 pr-4">N° Commande</th>
                        <th className="py-2.5 pr-4">Client</th>
                        <th className="py-2.5 pr-4">Ville</th>
                        <th className="py-2.5 pr-4">Statut</th>
                        <th className="py-2.5 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0ECE3]">
                      {(dashboard?.recentOrders || []).map((o) => (
                        <tr key={o.id} className="hover:bg-[#FAF8F5]">
                          <td className="py-3 pr-4 font-mono font-semibold">{o.order_number}</td>
                          <td className="py-3 pr-4">{o.customer_name}</td>
                          <td className="py-3 pr-4">{o.city}</td>
                          <td className="py-3 pr-4 font-medium text-[#9E7B32]">{o.status}</td>
                          <td className="py-3 text-right font-mono tabular-nums">{formatMad(o.total_mad)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* B. GESTION DES PRODUITS */}
          {activeTab === 'products' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Catalogue</p>
                  <h2 className="font-display text-3xl font-medium text-[#111111]">Gestion des produits</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="inline-flex items-center gap-2 bg-[#111111] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Ajouter un produit</span>
                </button>
              </div>

              <div className="flex flex-wrap gap-3 border border-[#E5DEC9] bg-white p-4">
                <input
                  type="text"
                  value={prodSearch}
                  onChange={(e) => setProdSearch(e.target.value)}
                  placeholder="Rechercher un produit..."
                  className="flex-1 min-w-[200px] border border-[#D7CFC0] px-3 py-2 text-xs"
                />
                <select
                  value={prodCatFilter}
                  onChange={(e) => setProdCatFilter(e.target.value)}
                  className="border border-[#D7CFC0] bg-white px-3 py-2 text-xs"
                >
                  <option value="all">Toutes les catégories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.slug}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="border border-[#E5DEC9] bg-white overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DEC9] bg-[#FAF8F5] text-[#6B655D] uppercase">
                      <th className="py-3 px-4">Produit</th>
                      <th className="py-3 px-4">Catégorie</th>
                      <th className="py-3 px-4 text-right">Prix</th>
                      <th className="py-3 px-4 text-right">Stock</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE3]">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {p.primary_image && (
                              <img
                                src={p.primary_image}
                                alt=""
                                referrerPolicy="no-referrer"
                                className="h-12 w-9 object-cover bg-[#EDE8DF] shrink-0"
                              />
                            )}
                            <div>
                              <p className="font-semibold text-[#111111]">{p.name}</p>
                              <p className="text-[11px] text-[#6B655D]">{p.gender} · {p.variants.length} variantes</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#5D574F]">{p.category_name}</td>
                        <td className="py-3 px-4 text-right tabular-nums">
                          {p.promo_price_mad ? (
                            <div>
                              <span className="font-semibold text-[#9E7B32]">{formatMad(p.promo_price_mad)}</span>
                              <span className="block text-[11px] line-through text-[#8B847A]">
                                {formatMad(p.price_mad)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-semibold">{formatMad(p.price_mad)}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className={p.stock_total <= 0 ? 'text-red-700 font-semibold' : ''}>
                            {p.stock_total}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => void handleToggleProduct(p.id)}
                            className={`px-2.5 py-1 text-[11px] font-medium border cursor-pointer ${
                              p.is_active === 1
                                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : 'border-neutral-300 bg-neutral-100 text-neutral-600'
                            }`}
                          >
                            {p.is_active === 1 ? 'Actif' : 'Inactif'}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingProduct(p)}
                              aria-label="Modifier"
                              className="p-1.5 text-[#111111] hover:text-[#9E7B32] cursor-pointer"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteProduct(p.id)}
                              aria-label="Supprimer"
                              className="p-1.5 text-red-700 hover:text-red-900 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {editingProduct !== undefined && (
                <AdminProductModal
                  product={editingProduct}
                  categories={categories}
                  adminToken={adminToken}
                  onClose={() => setEditingProduct(undefined)}
                  onSaved={() => {
                    setEditingProduct(undefined);
                    void loadProducts();
                    void loadDashboard();
                  }}
                  showToast={showToast}
                />
              )}
            </div>
          )}

          {/* C. GESTION DES COMMANDES */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Ventes & Expéditions</p>
                <h2 className="font-display text-3xl font-medium text-[#111111]">Gestion des commandes</h2>
              </div>

              <div className="flex flex-wrap gap-3 border border-[#E5DEC9] bg-white p-4">
                <input
                  type="text"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Rechercher par N° commande ou client..."
                  className="flex-1 min-w-[220px] border border-[#D7CFC0] px-3 py-2 text-xs"
                />
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value)}
                  className="border border-[#D7CFC0] bg-white px-3 py-2 text-xs"
                >
                  <option value="all">Tous les statuts</option>
                  {ORDER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="border border-[#E5DEC9] bg-white overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DEC9] bg-[#FAF8F5] text-[#6B655D] uppercase">
                      <th className="py-3 px-4">N° Commande</th>
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Livraison</th>
                      <th className="py-3 px-4 text-right">Total</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE3]">
                    {orders.map((o) => (
                      <tr key={o.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-4 font-mono font-semibold">{o.order_number}</td>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#111111]">{o.customer_name}</p>
                          <p className="text-[11px] text-[#6B655D] tabular-nums">{o.customer_phone}</p>
                        </td>
                        <td className="py-3 px-4 text-[#5D574F]">
                          {o.city} {o.neighborhood ? `· ${o.neighborhood}` : ''}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-semibold tabular-nums">
                          {formatMad(o.total_mad)}
                        </td>
                        <td className="py-3 px-4">
                          <select
                            value={o.status}
                            onChange={(e) => void handleUpdateOrderStatus(o.id, e.target.value as Order['status'])}
                            className="border border-[#D7CFC0] bg-white px-2 py-1 text-xs font-medium"
                          >
                            {ORDER_STATUSES.map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="inline-flex items-center gap-1 border border-[#D7CFC0] px-2.5 py-1 hover:border-[#111111] cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>Détails</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintInvoice(o)}
                              className="inline-flex items-center gap-1 bg-[#111111] px-2.5 py-1 text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                            >
                              <Printer className="h-3.5 w-3.5" />
                              <span>Facture</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-2xl border border-[#E5DEC9] bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
                      <h3 className="font-display text-2xl font-medium">
                        Commande {selectedOrder.order_number}
                      </h3>
                      <button type="button" onClick={() => setSelectedOrder(null)} className="cursor-pointer">
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <p className="font-semibold uppercase text-[#6B655D]">Client</p>
                        <p className="mt-1 font-medium text-sm">{selectedOrder.customer_name}</p>
                        <p>{selectedOrder.customer_phone}</p>
                        <p>{selectedOrder.customer_email}</p>
                      </div>
                      <div>
                        <p className="font-semibold uppercase text-[#6B655D]">Livraison</p>
                        <p className="mt-1">{selectedOrder.address}</p>
                        <p>
                          {selectedOrder.neighborhood}, {selectedOrder.city} {selectedOrder.postal_code}
                        </p>
                        {selectedOrder.notes && <p className="mt-1 italic">Note : {selectedOrder.notes}</p>}
                      </div>
                    </div>
                    <div className="border-t border-[#E5DEC9] pt-3 space-y-2 text-xs">
                      {selectedOrder.items?.map((it) => (
                        <div key={it.id} className="flex justify-between">
                          <span>
                            {it.product_name} ({it.size} / {it.color_name}) × {it.quantity}
                          </span>
                          <span className="font-mono">{formatMad(it.line_total_mad)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-[#E5DEC9] pt-2 font-semibold text-sm">
                        <span>Total (Livraison : {formatMad(selectedOrder.shipping_fee_mad)})</span>
                        <span className="font-mono">{formatMad(selectedOrder.total_mad)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* D. GESTION DES CLIENTS */}
          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Base Clients</p>
                <h2 className="font-display text-3xl font-medium text-[#111111]">Gestion des clients</h2>
              </div>

              <div className="border border-[#E5DEC9] bg-white p-4">
                <input
                  type="text"
                  value={custSearch}
                  onChange={(e) => setCustSearch(e.target.value)}
                  placeholder="Rechercher par nom, e-mail, téléphone ou ville..."
                  className="w-full max-w-md border border-[#D7CFC0] px-3 py-2 text-xs"
                />
              </div>

              <div className="border border-[#E5DEC9] bg-white overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E5DEC9] bg-[#FAF8F5] text-[#6B655D] uppercase">
                      <th className="py-3 px-4">Client</th>
                      <th className="py-3 px-4">Téléphone</th>
                      <th className="py-3 px-4">Ville</th>
                      <th className="py-3 px-4 text-right">Commandes</th>
                      <th className="py-3 px-4 text-right">Total dépensé</th>
                      <th className="py-3 px-4 text-right">Historique</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE3]">
                    {customers.map((c) => (
                      <tr key={c.id} className="hover:bg-[#FAF8F5]">
                        <td className="py-3 px-4">
                          <p className="font-semibold text-[#111111]">{c.full_name}</p>
                          <p className="text-[11px] text-[#6B655D]">{c.email}</p>
                        </td>
                        <td className="py-3 px-4 tabular-nums">{c.phone}</td>
                        <td className="py-3 px-4">{c.city}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">{c.order_count ?? 0}</td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          {formatMad(c.total_spent_mad ?? 0)}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => void openCustomerDetail(c.id)}
                            className="border border-[#D7CFC0] px-3 py-1 hover:border-[#111111] cursor-pointer"
                          >
                            Voir commandes
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedCustomerDetail && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-2xl border border-[#E5DEC9] bg-white p-6 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E5DEC9] pb-3">
                      <h3 className="font-display text-2xl font-medium">
                        {selectedCustomerDetail.customer.full_name}
                      </h3>
                      <button
                        type="button"
                        onClick={() => setSelectedCustomerDetail(null)}
                        className="cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                    <div className="text-xs text-[#5D574F] space-y-1">
                      <p>E-mail : {selectedCustomerDetail.customer.email}</p>
                      <p>Téléphone : {selectedCustomerDetail.customer.phone}</p>
                      <p>
                        Adresse : {selectedCustomerDetail.customer.address}, {selectedCustomerDetail.customer.neighborhood},{' '}
                        {selectedCustomerDetail.customer.city}
                      </p>
                    </div>
                    <div className="border-t border-[#E5DEC9] pt-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider mb-2">
                        Commandes ({selectedCustomerDetail.orders.length})
                      </h4>
                      <div className="max-h-60 overflow-y-auto divide-y divide-[#F0ECE3] text-xs">
                        {selectedCustomerDetail.orders.map((o) => (
                          <div key={o.id} className="flex justify-between py-2.5">
                            <div>
                              <span className="font-mono font-semibold">{o.order_number}</span>
                              <span className="ml-2 text-[#9E7B32]">{o.status}</span>
                            </div>
                            <span className="font-mono tabular-nums">{formatMad(o.total_mad)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* E. GESTION DES PROMOTIONS & CODES PROMO */}
          {activeTab === 'promotions' && (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Marketing</p>
                <h2 className="font-display text-3xl font-medium text-[#111111]">
                  Promotions & Codes promo
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
                {/* Promotions Campagnes */}
                <div className="border border-[#E5DEC9] bg-white p-6 space-y-5">
                  <h3 className="font-display text-2xl font-medium">Campagnes Promotionnelles</h3>
                  <form onSubmit={handleCreatePromo} className="space-y-3 text-xs">
                    <input
                      type="text"
                      required
                      value={promoTitle}
                      onChange={(e) => setPromoTitle(e.target.value)}
                      placeholder="Titre de la campagne (ex: Soldes d'Hiver)"
                      className="w-full border border-[#D7CFC0] px-3 py-2"
                    />
                    <input
                      type="text"
                      value={promoDesc}
                      onChange={(e) => setPromoDesc(e.target.value)}
                      placeholder="Description courte"
                      className="w-full border border-[#D7CFC0] px-3 py-2"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="number"
                        required
                        min={1}
                        max={90}
                        value={promoDiscount}
                        onChange={(e) => setPromoDiscount(e.target.value)}
                        placeholder="% Réduction"
                        className="border border-[#D7CFC0] px-3 py-2"
                      />
                      <input
                        type="date"
                        required
                        value={promoStart}
                        onChange={(e) => setPromoStart(e.target.value)}
                        className="border border-[#D7CFC0] px-2 py-2"
                      />
                      <input
                        type="date"
                        required
                        value={promoEnd}
                        onChange={(e) => setPromoEnd(e.target.value)}
                        className="border border-[#D7CFC0] px-2 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#111111] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                    >
                      Créer la promotion
                    </button>
                  </form>

                  <div className="divide-y divide-[#F0ECE3] text-xs">
                    {promotions.map((pr) => (
                      <div key={pr.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-semibold text-[#111111]">
                            {pr.title} (-{pr.discount_percent}%)
                          </p>
                          <p className="text-[#6B655D]">
                            Du {pr.start_date} au {pr.end_date}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => void handleDeletePromo(pr.id)}
                          className="text-red-700 hover:text-red-900 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coupons */}
                <div className="border border-[#E5DEC9] bg-white p-6 space-y-5">
                  <h3 className="font-display text-2xl font-medium">Codes Promo</h3>
                  <form onSubmit={handleCreateCoupon} className="space-y-3 text-xs">
                    <div className="grid grid-cols-3 gap-2">
                      <input
                        type="text"
                        required
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        placeholder="CODE (ex: CASA20)"
                        className="border border-[#D7CFC0] px-3 py-2 uppercase font-mono"
                      />
                      <select
                        value={couponType}
                        onChange={(e) => setCouponType(e.target.value as 'percent' | 'fixed')}
                        className="border border-[#D7CFC0] bg-white px-2 py-2"
                      >
                        <option value="percent">Pourcentage (%)</option>
                        <option value="fixed">Montant fixe (MAD)</option>
                      </select>
                      <input
                        type="number"
                        required
                        min={1}
                        value={couponValue}
                        onChange={(e) => setCouponValue(e.target.value)}
                        placeholder="Valeur"
                        className="border border-[#D7CFC0] px-3 py-2 tabular-nums"
                      />
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <input
                        type="number"
                        min={0}
                        value={couponMin}
                        onChange={(e) => setCouponMin(e.target.value)}
                        placeholder="Min MAD"
                        className="border border-[#D7CFC0] px-2 py-2 tabular-nums"
                      />
                      <input
                        type="number"
                        min={0}
                        value={couponMaxUses}
                        onChange={(e) => setCouponMaxUses(e.target.value)}
                        placeholder="Max util."
                        className="border border-[#D7CFC0] px-2 py-2 tabular-nums"
                      />
                      <input
                        type="date"
                        required
                        value={couponStart}
                        onChange={(e) => setCouponStart(e.target.value)}
                        className="border border-[#D7CFC0] px-2 py-2"
                      />
                      <input
                        type="date"
                        required
                        value={couponEnd}
                        onChange={(e) => setCouponEnd(e.target.value)}
                        className="border border-[#D7CFC0] px-2 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-[#111111] px-4 py-2 text-xs font-semibold text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                    >
                      Créer le code promo
                    </button>
                  </form>

                  <div className="divide-y divide-[#F0ECE3] text-xs">
                    {coupons.map((c) => (
                      <div key={c.id} className="flex items-center justify-between py-3">
                        <div>
                          <p className="font-mono font-semibold text-[#111111]">
                            {c.code} — {c.discount_type === 'percent' ? `${c.discount_value}%` : formatMad(c.discount_value)}
                          </p>
                          <p className="text-[#6B655D]">
                            Min: {formatMad(c.min_order_mad)} · Utilisations: {c.used_count}/{c.max_uses || '∞'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleToggleCoupon(c)}
                            className={`px-2 py-1 border cursor-pointer ${
                              c.is_active === 1 ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-neutral-300'
                            }`}
                          >
                            {c.is_active === 1 ? 'Actif' : 'Inactif'}
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDeleteCoupon(c.id)}
                            className="text-red-700 cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* F. PARAMÈTRES DU SITE & SÉCURITÉ */}
          {activeTab === 'settings' && (
            <div className="space-y-8">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[#9E7B32]">Configuration</p>
                <h2 className="font-display text-3xl font-medium text-[#111111]">
                  Paramètres du site & Sécurité
                </h2>
              </div>

              <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                <form
                  onSubmit={handleSaveSettings}
                  className="lg:col-span-8 border border-[#E5DEC9] bg-white p-6 space-y-5 text-xs"
                >
                  <h3 className="font-display text-2xl font-medium text-[#111111]">Identité, Livraison & Coordonnées</h3>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Nom de la boutique</label>
                      <input
                        type="text"
                        value={settingsForm.store_name || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, store_name: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Slogan</label>
                      <input
                        type="text"
                        value={settingsForm.slogan || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, slogan: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Logo (URL ou upload)</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.logo_url || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, logo_url: e.target.value }))}
                          placeholder="Optionnel (texte sinon)"
                          className="flex-1 border border-[#D7CFC0] px-3 py-2"
                        />
                        <label className="inline-flex items-center gap-1 border border-[#111111] px-3 py-2 cursor-pointer">
                          <Upload className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void handleUploadSettingAsset(e, 'logo_url')}
                          />
                        </label>
                      </div>
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Bannière Hero (URL ou upload)</label>
                      <div className="mt-1 flex gap-2">
                        <input
                          type="text"
                          value={settingsForm.hero_banner_url || ''}
                          onChange={(e) => setSettingsForm((p) => ({ ...p, hero_banner_url: e.target.value }))}
                          className="flex-1 border border-[#D7CFC0] px-3 py-2"
                        />
                        <label className="inline-flex items-center gap-1 border border-[#111111] px-3 py-2 cursor-pointer">
                          <Upload className="h-3.5 w-3.5" />
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => void handleUploadSettingAsset(e, 'hero_banner_url')}
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Titre bannière principale</label>
                      <input
                        type="text"
                        value={settingsForm.hero_title || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, hero_title: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Sous-titre bannière</label>
                      <input
                        type="text"
                        value={settingsForm.hero_subtitle || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, hero_subtitle: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Téléphone</label>
                      <input
                        type="text"
                        value={settingsForm.phone || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, phone: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Numéro WhatsApp</label>
                      <input
                        type="text"
                        value={settingsForm.whatsapp_number || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, whatsapp_number: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">E-mail boutique</label>
                      <input
                        type="email"
                        value={settingsForm.email || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, email: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Adresse Casablanca</label>
                      <input
                        type="text"
                        value={settingsForm.casablanca_address || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, casablanca_address: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Horaires d’ouverture</label>
                      <input
                        type="text"
                        value={settingsForm.opening_hours || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, opening_hours: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Livraison Casablanca (MAD)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.shipping_casablanca_mad ?? 30}
                        onChange={(e) =>
                          setSettingsForm((p) => ({ ...p, shipping_casablanca_mad: Number(e.target.value) }))
                        }
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Livraison Autres villes (MAD)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.shipping_other_cities_mad ?? 50}
                        onChange={(e) =>
                          setSettingsForm((p) => ({ ...p, shipping_other_cities_mad: Number(e.target.value) }))
                        }
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Seuil livraison offerte (MAD)</label>
                      <input
                        type="number"
                        min={0}
                        value={settingsForm.free_shipping_threshold_mad ?? 1200}
                        onChange={(e) =>
                          setSettingsForm((p) => ({ ...p, free_shipping_threshold_mad: Number(e.target.value) }))
                        }
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2 tabular-nums"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="block font-medium text-[#3B3732]">Instagram URL</label>
                      <input
                        type="url"
                        value={settingsForm.instagram_url || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, instagram_url: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Facebook URL</label>
                      <input
                        type="url"
                        value={settingsForm.facebook_url || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, facebook_url: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">TikTok URL</label>
                      <input
                        type="url"
                        value={settingsForm.tiktok_url || ''}
                        onChange={(e) => setSettingsForm((p) => ({ ...p, tiktok_url: e.target.value }))}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={savingSettings}
                    className="bg-[#111111] px-6 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                  >
                    {savingSettings ? 'Enregistrement...' : 'Sauvegarder les paramètres'}
                  </button>
                </form>

                {/* Right Column: Password Change & Contact Messages */}
                <div className="lg:col-span-4 space-y-6">
                  <form
                    onSubmit={handleChangePassword}
                    className="border border-[#E5DEC9] bg-white p-6 space-y-4 text-xs"
                  >
                    <h3 className="font-display text-2xl font-medium text-[#111111]">
                      Modifier le mot de passe
                    </h3>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Mot de passe actuel</label>
                      <input
                        type="password"
                        required
                        value={currentPwd}
                        onChange={(e) => setCurrentPwd(e.target.value)}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Nouveau mot de passe (8+ car.)</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block font-medium text-[#3B3732]">Confirmer le mot de passe</label>
                      <input
                        type="password"
                        required
                        minLength={8}
                        value={confirmPwd}
                        onChange={(e) => setConfirmPwd(e.target.value)}
                        className="mt-1 w-full border border-[#D7CFC0] px-3 py-2"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-[#111111] py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#B89446] hover:text-[#111111] cursor-pointer"
                    >
                      Mettre à jour le mot de passe
                    </button>
                  </form>

                  <div className="border border-[#E5DEC9] bg-white p-6 space-y-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-[#9E7B32]" />
                      <h3 className="font-display text-xl font-medium">
                        Messages clients ({messages.length})
                      </h3>
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-[#F0ECE3] text-xs">
                      {messages.length === 0 ? (
                        <p className="text-[#6B655D]">Aucun message reçu.</p>
                      ) : (
                        messages.map((m) => (
                          <div key={m.id} className="py-2.5">
                            <p className="font-semibold text-[#111111]">{m.subject}</p>
                            <p className="text-[#6B655D]">
                              {m.name} · {m.email}
                            </p>
                            <p className="mt-1 text-[#3B3732]">{m.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
