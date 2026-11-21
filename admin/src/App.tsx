import React, { useCallback, useEffect, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { AdminLogin } from './components/auth/AdminLogin';
import { OverviewView } from './components/dashboard/OverviewView';
import { Header } from './components/layout/Header';
import { AdminTab, Sidebar } from './components/layout/Sidebar';
import { MediaView } from './components/media/MediaView';
import { OrdersView } from './components/orders/OrdersView';
import { ProductModal } from './components/products/ProductModal';
import { ProductsView } from './components/products/ProductsView';
import { UsersView } from './components/users/UsersView';
import { AdminAuthProvider, useAdminAuth } from './context/AdminAuthContext';
import { adminApi } from './services/api';
import { DashboardStats, MediaImageItem, Order, OrderStatus, Product, User } from './types';

const VALID_TABS: ReadonlySet<AdminTab> = new Set([
  'overview',
  'products',
  'orders',
  'media',
  'users',
  'system',
]);

const AdminAppContent: React.FC = () => {
  const { user, token, isLoading, toasts, dismissToast, notify } = useAdminAuth();

  const location = useLocation();
  const routerNavigate = useNavigate();
  const pathSegment = location.pathname.replace(/^\/+|\/+$/g, '') as AdminTab;
  const currentTab: AdminTab = VALID_TABS.has(pathSegment)
    ? pathSegment
    : 'overview';
  const setCurrentTab = useCallback(
    (tab: AdminTab) => {
      routerNavigate(`/${tab}`);
    },
    [routerNavigate]
  );

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [mediaImages, setMediaImages] = useState<MediaImageItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [health, setHealth] = useState<{
    status: string;
    dbMode: string;
    productCount: number;
    timestamp: string;
  } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const loadData = useCallback(async () => {
    if (!token || user?.role !== 'admin') return;
    try {
      const [statsRes, prodsRes, ordersRes, mediaRes, usersRes, healthRes] = await Promise.all([
        adminApi.getStats().catch(() => null),
        adminApi.getProducts().catch(() => []),
        adminApi.getOrders().catch(() => []),
        adminApi.getMediaLibrary().catch(() => []),
        adminApi.getUsers().catch(() => []),
        adminApi.getHealth().catch(() => null),
      ]);

      if (statsRes) setStats(statsRes);
      setProducts(prodsRes);
      setOrders(ordersRes);
      setMediaImages(mediaRes);
      setUsers(usersRes);
      if (healthRes) setHealth(healthRes);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi nạp dữ liệu Admin', 'error');
    }
  }, [token, user, notify]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleToggleSidebar = () => {
    if (window.innerWidth >= 1024) {
      setSidebarCollapsed((prev) => !prev);
    } else {
      setSidebarOpen((prev) => !prev);
    }
  };

  const handleGlobalSearchChange = (q: string) => {
    setGlobalSearch(q);
    if (q.trim() && currentTab === 'overview') {
      setCurrentTab('products');
    }
  };

  const handleSaveProduct = async (data: Partial<Product>) => {
    try {
      if (productToEdit && productToEdit.id) {
        await adminApi.updateProduct(productToEdit.id, data);
        notify('Cập nhật sản phẩm thành công', 'success');
      } else {
        await adminApi.createProduct(data);
        notify('Tạo mới sản phẩm thành công', 'success');
      }
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Thao tác sản phẩm thất bại', 'error');
      throw err;
    }
  };

  const handleDeleteProduct = async (id: string) => {
    try {
      await adminApi.deleteProduct(id);
      notify('Đã xóa sản phẩm khỏi kho', 'success');
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Xóa sản phẩm thất bại', 'error');
    }
  };

  const handleQuickUpdateStock = async (p: Product, newStock: number) => {
    try {
      await adminApi.updateProduct(p.id, { stock: newStock });
      notify(`Đã cập nhật kho ${p.sku}: ${newStock}`, 'success');
      setProducts((prev) =>
        prev.map((item) => (item.id === p.id ? { ...item, stock: newStock } : item))
      );
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi cập nhật kho', 'error');
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: OrderStatus) => {
    try {
      await adminApi.updateOrderStatus(orderId, status);
      notify(`Đơn hàng chuyển sang trạng thái ${status}`, 'success');
      await loadData();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Lỗi cập nhật đơn hàng', 'error');
    }
  };

  const handleUploadMedia = async (filename: string, dataUrl: string) => {
    await adminApi.uploadMedia(filename, dataUrl);
    await loadData();
  };

  const handleToggleRole = async (u: User) => {
    const nextRole = u.role === 'admin' ? 'customer' : 'admin';
    await adminApi.updateUserRole(u.id, nextRole);
    notify(`Đã chuyển vai trò sang ${nextRole}`, 'success');
    await loadData();
  };

  const openCreateModal = (preset?: Product | null) => {
    setProductToEdit(preset || null);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f2f4f5] text-[#000000]">
        <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] px-8 py-6 text-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)] space-y-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#5433eb] border-t-transparent mx-auto" />
          <p className="text-[13px] text-[#787574]">Đang kết nối cổng quản trị TailAdmin...</p>
        </div>
      </div>
    );
  }

  if (!token || !user || user.role !== 'admin') {
    return (
      <>
        <AdminLogin />
        <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 rounded-full border border-[#ebebeb] bg-[#ffffff] px-5 py-3 text-[#000000] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
            >
              <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5433eb]" />
              <span className="text-[13px] tracking-[-0.014em]">{toast.text}</span>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="ml-2 text-[12px] text-[#787574] hover:text-[#000000] cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </>
    );
  }

  const lowStockCount = products.filter((p) => p.stock <= 8).length;
  const pendingOrdersCount = orders.filter((o) => o.status === 'PENDING').length;

  return (
    <div className="flex h-screen overflow-hidden bg-[#f2f4f5] text-[#000000]">
      {/* 1. TailAdmin Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        lowStockCount={lowStockCount}
        pendingOrdersCount={pendingOrdersCount}
        dbMode={health?.dbMode || 'mongodb'}
        onQuickCreateProduct={() => openCreateModal(null)}
      />

      {/* 2. TailAdmin Main Content Wrapper */}
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header
          onToggleSidebar={handleToggleSidebar}
          onNavigateTab={setCurrentTab}
          lowStockCount={lowStockCount}
          pendingOrdersCount={pendingOrdersCount}
          globalSearch={globalSearch}
          onGlobalSearchChange={handleGlobalSearchChange}
          onQuickCreateProduct={() => openCreateModal(null)}
        />

        <main className="flex-1 p-4 md:p-6 2xl:p-8">
          <div className="mx-auto max-w-screen-2xl">
            <Routes>
              <Route path="/" element={<Navigate to="/overview" replace />} />
              <Route
                path="/overview"
                element={
                  <OverviewView
                    stats={stats}
                    products={products}
                    orders={orders}
                    onNavigateTab={setCurrentTab}
                    onOpenProductModal={(p) => openCreateModal(p)}
                  />
                }
              />
              <Route
                path="/products"
                element={
                  <ProductsView
                    products={products}
                    externalSearch={globalSearch}
                    onOpenModal={(p) => openCreateModal(p)}
                    onDeleteProduct={handleDeleteProduct}
                    onQuickUpdateStock={handleQuickUpdateStock}
                    onBackDashboard={() => setCurrentTab('overview')}
                  />
                }
              />
              <Route
                path="/orders"
                element={
                  <OrdersView
                    orders={orders}
                    onUpdateStatus={handleUpdateOrderStatus}
                    onBackDashboard={() => setCurrentTab('overview')}
                  />
                }
              />
              <Route
                path="/media"
                element={
                  <MediaView
                    mediaImages={mediaImages}
                    products={products}
                    onUploadMedia={handleUploadMedia}
                    onSelectImageForNewProduct={(imgUrl) => {
                      openCreateModal({
                        id: '',
                        sku: `MD-NEW-${Math.floor(100 + Math.random() * 900)}`,
                        name: '',
                        brand: 'MOONDROP',
                        category: 'IEM',
                        price: 3990000,
                        stock: 15,
                        image: imgUrl,
                        summary: '',
                        specs: {},
                      });
                    }}
                    notify={notify}
                    onBackDashboard={() => setCurrentTab('overview')}
                  />
                }
              />
              <Route
                path="/users"
                element={
                  <UsersView
                    users={users}
                    onToggleRole={handleToggleRole}
                    health={health}
                    activeSection="users"
                    onBackDashboard={() => setCurrentTab('overview')}
                    onRefreshHealth={async () => {
                      const h = await adminApi.getHealth();
                      setHealth(h);
                      notify('Đã cập nhật trạng thái MongoDB Atlas', 'success');
                    }}
                  />
                }
              />
              <Route
                path="/system"
                element={
                  <UsersView
                    users={users}
                    onToggleRole={handleToggleRole}
                    health={health}
                    activeSection="system"
                    onBackDashboard={() => setCurrentTab('overview')}
                    onRefreshHealth={async () => {
                      const h = await adminApi.getHealth();
                      setHealth(h);
                      notify('Đã cập nhật trạng thái MongoDB Atlas', 'success');
                    }}
                  />
                }
              />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Routes>
          </div>
        </main>
      </div>

      {/* Product CRUD Modal */}
      <ProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setProductToEdit(null);
        }}
        productToEdit={productToEdit}
        onSave={handleSaveProduct}
        mediaImages={mediaImages}
      />

      {/* Shop-Styled Toast Notifications */}
      <div className="fixed bottom-5 right-5 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-center gap-3 rounded-full border border-[#ebebeb] bg-[#ffffff] px-5 py-3 text-[#000000] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#5433eb]" />
            <span className="text-[13px] tracking-[-0.014em]">{toast.text}</span>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className="ml-2 text-[12px] text-[#787574] hover:text-[#000000] cursor-pointer"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AdminAuthProvider>
        <AdminAppContent />
      </AdminAuthProvider>
    </BrowserRouter>
  );
};

export default App;
