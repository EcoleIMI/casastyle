/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { StoreProvider } from './context/StoreContext';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CatalogPage } from './pages/CatalogPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { CartPage, CheckoutPage } from './pages/CartAndCheckoutPages';
import { AccountPage } from './pages/AccountPage';
import {
  ContactPage,
  DeliveryPage,
  NotFoundPage,
  PrivacyPage,
  ReturnsPage,
  TermsPage,
} from './pages/StaticAndContactPages';
import { AdminPage } from './pages/admin/AdminPage';

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <ScrollToTop />
        <Routes>
          <Route path="/admin" element={<AdminPage />} />
          <Route
            path="*"
            element={
              <Layout>
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/boutique" element={<CatalogPage />} />
                  <Route path="/produit/:slug" element={<ProductDetailPage />} />
                  <Route path="/panier" element={<CartPage />} />
                  <Route path="/commande" element={<CheckoutPage />} />
                  <Route path="/compte" element={<AccountPage />} />
                  <Route path="/contact" element={<ContactPage />} />
                  <Route path="/livraison" element={<DeliveryPage />} />
                  <Route path="/retours" element={<ReturnsPage />} />
                  <Route path="/cgv" element={<TermsPage />} />
                  <Route path="/confidentialite" element={<PrivacyPage />} />
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </Layout>
            }
          />
        </Routes>
      </StoreProvider>
    </BrowserRouter>
  );
}
