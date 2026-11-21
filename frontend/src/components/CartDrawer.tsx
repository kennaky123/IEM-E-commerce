import React, { useEffect, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { Coupon, Order, PaymentMethod, PriceQuote } from '../types';
import { formatVND } from '../utils/format';

export const CartDrawer: React.FC = () => {
  const {
    cartOpen,
    setCartOpen,
    cart,
    cartSubtotal,
    updateCartQty,
    removeFromCart,
    clearCart,
    user,
    token,
    refreshProducts,
    navigate,
    notify,
  } = useStore();

  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [activeCoupons, setActiveCoupons] = useState<Coupon[]>([]);
  const [quote, setQuote] = useState<PriceQuote | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('VNPAY');
  const [vnpayBankCode, setVnpayBankCode] = useState('NCB');
  const [vnpaySession, setVnpaySession] = useState<{
    order: Order;
    paymentUrl: string;
    bankCode: string;
  } | null>(null);
  const [processingVnpay, setProcessingVnpay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successOrderCode, setSuccessOrderCode] = useState<string | null>(null);

  useEffect(() => {
    if (user?.name && !fullName) setFullName(user.name);
    if (user?.email && !email) setEmail(user.email);
  }, [user, fullName, email]);

  // Fetch active coupons directly from MongoDB when cart drawer opens
  useEffect(() => {
    if (!cartOpen) return;
    api
      .getActiveCoupons()
      .then((res) => setActiveCoupons(res.coupons))
      .catch(() => setActiveCoupons([]));
  }, [cartOpen]);

  // Compute live subtotal, coupon discount & shipping fee via Backend PricingService
  useEffect(() => {
    if (!cartOpen) return;
    if (cart.length === 0) {
      setQuote(null);
      return;
    }

    let cancelled = false;
    api
      .previewOrderQuote(
        cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
        appliedCoupon || undefined
      )
      .then((res) => {
        if (!cancelled) setQuote(res.quote);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });

    return () => {
      cancelled = true;
    };
  }, [cartOpen, cart, appliedCoupon]);

  if (!cartOpen) return null;

  const displaySubtotal = quote?.subtotal ?? cartSubtotal;
  const discount = quote?.discount ?? 0;
  const shippingFee = quote?.shippingFee ?? 0;
  const finalTotal = quote?.total ?? cartSubtotal;

  const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) return;

    setValidatingCoupon(true);
    try {
      const res = await api.validateCoupon(cartSubtotal, code);
      setAppliedCoupon(res.coupon.code);
      notify(
        `Coupon applied · ${res.coupon.code} (-${formatVND(res.discount)})`,
        'success'
      );
    } catch (err) {
      setAppliedCoupon(null);
      notify(
        err instanceof Error ? err.message : 'Invalid or ineligible coupon',
        'error'
      );
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    setSubmitting(true);
    try {
      const res = await api.createOrder(
        {
          items: cart.map((i) => ({
            productId: i.product.id,
            quantity: i.quantity,
          })),
          shippingAddress: {
            fullName: fullName.trim() || user?.name || 'Customer',
            phone: phone.trim(),
            city: city.trim(),
            address: address.trim(),
          },
          paymentMethod,
          couponCode: appliedCoupon || undefined,
          customerEmail: user?.email || email.trim() || undefined,
        },
        token
      );
      if (paymentMethod === 'VNPAY') {
        const vnp = await api.createVnpayUrl(
          { orderId: res.order.id, bankCode: vnpayBankCode },
          token
        );
        clearCart();
        setAppliedCoupon(null);
        await refreshProducts();
        setVnpaySession({
          order: res.order,
          paymentUrl: vnp.paymentUrl,
          bankCode: vnpayBankCode,
        });
        notify(`Đã khởi tạo cổng VNPay · ${res.order.orderCode}`, 'info');
      } else {
        setSuccessOrderCode(res.order.orderCode);
        clearCart();
        setAppliedCoupon(null);
        await refreshProducts();
        notify(`Order dispatched · ${res.order.orderCode}`, 'success');
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Checkout failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVnpaySandboxResult = async (responseCode: '00' | '24') => {
    if (!vnpaySession) return;
    setProcessingVnpay(true);
    try {
      const res = await api.completeVnpaySandbox(
        {
          orderId: vnpaySession.order.id,
          bankCode: vnpaySession.bankCode,
          responseCode,
        },
        token
      );
      await refreshProducts();
      if (res.result.isSuccess) {
        setSuccessOrderCode(res.order.orderCode);
        setVnpaySession(null);
        notify(
          `Thanh toán VNPay thành công · #${res.result.transactionNo}`,
          'success'
        );
      } else {
        setVnpaySession(null);
        notify(res.result.message, 'error');
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'VNPay verification failed',
        'error'
      );
    } finally {
      setProcessingVnpay(false);
    }
  };

  const closeDrawer = () => {
    setSuccessOrderCode(null);
    setVnpaySession(null);
    setCartOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-[#000000]/45 backdrop-blur-[4px]"
      onClick={closeDrawer}
    >
      <div
        className="flex h-full w-full max-w-lg flex-col bg-[#ffffff] text-[#000000] shadow-[0_4px_24px_rgba(0,0,0,0.12)] sm:rounded-l-[28px] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#ebebeb] px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2.5">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <h2 className="text-[20px] leading-none tracking-[-0.05em] text-[#000000]">
              Shopping bag ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDrawer}
            className="rounded-full bg-[#f2f4f5] px-4 py-1.5 text-[12px] tracking-[-0.017em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {vnpaySession ? (
            <div className="rounded-[24px] bg-[#f2f4f5] p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-3 py-1 text-[11.5px] text-[#005baa] shadow-[0_2px_6px_rgba(0,0,0,0.05)]">
                  <span className="h-2 w-2 rounded-full bg-[#005baa]" />
                  <span>VNPay Gateway v2.1.0 · HMAC-SHA512</span>
                </span>
                <span className="rounded-full bg-[#5433eb]/10 px-2.5 py-0.5 text-[11px] text-[#5433eb]">
                  {vnpaySession.bankCode}
                </span>
              </div>

              <div>
                <div className="text-[12px] text-[#787574]">
                  Đơn hàng {vnpaySession.order.orderCode}
                </div>
                <div className="mt-1 text-[26px] leading-none tracking-[-0.05em] text-[#000000]">
                  {formatVND(vnpaySession.order.total)}
                </div>
              </div>

              <div className="rounded-[16px] bg-[#ffffff] p-3.5 text-[12px] text-[#787574] space-y-1.5 border border-[#ebebeb]">
                <div className="text-[#000000]">
                  URL thanh toán đã ký SHA-512:
                </div>
                <div className="break-all line-clamp-2 text-[11px] font-mono text-[#5433eb]">
                  {vnpaySession.paymentUrl}
                </div>
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={processingVnpay}
                  onClick={() => handleVnpaySandboxResult('00')}
                  className="w-full rounded-full bg-[#005baa] py-3 text-[13.5px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_20px_rgba(0,91,170,0.3)] hover:bg-[#004687] cursor-pointer transition-colors disabled:opacity-50"
                >
                  {processingVnpay
                    ? 'Đang xác thực chữ ký VNPay...'
                    : `Thanh toán ngay qua VNPay Sandbox (${vnpaySession.bankCode})`}
                </button>

                <a
                  href={vnpaySession.paymentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex w-full items-center justify-center rounded-full border border-[#ebebeb] bg-[#ffffff] py-2.5 text-[13px] text-[#000000] hover:border-[#005baa] hover:text-[#005baa] transition-colors"
                >
                  Mở trang cổng sandbox.vnpayment.vn ↗
                </a>

                <button
                  type="button"
                  disabled={processingVnpay}
                  onClick={() => handleVnpaySandboxResult('24')}
                  className="w-full rounded-full bg-[#ffffff] py-2 text-[12px] text-[#787574] hover:text-red-600 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Mô phỏng hủy giao dịch (Mã 24)
                </button>
              </div>
            </div>
          ) : successOrderCode ? (
            <div className="rounded-[24px] bg-[#f2f4f5] p-7 space-y-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                <span className="text-[12px] tracking-[-0.017em] text-[#5433eb]">
                  Order confirmed
                </span>
              </div>
              <div className="text-[24px] leading-none tracking-[-0.05em] text-[#000000]">
                Order {successOrderCode}
              </div>
              <p className="text-[14px] leading-[1.4] tracking-[-0.014em] text-[#787574]">
                Inventory has been allocated and verified. You can review live tracking status anytime in your Orders page.
              </p>
              <div className="flex flex-wrap gap-2.5 pt-2">
                {user && (
                  <button
                    type="button"
                    onClick={() => {
                      setSuccessOrderCode(null);
                      setCartOpen(false);
                      navigate('/orders');
                    }}
                    className="rounded-full bg-[#5433eb] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors"
                  >
                    View orders
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSuccessOrderCode(null);
                    setCartOpen(false);
                  }}
                  className="rounded-full bg-[#ffffff] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#ebebeb] cursor-pointer transition-colors"
                >
                  Continue shopping
                </button>
              </div>
            </div>
          ) : cart.length === 0 ? (
            <div className="rounded-[24px] bg-[#f2f4f5] p-10 text-center space-y-3">
              <div className="text-[16px] tracking-[-0.031em] text-[#000000]">
                Your bag is empty
              </div>
              <p className="text-[14px] leading-[1.4] tracking-[-0.014em] text-[#787574]">
                Explore MOONDROP in-ear monitors, balanced DAC/AMPs, or configure a custom Signal Chain.
              </p>
              <button
                type="button"
                onClick={() => {
                  setCartOpen(false);
                  navigate('/products');
                }}
                className="rounded-full bg-[#5433eb] px-6 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors mt-2"
              >
                Browse catalog
              </button>
            </div>
          ) : (
            <>
              {/* Items */}
              <div className="space-y-3">
                {cart.map(({ product, quantity }) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3.5 rounded-[20px] bg-[#f2f4f5] p-3.5"
                  >
                    <img
                      src={product.image}
                      alt={product.name}
                      onClick={() => {
                        setCartOpen(false);
                        navigate(`/product/${product.id}`);
                      }}
                      className="h-16 w-16 shrink-0 cursor-pointer rounded-[14px] bg-[#ffffff] p-1.5 object-contain shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] tracking-[-0.017em] text-[#787574]">
                        {product.category.replace('_', '/')} · {product.sku}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCartOpen(false);
                          navigate(`/product/${product.id}`);
                        }}
                        className="block w-full text-left truncate mt-0.5 text-[14px] tracking-[-0.014em] text-[#000000] hover:text-[#5433eb] cursor-pointer"
                      >
                        {product.name}
                      </button>
                      <div className="text-[14px] tracking-[-0.014em] mt-1 text-[#000000]">
                        {formatVND(product.price)}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1 rounded-full bg-[#ffffff] px-1.5 py-1 shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                        <button
                          type="button"
                          onClick={() => updateCartQty(product.id, quantity - 1)}
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[13px] text-[#000000] cursor-pointer hover:bg-[#f2f4f5]"
                        >
                          -
                        </button>
                        <span className="text-[12px] w-5 text-center text-[#000000]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(product.id, quantity + 1)}
                          className="h-6 w-6 rounded-full flex items-center justify-center text-[13px] text-[#000000] cursor-pointer hover:bg-[#f2f4f5]"
                        >
                          +
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(product.id)}
                        className="text-[11px] tracking-[-0.017em] text-[#787574] hover:text-[#000000] cursor-pointer pr-1"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dynamic MongoDB Coupons */}
              <div className="rounded-[20px] bg-[#f2f4f5] p-4 space-y-2.5">
                <div className="text-[12px] tracking-[-0.017em] text-[#787574] px-1 flex flex-wrap items-center gap-1.5">
                  <span>Promo code</span>
                  {activeCoupons.length > 0 && (
                    <>
                      <span>·</span>
                      {activeCoupons.map((c) => (
                        <button
                          key={c.code}
                          type="button"
                          onClick={() => setCouponInput(c.code)}
                          title={c.description}
                          className="rounded-full bg-[#ffffff] px-2.5 py-0.5 text-[11px] text-[#5433eb] hover:bg-[#5433eb] hover:text-[#ffffff] transition-colors cursor-pointer"
                        >
                          {c.code} (
                          {c.type === 'PERCENTAGE'
                            ? `-${c.value}%`
                            : `-${formatVND(c.value)}`}
                          )
                        </button>
                      ))}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value)}
                    placeholder="Enter promo code"
                    className="flex-1 rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:border-[#5433eb] focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={validatingCoupon}
                    onClick={handleApplyCoupon}
                    className="rounded-full bg-[#000000] px-5 py-2 text-[12px] tracking-[-0.017em] text-[#ffffff] hover:bg-[#5433eb] cursor-pointer transition-colors disabled:opacity-50"
                  >
                    {validatingCoupon ? 'Checking...' : 'Apply'}
                  </button>
                </div>
              </div>

              {/* Shipping Form */}
              <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3.5 pt-1">
                <div className="text-[14px] tracking-[-0.014em] text-[#000000] border-b border-[#ebebeb] pb-2">
                  Shipping &amp; payment
                </div>

                {!user && (
                  <div>
                    <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1 px-1">
                      Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your-email@example.com"
                      className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/50 px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                    />
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1 px-1">
                      Full name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Họ và tên người nhận"
                      className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/50 px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1 px-1">
                      Phone
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Số điện thoại liên hệ"
                      className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/50 px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-1">
                    <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1 px-1">
                      City
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Tỉnh / TP"
                      className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/50 px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1 px-1">
                      Address
                    </label>
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Số nhà, tên đường, phường/xã"
                      className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/50 px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <label className="block text-[12px] tracking-[-0.017em] text-[#787574] px-1">
                    Payment method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: 'VNPAY', label: 'VNPay' },
                        { id: 'VIETQR', label: 'VietQR' },
                        { id: 'COD', label: 'COD' },
                        { id: 'CARD', label: 'Card' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPaymentMethod(m.id)}
                        className={`rounded-full py-2.5 px-3 text-[12px] tracking-[-0.017em] cursor-pointer transition-colors ${
                          paymentMethod === m.id
                            ? m.id === 'VNPAY'
                              ? 'bg-[#005baa] text-[#ffffff]'
                              : 'bg-[#000000] text-[#ffffff]'
                            : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>

                  {paymentMethod === 'VNPAY' && (
                    <div className="rounded-[18px] bg-[#f2f4f5] p-3.5 space-y-2">
                      <div className="text-[11.5px] text-[#787574]">
                        Chọn ngân hàng / kênh thanh toán VNPay:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { code: 'NCB', label: 'NCB (Sandbox)' },
                          { code: 'VNPAYQR', label: 'VNPAY QR' },
                          { code: 'VIETCOMBANK', label: 'Vietcombank' },
                          { code: 'TECHCOMBANK', label: 'Techcombank' },
                          { code: 'VISA', label: 'Visa / Master' },
                        ].map((bank) => (
                          <button
                            key={bank.code}
                            type="button"
                            onClick={() => setVnpayBankCode(bank.code)}
                            className={`rounded-full px-3 py-1 text-[11px] cursor-pointer transition-colors ${
                              vnpayBankCode === bank.code
                                ? 'bg-[#005baa] text-[#ffffff]'
                                : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb]'
                            }`}
                          >
                            {bank.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </>
          )}
        </div>

        {/* Sticky Footer */}
        {cart.length > 0 && !successOrderCode && !vnpaySession && (
          <div className="border-t border-[#ebebeb] bg-[#ffffff] p-4 sm:p-6 space-y-2">
            <div className="flex justify-between text-[14px] tracking-[-0.014em] text-[#787574]">
              <span>Subtotal</span>
              <span className="text-[#000000]">{formatVND(displaySubtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-[14px] tracking-[-0.014em] text-[#5433eb]">
                <span>Promo ({quote?.couponCode || appliedCoupon})</span>
                <span>-{formatVND(discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[14px] tracking-[-0.014em] text-[#787574]">
              <span>Insured courier</span>
              <span className="text-[#000000]">
                {shippingFee === 0 ? 'Free' : formatVND(shippingFee)}
              </span>
            </div>
            <div className="flex justify-between border-t border-[#ebebeb] pt-3 text-[18px] tracking-[-0.05em] text-[#000000]">
              <span>Total</span>
              <span>{formatVND(finalTotal)}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={submitting}
              className="w-full mt-3 rounded-full bg-[#5433eb] py-3.5 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-50"
            >
              {submitting ? 'Processing...' : `Place order · ${formatVND(finalTotal)}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
