import React from 'react';
import {
  BrowserRouter,
  Route,
  Routes,
  useLocation,
  useParams,
} from 'react-router-dom';
import { AuthModal } from './components/AuthModal';
import { CartDrawer } from './components/CartDrawer';
import { Footer } from './components/Footer';
import { Navbar } from './components/Navbar';
import { ENV } from './config/env';
import { StoreProvider, useStore } from './context/StoreContext';
import { AudioChainPage } from './pages/AudioChainPage';
import { CatalogPage } from './pages/CatalogPage';
import { ComparePage } from './pages/ComparePage';
import { HomePage } from './pages/HomePage';
import { OrdersPage } from './pages/OrdersPage';
import { ProductDetailPage } from './pages/ProductDetailPage';
import { TechnologyPage } from './pages/TechnologyPage';

const ProductDetailRoute: React.FC = () => {
  const { productId = '' } = useParams<{ productId: string }>();
  return <ProductDetailPage productId={decodeURIComponent(productId)} />;
};

const MultiPageRouter: React.FC = () => {
  const { toasts, dismissToast, navigate } = useStore();
  const location = useLocation();

  // Standalone Admin Studio Route - Redirects to isolated Admin Portal (Port 5174)
  if (location.pathname.startsWith('/admin')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f2f4f5] px-4 py-12 text-[#000000]">
        <div className="w-full max-w-md shop-card rounded-[28px] bg-[#ffffff] p-8 md:p-10 text-center space-y-5">
          <div className="flex items-baseline justify-center">
            <span className="text-[30px] leading-none tracking-[-0.06em] text-[#5433eb]">
              shop
            </span>
            <span className="ml-0.5 inline-block h-2 w-2 rounded-full bg-[#5433eb]" />
          </div>
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
              <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
              <span>Isolated Admin Studio · Port 5174</span>
            </span>
          </div>
          <h2 className="text-[24px] leading-tight tracking-[-0.05em] text-[#000000]">
            Cổng Quản Trị Riêng Biệt
          </h2>
          <p className="text-[13.5px] tracking-[-0.014em] text-[#787574]">
            Trang Admin hoạt động trên liên kết độc lập để tách biệt hoàn toàn khỏi cửa hàng khách hàng.
          </p>
          <div className="pt-1 space-y-2.5">
            <a
              href={ENV.ADMIN_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5433eb] py-3 text-[13.5px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] transition-all"
            >
              <span>Mở Cổng Quản Trị Admin (Port 5174)</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
            <button
              type="button"
              onClick={() => navigate('/')}
              className="sl-btn-light w-full text-[13px]"
            >
              Quay lại Trang Chủ Shop
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f2f4f5] text-[#000000] pb-[64px] md:pb-0">
      <Navbar />
      <main
        key={location.pathname}
        className="flex-1 md:pl-16 animate-page-entrance"
      >
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/products" element={<CatalogPage />} />
          <Route path="/product/:productId" element={<ProductDetailRoute />} />
          <Route path="/chain-builder" element={<AudioChainPage />} />
          <Route path="/technology" element={<TechnologyPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/orders" element={<OrdersPage />} />
          <Route
            path="*"
            element={
              <section className="mx-auto max-w-[1200px] px-5 py-24 text-center space-y-4">
                <div className="sl-label text-[#787574]">404 · Not found</div>
                <h1 className="sl-subheading">
                  Requested category or product does not exist.
                </h1>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="sl-btn-dark mt-2"
                >
                  Back to Categories
                </button>
              </section>
            }
          />
        </Routes>
      </main>
      <div className="md:pl-16">
        <Footer />
      </div>

      <CartDrawer />
      <AuthModal />

      {/* Pillow-Soft Rounded Toast Notifications */}
      <div className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-5 md:bottom-5 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-[20px] border border-[#ebebeb] bg-[#ffffff] px-4 py-2.5 text-[#000000] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
          >
            <span className="h-2 w-2 shrink-0 rounded-full bg-[#5433eb]" />
            <span className="sl-body text-[13px]">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-1 text-[12px] text-[#787574] hover:text-[#000000] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export function App() {
  return (
    <BrowserRouter>
      <StoreProvider>
        <MultiPageRouter />
      </StoreProvider>
    </BrowserRouter>
  );
}

export default App;
