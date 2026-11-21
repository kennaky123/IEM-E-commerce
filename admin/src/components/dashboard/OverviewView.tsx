import React, { useMemo, useState } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  Boxes,
  MoreVertical,
  Package,
  SlidersHorizontal,
} from 'lucide-react';
import { DashboardStats, MonthlySalesPoint, Order, Product } from '../../types';
import { CATEGORY_LABELS, formatVND, ORDER_STATUS_CONFIG } from '../../utils/format';
import { AdminTab } from '../layout/Sidebar';

interface OverviewViewProps {
  stats: DashboardStats | null;
  products: Product[];
  orders: Order[];
  onNavigateTab: (tab: AdminTab) => void;
  onOpenProductModal: (p?: Product) => void;
}

const MONTH_SHORT_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function buildSmoothAreaPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return 'M 40,210 L 680,210';
  if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
  return points
    .map((pt, idx) => (idx === 0 ? `M ${pt.x},${pt.y}` : `L ${pt.x},${pt.y}`))
    .join(' ');
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  stats,
  products,
  orders,
  onNavigateTab,
  onOpenProductModal,
}) => {
  const [statRange, setStatRange] = useState<'Monthly' | 'Quarterly' | 'Annually'>('Monthly');
  const [orderFilterOnlyPending, setOrderFilterOnlyPending] = useState(false);

  const totalRevenue =
    stats?.totalRevenue ??
    orders.reduce((sum, o) => (o.status !== 'CANCELLED' ? sum + o.total : sum), 0);
  const totalOrdersCount = stats?.totalOrders ?? orders.length;
  const pendingCount =
    stats?.pendingOrders ?? orders.filter((o) => o.status === 'PENDING').length;
  const lowStockThreshold = stats?.lowStockThreshold ?? 8;
  const lowStockItems = products.filter((p) => p.stock <= lowStockThreshold);

  const inStockRate =
    products.length > 0
      ? Math.round(
          (products.filter((p) => p.stock > 0).length / products.length) * 100
        )
      : 0;

  const monthlyTargetAmount =
    stats?.monthlyTarget ??
    Math.max(
      50_000_000,
      Math.ceil((totalRevenue * 1.25) / 10_000_000) * 10_000_000
    );
  const targetRatio =
    monthlyTargetAmount > 0
      ? Math.min(100, (totalRevenue / monthlyTargetAmount) * 100)
      : 0;
  const gaugeDashTotal = 251.2;
  const gaugeProgress = (targetRatio / 100) * gaugeDashTotal;

  const monthlySeries: MonthlySalesPoint[] = useMemo(() => {
    if (stats?.monthlySales && stats.monthlySales.length > 0) {
      return stats.monthlySales;
    }
    return MONTH_SHORT_NAMES.map((m, idx) => ({
      month: m,
      monthIndex: idx + 1,
      revenue: 0,
      orders: 0,
    }));
  }, [stats?.monthlySales]);

  const maxMonthlyRevenue = Math.max(
    1,
    ...monthlySeries.map((m) => m.revenue)
  );
  const peakMonthIndex = monthlySeries.reduce(
    (bestIdx, item, idx, arr) =>
      item.revenue > arr[bestIdx].revenue ? idx : bestIdx,
    0
  );

  const activeSeries = useMemo(() => {
    if (statRange === 'Quarterly') {
      return [0, 1, 2, 3].map((q) => {
        const slice = monthlySeries.slice(q * 3, q * 3 + 3);
        return {
          label: `Q${q + 1}`,
          revenue: slice.reduce((s, item) => s + item.revenue, 0),
          orders: slice.reduce((s, item) => s + item.orders, 0),
        };
      });
    }
    if (statRange === 'Annually') {
      const yr = new Date().getFullYear();
      return [
        {
          label: String(yr - 1),
          revenue: 0,
          orders: 0,
        },
        {
          label: String(yr),
          revenue: monthlySeries.reduce((s, item) => s + item.revenue, 0),
          orders: monthlySeries.reduce((s, item) => s + item.orders, 0),
        },
      ];
    }
    return monthlySeries.map((m) => ({
      label: m.month,
      revenue: m.revenue,
      orders: m.orders,
    }));
  }, [monthlySeries, statRange]);

  const { areaCurveMain, areaCurveSecondary, areaEndX, maxSeriesM } = useMemo(() => {
    const startX = 40;
    const spanX = 640;
    const baseY = 210;
    const heightSpan = 170;

    const maxRev = Math.max(1, ...activeSeries.map((p) => p.revenue));
    const maxOrd = Math.max(1, ...activeSeries.map((p) => p.orders));
    const step = activeSeries.length > 1 ? spanX / (activeSeries.length - 1) : 0;

    const revPts = activeSeries.map((pt, idx) => ({
      x: Math.round(startX + idx * step),
      y: Math.round(baseY - (pt.revenue / maxRev) * heightSpan),
    }));
    const ordPts = activeSeries.map((pt, idx) => ({
      x: Math.round(startX + idx * step),
      y: Math.round(baseY - (pt.orders / maxOrd) * (heightSpan * 0.65)),
    }));

    return {
      areaCurveMain: buildSmoothAreaPath(revPts),
      areaCurveSecondary: buildSmoothAreaPath(ordPts),
      areaEndX: revPts[revPts.length - 1]?.x ?? 680,
      maxSeriesM: Math.max(1, Math.ceil(maxRev / 1_000_000)),
    };
  }, [activeSeries]);

  const categoryBreakdown =
    stats?.categoryBreakdown?.length
      ? stats.categoryBreakdown
      : (['IEM', 'DAC_AMP', 'HEADPHONE', 'CABLE', 'ACCESSORY'] as const).map((cat) => ({
          category: cat,
          count: products.filter((p) => p.category === cat).length,
          stockValue: products
            .filter((p) => p.category === cat)
            .reduce((sum, p) => sum + p.price * p.stock, 0),
        }));

  const displayedRecentOrders = (
    orderFilterOnlyPending ? orders.filter((o) => o.status === 'PENDING') : orders
  ).slice(0, 6);

  return (
    <div className="space-y-6">
      {/* 1. Top TailAdmin Bento Grid: Left (2 Metric Cards + Monthly Sales Bar Chart) | Right (Monthly Target Gauge) */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Left 7 Columns */}
        <div className="col-span-12 xl:col-span-7 space-y-4 md:space-y-6">
          {/* 2 Metric Cards Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
            {/* Metric Card 1: Catalog SKUs */}
            <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#f2f4f5] text-[#000000]">
                <Boxes size={21} strokeWidth={1.7} />
              </div>

              <div className="mt-5 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[13px] tracking-[-0.014em] text-[#787574]">
                    Catalog SKUs
                  </span>
                  <h4 className="mt-1.5 text-[30px] leading-none tracking-[-0.05em] text-[#000000]">
                    {products.length}
                  </h4>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#5433eb]/10 px-2.5 py-1 text-[12px] tracking-[-0.017em] text-[#5433eb]">
                  <ArrowUpRight size={13} />
                  <span>{inStockRate}% in stock</span>
                </span>
              </div>
            </div>

            {/* Metric Card 2: Orders */}
            <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
              <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-[#f2f4f5] text-[#000000]">
                <Package size={21} strokeWidth={1.7} />
              </div>

              <div className="mt-5 flex items-end justify-between gap-2">
                <div>
                  <span className="text-[13px] tracking-[-0.014em] text-[#787574]">
                    Orders
                  </span>
                  <h4 className="mt-1.5 text-[30px] leading-none tracking-[-0.05em] text-[#000000]">
                    {totalOrdersCount}
                  </h4>
                </div>
                {pendingCount > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#332f2d] px-2.5 py-1 text-[12px] tracking-[-0.017em] text-[#ffffff]">
                    <span>{pendingCount} pending</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#5433eb]/10 px-2.5 py-1 text-[12px] tracking-[-0.017em] text-[#5433eb]">
                    <ArrowUpRight size={13} />
                    <span>All processed</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Monthly Sales Bar Chart Card */}
          <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
            <div className="flex items-center justify-between">
              <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
                Monthly Sales
              </h3>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="flex h-8 w-8 items-center justify-center rounded-full text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000] cursor-pointer"
                title="View Orders"
              >
                <MoreVertical size={16} />
              </button>
            </div>

            <div className="mt-6">
              <div className="relative h-48 flex items-end justify-between gap-2 sm:gap-3 pt-4 border-b border-[#ebebeb]">
                {/* Horizontal dashed guidelines */}
                <div className="pointer-events-none absolute inset-0 flex flex-col justify-between pb-6">
                  <div className="border-t border-dashed border-[#ebebeb]" />
                  <div className="border-t border-dashed border-[#ebebeb]" />
                  <div className="border-t border-dashed border-[#ebebeb]" />
                  <div className="border-t border-dashed border-[#ebebeb]" />
                </div>

                {monthlySeries.map((bar, idx) => {
                  const pct =
                    bar.revenue > 0
                      ? Math.max(10, Math.round((bar.revenue / maxMonthlyRevenue) * 100))
                      : 4;
                  const highlight = idx === peakMonthIndex && bar.revenue > 0;
                  return (
                    <div
                      key={bar.month}
                      title={`${bar.month}: ${formatVND(bar.revenue)} (${bar.orders} orders)`}
                      className="relative z-10 flex flex-1 flex-col items-center gap-2 h-full justify-end group"
                    >
                      <div className="w-full max-w-[16px] flex-1 flex items-end">
                        <div
                          className={`w-full rounded-t-full transition-all duration-300 ${
                            highlight
                              ? 'bg-[#5433eb] shadow-[0_4px_16px_rgba(84,51,235,0.3)]'
                              : 'bg-[#c0b5f3] group-hover:bg-[#5433eb]'
                          }`}
                          style={{ height: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-2.5 flex justify-between gap-2 sm:gap-3">
                {monthlySeries.map((bar) => (
                  <span
                    key={bar.month}
                    className="flex-1 text-center text-[11px] tracking-[-0.017em] text-[#787574]"
                  >
                    {bar.month}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Monthly Target Radial Gauge Card */}
        <div className="col-span-12 xl:col-span-5">
          <div className="flex h-full flex-col justify-between rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-2.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
            {/* Inner Mist Surface (#f2f4f5) with 22px radius matching TailAdmin + Shop nesting */}
            <div className="rounded-[22px] bg-[#f2f4f5] p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
                    Monthly Target
                  </h3>
                  <p className="mt-1 text-[12.5px] tracking-[-0.014em] text-[#787574]">
                    Target you&apos;ve set for each month
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigateTab('products')}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffffff] text-[#787574] hover:text-[#000000] cursor-pointer"
                  title="Catalog Settings"
                >
                  <MoreVertical size={15} />
                </button>
              </div>

              {/* Semi-Circular Radial Gauge SVG */}
              <div className="mt-6 flex flex-col items-center">
                <div className="relative w-56 h-32 flex items-end justify-center">
                  <svg viewBox="0 0 200 112" className="w-full h-full overflow-visible">
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#e2e0ee"
                      strokeWidth="12"
                      strokeLinecap="round"
                    />
                    <path
                      d="M 20 100 A 80 80 0 0 1 180 100"
                      fill="none"
                      stroke="#5433eb"
                      strokeWidth="12"
                      strokeLinecap="round"
                      strokeDasharray={`${gaugeProgress} ${gaugeDashTotal}`}
                    />
                  </svg>
                  <div className="absolute bottom-2 text-center">
                    <p className="text-[30px] leading-none tracking-[-0.05em] text-[#000000]">
                      {targetRatio.toFixed(1)}%
                    </p>
                    <span className="mt-2 inline-flex items-center rounded-full bg-[#5433eb]/10 px-2.5 py-0.5 text-[11px] text-[#5433eb]">
                      {totalOrdersCount} orders
                    </span>
                  </div>
                </div>

                <p className="mt-5 max-w-xs text-center text-[13px] leading-relaxed tracking-[-0.014em] text-[#787574]">
                  Gross revenue reached{' '}
                  <span className="text-[#000000]">{formatVND(totalRevenue)}</span> across{' '}
                  {totalOrdersCount} recorded orders.
                </p>
              </div>
            </div>

            {/* Bottom 3-Column Metrics Strip */}
            <div className="grid grid-cols-3 divide-x divide-[#ebebeb] px-2 py-4 text-center">
              <div>
                <p className="text-[12px] tracking-[-0.017em] text-[#787574]">Target</p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 text-[14px] tracking-[-0.02em] text-[#000000]">
                  <span>{Math.round(monthlyTargetAmount / 1000000)}M₫</span>
                  <ArrowDownRight size={13} className="text-[#787574]" />
                </p>
              </div>
              <div>
                <p className="text-[12px] tracking-[-0.017em] text-[#787574]">Revenue</p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 text-[14px] tracking-[-0.02em] text-[#000000]">
                  <span>{(totalRevenue / 1000000).toFixed(1)}M₫</span>
                  <ArrowUpRight size={13} className="text-[#5433eb]" />
                </p>
              </div>
              <div>
                <p className="text-[12px] tracking-[-0.017em] text-[#787574]">Low Stock</p>
                <p className="mt-1 inline-flex items-center justify-center gap-1 text-[14px] tracking-[-0.02em] text-[#5433eb]">
                  <span>{lowStockItems.length} SKUs</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Middle Full-Width Card: TailAdmin Statistics Dual-Series Area Chart */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 md:p-7 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
              Statistics
            </h3>
            <p className="mt-1 text-[12.5px] tracking-[-0.014em] text-[#787574]">
              Target you&apos;ve set for each month — Revenue vs Order Volume
            </p>
          </div>

          <div className="inline-flex items-center rounded-full bg-[#f2f4f5] p-1">
            {(['Monthly', 'Quarterly', 'Annually'] as const).map((period) => (
              <button
                key={period}
                type="button"
                onClick={() => setStatRange(period)}
                className={`rounded-full px-4 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-all ${
                  statRange === period
                    ? 'bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-[#787574] hover:text-[#000000]'
                }`}
              >
                {period}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 h-60 w-full">
          <svg viewBox="0 0 700 230" className="h-full w-full overflow-visible">
            {[30, 75, 120, 165, 210].map((y, idx) => (
              <g key={y}>
                <line
                  x1="40"
                  y1={y}
                  x2="680"
                  y2={y}
                  stroke="#ebebeb"
                  strokeDasharray={y === 210 ? undefined : '4 4'}
                />
                <text x="30" y={y + 4} textAnchor="end" className="text-[10px] fill-[#787574]">
                  {`${Math.round((maxSeriesM * (4 - idx)) / 4)}M`}
                </text>
              </g>
            ))}

            <defs>
              <linearGradient id="tailShopAreaMain" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c0b5f3" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#c0b5f3" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Primary Series: MongoDB Revenue */}
            <path d={`${areaCurveMain} L ${areaEndX},210 L 40,210 Z`} fill="url(#tailShopAreaMain)" />
            <path
              d={areaCurveMain}
              fill="none"
              stroke="#5433eb"
              strokeWidth="2.8"
              strokeLinecap="round"
            />

            {/* Secondary Series: MongoDB Order Volume */}
            <path
              d={areaCurveSecondary}
              fill="none"
              stroke="#332f2d"
              strokeWidth="2"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />

            {activeSeries.map((pt, idx) => {
              const step = activeSeries.length > 1 ? 640 / (activeSeries.length - 1) : 0;
              return (
                <text
                  key={pt.label}
                  x={40 + idx * step}
                  y="228"
                  textAnchor="middle"
                  className="text-[11px] fill-[#787574]"
                >
                  {pt.label}
                </text>
              );
            })}
          </svg>
        </div>
      </div>

      {/* 3. Bottom Bento Grid: Category Breakdown & Low-Stock (Left 5) | Recent Orders Table (Right 7) */}
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        {/* Left 5 Columns: Category Distribution & Low Stock Watch */}
        <div className="col-span-12 xl:col-span-5 rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] space-y-6">
          <div className="flex items-center justify-between border-b border-[#ebebeb] pb-4">
            <div>
              <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
                Category &amp; Low Stock
              </h3>
              <p className="mt-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                SKU share &amp; items requiring restock (≤ 8)
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('products')}
              className="sl-btn-light py-1.5 px-3.5 text-[12px]"
            >
              Catalog
            </button>
          </div>

          {/* Category Progress Bars */}
          <div className="space-y-3.5">
            {categoryBreakdown.map((item, idx) => {
              const pct =
                products.length > 0 ? Math.round((item.count / products.length) * 100) : 0;
              return (
                <div key={item.category} className="space-y-1.5">
                  <div className="flex items-center justify-between text-[13px] tracking-[-0.014em]">
                    <span className="text-[#000000]">
                      {CATEGORY_LABELS[item.category] || item.category}
                    </span>
                    <span className="text-[#787574]">
                      {item.count} SKU · {pct}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-[#f2f4f5]">
                    <div
                      className={`h-full rounded-full ${
                        idx === 0 ? 'bg-[#5433eb]' : 'bg-[#332f2d]'
                      }`}
                      style={{ width: `${Math.max(pct, 6)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Compact Low Stock Rows */}
          <div className="border-t border-[#ebebeb] pt-4 space-y-2.5">
            <p className="text-[12px] tracking-[-0.017em] text-[#787574]">
              Watchlist ({lowStockItems.length} low-stock SKUs)
            </p>
            {lowStockItems.length === 0 ? (
              <div className="rounded-[20px] bg-[#f2f4f5] p-4 text-center text-[12.5px] text-[#787574]">
                Toàn bộ tồn kho đang trên ngưỡng an toàn (&gt; 8).
              </div>
            ) : (
              lowStockItems.slice(0, 3).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 rounded-[20px] bg-[#f2f4f5] p-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={p.image}
                      alt={p.name}
                      className="h-10 w-10 shrink-0 rounded-[12px] bg-[#ffffff] p-1 object-contain"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] tracking-[-0.014em] text-[#000000]">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-[#787574]">
                        {p.sku} · Stock: {p.stock}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onOpenProductModal(p)}
                    className="rounded-full bg-[#ffffff] border border-[#ebebeb] px-3 py-1 text-[11.5px] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff] hover:border-[#5433eb] cursor-pointer transition-colors shrink-0"
                  >
                    Restock
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 7 Columns: Recent Orders Data Table (TailAdmin standard table) */}
        <div className="col-span-12 xl:col-span-7 rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ebebeb] pb-4">
            <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
              Recent Orders
            </h3>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOrderFilterOnlyPending((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-colors ${
                  orderFilterOnlyPending
                    ? 'border-[#5433eb] bg-[#5433eb] text-[#ffffff]'
                    : 'border-[#ebebeb] bg-[#ffffff] text-[#000000] hover:bg-[#f2f4f5]'
                }`}
              >
                <SlidersHorizontal size={12} />
                <span>{orderFilterOnlyPending ? 'Pending Only' : 'Filter'}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('orders')}
                className="sl-btn-light py-1.5 px-3.5 text-[12px]"
              >
                See all
              </button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            {displayedRecentOrders.length === 0 ? (
              <div className="rounded-[20px] bg-[#f2f4f5] p-10 text-center text-[13px] text-[#787574]">
                Không có đơn hàng nào khớp bộ lọc.
              </div>
            ) : (
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#ebebeb] text-[12px] tracking-[-0.017em] text-[#787574]">
                    <th className="pb-3 pr-3">Products / Order</th>
                    <th className="pb-3 px-3">Customer</th>
                    <th className="pb-3 px-3">Total</th>
                    <th className="pb-3 pl-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ebebeb]">
                  {displayedRecentOrders.map((o) => {
                    const st = ORDER_STATUS_CONFIG[o.status] || {
                      label: o.status,
                      bg: 'bg-[#f2f4f5]',
                      text: 'text-[#000000]',
                      border: 'border-[#ebebeb]',
                      dot: 'bg-[#5433eb]',
                    };
                    const firstItem = o.items[0];
                    const totalQty = o.items.reduce((s, it) => s + it.quantity, 0);

                    return (
                      <tr
                        key={o.id}
                        onClick={() => onNavigateTab('orders')}
                        className="hover:bg-[#f2f4f5]/60 cursor-pointer transition-colors"
                      >
                        <td className="py-3.5 pr-3">
                          <div className="flex items-center gap-3">
                            {firstItem?.image ? (
                              <img
                                src={firstItem.image}
                                alt={firstItem.name}
                                className="h-11 w-11 shrink-0 rounded-[14px] bg-[#f2f4f5] p-1 object-contain"
                              />
                            ) : (
                              <div className="h-11 w-11 shrink-0 rounded-[14px] bg-[#f2f4f5]" />
                            )}
                            <div className="min-w-0 max-w-[200px]">
                              <p className="truncate text-[13.5px] tracking-[-0.014em] text-[#000000]">
                                {firstItem?.name || o.orderCode || o.id}
                              </p>
                              <p className="text-[11.5px] text-[#787574]">
                                {o.orderCode || `#${o.id.slice(-6).toUpperCase()}`} · {totalQty}{' '}
                                items
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-[#787574]">
                          <p className="text-[#000000] truncate max-w-[130px]">
                            {o.shippingAddress?.fullName || o.customerName || 'Guest'}
                          </p>
                          <p className="text-[11px] text-[#787574]">
                            {o.shippingAddress?.city}
                          </p>
                        </td>

                        <td className="py-3.5 px-3 text-[13.5px] tracking-[-0.014em] text-[#000000]">
                          {formatVND(o.total)}
                        </td>

                        <td className="py-3.5 pl-3 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] ${st.bg} ${st.text} ${st.border}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${st.dot}`} />
                            <span>{st.label}</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
