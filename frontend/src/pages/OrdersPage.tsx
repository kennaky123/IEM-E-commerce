import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { Order } from '../types';
import { formatVND } from '../utils/format';

export const OrdersPage: React.FC = () => {
  const { token, user, setAuthModalOpen, navigate, notify } = useStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [payingOrderId, setPayingOrderId] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await api.getMyOrders(token);
      setOrders(res.orders);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const hasSecureHash = sp.has('vnp_SecureHash');
    const vnpStatus = sp.get('vnpay_status');

    if (hasSecureHash) {
      api
        .verifyVnpayReturn(window.location.search.slice(1))
        .then((res) => {
          notify(
            res.result.message,
            res.result.isSuccess ? 'success' : 'error'
          );
          loadOrders();
        })
        .catch((err) => {
          notify(
            err instanceof Error ? err.message : 'Xác thực VNPay thất bại',
            'error'
          );
        })
        .finally(() => {
          window.history.replaceState({}, '', window.location.pathname || '/orders');
        });
      return;
    }

    if (vnpStatus) {
      notify(
        vnpStatus === 'success'
          ? 'Thanh toán VNPay thành công! Đơn hàng đã được xác nhận.'
          : 'Giao dịch VNPay chưa hoàn tất hoặc đã bị hủy.',
        vnpStatus === 'success' ? 'success' : 'error'
      );
      window.history.replaceState({}, '', window.location.pathname || '/orders');
    }
  }, [notify, loadOrders]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handlePayWithVnpay = async (order: Order) => {
    setPayingOrderId(order.id);
    try {
      const res = await api.completeVnpaySandbox(
        {
          orderId: order.id,
          bankCode: order.vnpayBankCode || 'NCB',
          responseCode: '00',
        },
        token
      );
      setOrders((prev) =>
        prev.map((item) => (item.id === order.id ? res.order : item))
      );
      notify(
        `Thanh toán VNPay thành công · #${res.result.transactionNo}`,
        'success'
      );
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Thanh toán VNPay thất bại',
        'error'
      );
    } finally {
      setPayingOrderId(null);
    }
  };

  if (!user || !token) {
    return (
      <section className="bg-[#f2f4f5] text-[#000000] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-xl shop-card rounded-[28px] bg-[#ffffff] p-10 text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] tracking-[-0.017em] text-[#787574]">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <span>Authentication required</span>
          </span>
          <h1 className="text-[28px] leading-tight tracking-[-0.05em] text-[#000000]">
            Sign in to view your order history
          </h1>
          <p className="text-[14px] tracking-[-0.014em] text-[#787574]">
            Access tracking codes, courier details, and order receipts for your account.
          </p>
          <button
            type="button"
            onClick={() => setAuthModalOpen(true)}
            className="rounded-full bg-[#5433eb] px-6 py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors mt-2"
          >
            Sign in or demo access
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="w-full bg-[#f2f4f5] text-[#000000] pb-20">
      <section className="px-3 sm:px-4 pt-6 sm:pt-8 pb-6 md:px-8">
        <div className="mx-auto max-w-[1200px] space-y-5 sm:space-y-6">
          {/* Header Card */}
          <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                <span>Customer ledger · {user.email}</span>
              </span>
              <h1 className="mt-3 text-[26px] sm:text-[46px] leading-none tracking-[-0.05em] text-[#000000]">
                My orders ({orders.length})
              </h1>
            </div>
            <button
              type="button"
              onClick={loadOrders}
              className="rounded-full bg-[#000000] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] hover:bg-[#5433eb] cursor-pointer transition-colors"
            >
              Refresh ledger
            </button>
          </div>

          {loading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className="h-44 rounded-[28px] bg-[#ffffff] animate-pulse shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]"
                />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="shop-card rounded-[28px] bg-[#ffffff] p-12 text-center space-y-4">
              <p className="text-[20px] tracking-[-0.05em] text-[#000000]">
                No orders recorded for {user.email}
              </p>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="rounded-full bg-[#5433eb] px-6 py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors"
              >
                Explore catalog
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {orders.map((order) => (
                <div
                  key={order.id}
                  className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] pb-4">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className="text-[18px] sm:text-[20px] tracking-[-0.05em] text-[#000000]">
                        {order.orderCode}
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#000000]">
                        <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                        <span>{order.status}</span>
                      </span>
                      {order.paymentStatus === 'PAID' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] text-emerald-700">
                          ✓ Đã thanh toán{' '}
                          {order.paymentMethod === 'VNPAY'
                            ? 'VNPay'
                            : order.paymentMethod}
                          {order.vnpayTransactionNo
                            ? ` · #${order.vnpayTransactionNo}`
                            : ''}
                        </span>
                      ) : order.paymentMethod === 'VNPAY' ? (
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] ${
                            order.paymentStatus === 'FAILED'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.paymentStatus === 'FAILED'
                            ? 'VNPay thất bại'
                            : 'Chờ thanh toán VNPay'}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-[12px] tracking-[-0.017em] text-[#787574]">
                      {new Date(order.createdAt).toLocaleString('vi-VN')} ·{' '}
                      {order.paymentMethod}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {order.items.map((item) => (
                      <div
                        key={`${order.id}-${item.productId}`}
                        className="flex items-center justify-between gap-3 sm:gap-4 rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-3 sm:p-3.5"
                      >
                        <div className="flex items-center gap-3.5 min-w-0">
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-14 w-14 shrink-0 rounded-[12px] bg-[#ffffff] p-1 object-contain shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                          />
                          <div className="min-w-0">
                            <div className="text-[14px] tracking-[-0.014em] text-[#000000] truncate">
                              {item.name}
                            </div>
                            <div className="text-[12px] tracking-[-0.017em] text-[#787574] mt-0.5">
                              {item.sku} · Qty {item.quantity}
                            </div>
                          </div>
                        </div>
                        <span className="text-[14px] tracking-[-0.014em] text-[#000000] shrink-0">
                          {formatVND(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#ebebeb] pt-4">
                    <span className="text-[13px] tracking-[-0.014em] text-[#787574]">
                      {order.shippingAddress.fullName} — {order.shippingAddress.address},{' '}
                      {order.shippingAddress.city}
                    </span>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      {order.paymentMethod === 'VNPAY' &&
                        order.paymentStatus !== 'PAID' &&
                        order.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            disabled={payingOrderId === order.id}
                            onClick={() => handlePayWithVnpay(order)}
                            className="rounded-full bg-[#005baa] px-4 py-2 text-[12px] text-[#ffffff] hover:bg-[#004687] cursor-pointer transition-colors disabled:opacity-50"
                          >
                            {payingOrderId === order.id
                              ? 'Đang xử lý...'
                              : 'Thanh toán VNPay ngay'}
                          </button>
                        )}
                      {order.discount > 0 && (
                        <span className="text-[12px] tracking-[-0.017em] text-[#5433eb]">
                          {order.couponCode}: -{formatVND(order.discount)}
                        </span>
                      )}
                      <span className="text-[20px] tracking-[-0.05em] text-[#000000]">
                        {formatVND(order.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
