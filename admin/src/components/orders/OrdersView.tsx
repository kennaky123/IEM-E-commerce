import React, { useEffect, useState } from 'react';
import { ChevronRight, Eye, MapPin, Search, X } from 'lucide-react';
import { adminApi } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { formatDate, formatVND, ORDER_STATUS_CONFIG } from '../../utils/format';

interface OrdersViewProps {
  orders: Order[];
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onBackDashboard?: () => void;
}

const STATUS_TABS: Array<{ id: OrderStatus | 'ALL'; label: string }> = [
  { id: 'ALL', label: 'All' },
  { id: 'PENDING', label: 'Pending' },
  { id: 'CONFIRMED', label: 'Confirmed' },
  { id: 'SHIPPED', label: 'Shipped' },
  { id: 'DELIVERED', label: 'Delivered' },
  { id: 'CANCELLED', label: 'Cancelled' },
];

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onUpdateStatus,
  onBackDashboard,
}) => {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbOrders, setDbOrders] = useState<Order[]>(orders);
  const [isSearchingDb, setIsSearchingDb] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Live MongoDB query for admin orders search & status filtering
  useEffect(() => {
    let cancelled = false;
    setIsSearchingDb(true);

    const timer = setTimeout(() => {
      adminApi
        .getOrders({
          search: searchQuery.trim() || undefined,
          status: statusFilter,
        })
        .then((items) => {
          if (!cancelled) {
            setDbOrders(items);
            setIsSearchingDb(false);
          }
        })
        .catch(() => {
          if (!cancelled) setIsSearchingDb(false);
        });
    }, 240);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, statusFilter, orders]);

  const filteredOrders = dbOrders;

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: nextStatus });
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* TailAdmin Page Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] leading-none tracking-[-0.04em] text-[#000000]">
          Orders &amp; Dispatch
        </h2>
        <nav className="flex items-center gap-1.5 text-[13px] text-[#787574]">
          <button
            type="button"
            onClick={onBackDashboard}
            className="hover:text-[#000000] cursor-pointer"
          >
            Dashboard
          </button>
          <ChevronRight size={14} />
          <span className="text-[#5433eb]">Orders</span>
        </nav>
      </div>

      {/* TailAdmin Filter Bar */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-4 top-3 text-[#787574]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm mã đơn, tên khách hàng, số điện thoại..."
              className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5] py-2.5 pl-11 pr-10 text-[13.5px] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors"
            />
            {isSearchingDb && (
              <span className="absolute right-3.5 top-3 h-4 w-4 border-2 border-[#5433eb] border-t-transparent rounded-full animate-spin pointer-events-none" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 rounded-full bg-[#f2f4f5] p-1">
            {STATUS_TABS.map((tab) => {
              const active = statusFilter === tab.id;
              const count =
                tab.id === 'ALL'
                  ? orders.length
                  : orders.filter((o) => o.status === tab.id).length;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilter(tab.id)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-all ${
                    active
                      ? 'bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                      : 'text-[#787574] hover:text-[#000000]'
                  }`}
                >
                  {tab.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* TailAdmin Orders Data Table */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#ebebeb] text-[12px] tracking-[-0.017em] text-[#787574]">
                <th className="pb-3.5 pr-4">Order Code</th>
                <th className="pb-3.5 px-4">Customer &amp; Address</th>
                <th className="pb-3.5 px-4">Items</th>
                <th className="pb-3.5 px-4">Date</th>
                <th className="pb-3.5 px-4 text-right">Total</th>
                <th className="pb-3.5 px-4 text-center">Status</th>
                <th className="pb-3.5 pl-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#787574]">
                    Không có đơn hàng nào khớp với điều kiện tìm kiếm.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const cfg = ORDER_STATUS_CONFIG[order.status] || {
                    label: order.status,
                    bg: 'bg-[#f2f4f5]',
                    text: 'text-[#000000]',
                    border: 'border-[#ebebeb]',
                    dot: 'bg-[#5433eb]',
                  };
                  const codeLabel =
                    order.orderCode || `#${order.id.slice(-8).toUpperCase()}`;
                  const totalQty = order.items.reduce((s, it) => s + it.quantity, 0);
                  const streetAddr =
                    order.shippingAddress?.address || order.shippingAddress?.street || '';

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#f2f4f5]/60 transition-colors"
                    >
                      <td className="py-3.5 pr-4">
                        <button
                          type="button"
                          onClick={() => setSelectedOrder(order)}
                          className="text-[13.5px] tracking-[-0.02em] text-[#5433eb] hover:underline cursor-pointer"
                        >
                          {codeLabel}
                        </button>
                      </td>

                      <td className="py-3.5 px-4">
                        <p className="text-[13.5px] text-[#000000]">
                          {order.shippingAddress?.fullName || order.customerName || 'Khách hàng'}
                        </p>
                        <p className="text-[11.5px] text-[#787574] truncate max-w-[220px]">
                          {order.shippingAddress?.phone} · {streetAddr},{' '}
                          {order.shippingAddress?.city}
                        </p>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          {order.items[0]?.image && (
                            <img
                              src={order.items[0].image}
                              alt=""
                              className="h-9 w-9 shrink-0 rounded-[12px] bg-[#f2f4f5] p-0.5 object-contain"
                            />
                          )}
                          <span className="rounded-full bg-[#f2f4f5] px-2.5 py-0.5 text-[11px] text-[#000000]">
                            {totalQty} món
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[12px] text-[#787574]">
                        {formatDate(order.createdAt)}
                      </td>

                      <td className="py-3.5 px-4 text-right text-[14px] text-[#000000]">
                        {formatVND(order.total)}
                        {order.discount > 0 && (
                          <span className="block text-[11px] text-[#5433eb]">
                            -{formatVND(order.discount)}
                          </span>
                        )}
                        <span className="mt-0.5 block text-[10.5px] text-[#787574]">
                          {order.paymentMethod || 'COD'}
                          {order.paymentStatus === 'PAID'
                            ? ` · PAID${order.vnpayTransactionNo ? ` (#${order.vnpayTransactionNo})` : ''}`
                            : order.paymentMethod === 'VNPAY'
                              ? ` · ${order.paymentStatus || 'UNPAID'}`
                              : ''}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${cfg.bg} ${cfg.text} ${cfg.border}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      <td className="py-3.5 pl-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="flex h-8 w-8 items-center justify-center rounded-full border border-[#ebebeb] bg-[#ffffff] text-[#787574] hover:text-[#5433eb] cursor-pointer"
                            title="Xem chi tiết"
                          >
                            <Eye size={14} />
                          </button>
                          <select
                            value={order.status}
                            disabled={updatingId === order.id}
                            onChange={(e) =>
                              handleStatusChange(order.id, e.target.value as OrderStatus)
                            }
                            className="rounded-full border border-[#ebebeb] bg-[#f2f4f5] px-3 py-1 text-[11.5px] text-[#000000] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none cursor-pointer"
                          >
                            <option value="PENDING">Pending</option>
                            <option value="CONFIRMED">Confirmed</option>
                            <option value="SHIPPED">Shipped</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="CANCELLED">Cancelled</option>
                          </select>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/45 backdrop-blur-[4px] p-4"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-8 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-[28px] border border-[#ebebeb] bg-[#ffffff] shadow-[0_12px_32px_rgba(0,0,0,0.12)] overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-[#ebebeb] px-6 py-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-0.5 text-[11.5px] text-[#787574]">
                  <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                  <span>{formatDate(selectedOrder.createdAt)}</span>
                </span>
                <h3 className="mt-2 text-[22px] leading-none tracking-[-0.05em] text-[#000000]">
                  Đơn hàng {selectedOrder.orderCode || `#${selectedOrder.id.slice(-8).toUpperCase()}`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] text-[#000000] hover:bg-[#ebebeb] cursor-pointer inline-flex items-center gap-1"
              >
                <X size={14} />
                <span>Close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="rounded-[20px] bg-[#f2f4f5] p-4 space-y-2">
                <div className="flex items-center gap-2 text-[13px] text-[#000000]">
                  <MapPin size={15} className="text-[#5433eb]" />
                  <span>Thông tin giao nhận hàng</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px]">
                  <div>
                    <span className="text-[#787574]">Người nhận: </span>
                    <span className="text-[#000000]">{selectedOrder.shippingAddress?.fullName}</span>
                  </div>
                  <div>
                    <span className="text-[#787574]">Điện thoại: </span>
                    <span className="text-[#000000]">{selectedOrder.shippingAddress?.phone}</span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-[#787574]">Địa chỉ: </span>
                    <span className="text-[#000000]">
                      {selectedOrder.shippingAddress?.address || selectedOrder.shippingAddress?.street},{' '}
                      {selectedOrder.shippingAddress?.city}
                    </span>
                  </div>
                  {selectedOrder.shippingAddress?.note && (
                    <div className="sm:col-span-2 text-[12px] text-[#5433eb]">
                      Ghi chú: {selectedOrder.shippingAddress.note}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                {selectedOrder.items.map((it, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f2f4f5] p-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {it.image && (
                        <img
                          src={it.image}
                          alt={it.name}
                          className="h-12 w-12 shrink-0 rounded-[12px] bg-[#ffffff] p-1 object-contain"
                        />
                      )}
                      <div className="min-w-0">
                        <p className="truncate text-[14px] text-[#000000]">{it.name}</p>
                        <p className="text-[12px] text-[#787574]">
                          {formatVND(it.price)} × {it.quantity}
                        </p>
                      </div>
                    </div>
                    <span className="text-[14px] text-[#000000] shrink-0">
                      {formatVND(it.price * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5 border-t border-[#ebebeb] pt-4 text-[13px]">
                <div className="flex justify-between text-[#787574]">
                  <span>Tạm tính</span>
                  <span>{formatVND(selectedOrder.subtotal)}</span>
                </div>
                {selectedOrder.discount > 0 && (
                  <div className="flex justify-between text-[#5433eb]">
                    <span>
                      Mã giảm ({selectedOrder.couponCode || selectedOrder.promoCode || 'Voucher'})
                    </span>
                    <span>-{formatVND(selectedOrder.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 text-[18px] tracking-[-0.04em] text-[#000000]">
                  <span>Tổng thanh toán</span>
                  <span className="text-[#5433eb]">{formatVND(selectedOrder.total)}</span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-[12px] text-[#787574]">
                  <span>
                    Thanh toán: <strong className="text-[#000000]">{selectedOrder.paymentMethod || 'COD'}</strong>
                    {selectedOrder.vnpayBankCode ? ` (${selectedOrder.vnpayBankCode})` : ''}
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] ${
                      selectedOrder.paymentStatus === 'PAID'
                        ? 'bg-emerald-100 text-emerald-700'
                        : selectedOrder.paymentStatus === 'FAILED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-[#f2f4f5] text-[#787574]'
                    }`}
                  >
                    {selectedOrder.paymentStatus === 'PAID'
                      ? `✓ Đã thanh toán${selectedOrder.vnpayTransactionNo ? ` · #${selectedOrder.vnpayTransactionNo}` : ''}`
                      : selectedOrder.paymentStatus || 'UNPAID'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-[#ebebeb] px-6 py-4">
              <select
                value={selectedOrder.status}
                disabled={updatingId === selectedOrder.id}
                onChange={(e) =>
                  handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)
                }
                className="rounded-full border border-[#ebebeb] bg-[#f2f4f5] px-4 py-2 text-[13px] text-[#000000] focus:border-[#5433eb] focus:outline-none cursor-pointer"
              >
                <option value="PENDING">Pending</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="SHIPPED">Shipped</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="sl-btn-dark text-[13px]"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
