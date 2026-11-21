import React, { useEffect, useState } from 'react';
import {
  ChevronRight,
  Edit3,
  LayoutGrid,
  List,
  Minus,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import { adminApi } from '../../services/api';
import { ComponentCategory, Product } from '../../types';
import { formatVND } from '../../utils/format';

interface ProductsViewProps {
  products: Product[];
  externalSearch?: string;
  onOpenModal: (p?: Product) => void;
  onDeleteProduct: (id: string) => Promise<void>;
  onQuickUpdateStock: (p: Product, newStock: number) => Promise<void>;
  onBackDashboard?: () => void;
}

const CATEGORIES: { value: ComponentCategory | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All SKUs' },
  { value: 'IEM', label: 'IEM' },
  { value: 'DAC_AMP', label: 'DAC / AMP' },
  { value: 'HEADPHONE', label: 'Headphones' },
  { value: 'CABLE', label: 'Cables' },
  { value: 'ACCESSORY', label: 'Accessories' },
];

export const ProductsView: React.FC<ProductsViewProps> = ({
  products,
  externalSearch = '',
  onOpenModal,
  onDeleteProduct,
  onQuickUpdateStock,
  onBackDashboard,
}) => {
  const [searchTerm, setSearchTerm] = useState(externalSearch);
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'ALL'>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'LOW' | 'OUT' | 'FEATURED'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [dbItems, setDbItems] = useState<Product[]>(products);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  useEffect(() => {
    setSearchTerm(externalSearch);
  }, [externalSearch]);

  // Live Database Query through Admin API and MongoDB
  useEffect(() => {
    let cancelled = false;
    setIsSearchingDb(true);
    const timer = setTimeout(() => {
      adminApi
        .getProducts({
          search: searchTerm.trim() || undefined,
          category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
        })
        .then((items) => {
          if (!cancelled) {
            let res = items;
            if (stockFilter === 'LOW') res = res.filter((p) => p.stock > 0 && p.stock <= 8);
            else if (stockFilter === 'OUT') res = res.filter((p) => p.stock === 0);
            else if (stockFilter === 'FEATURED') res = res.filter((p) => Boolean(p.featured));
            setDbItems(res);
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
  }, [searchTerm, selectedCategory, stockFilter, products]);

  const filtered = dbItems;

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`Xác nhận xóa vĩnh viễn sản phẩm "${name}" khỏi cơ sở dữ liệu?`)) {
      return;
    }
    setDeletingId(id);
    try {
      await onDeleteProduct(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* TailAdmin Page Title & Breadcrumb Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] leading-none tracking-[-0.04em] text-[#000000]">
          Products Catalog
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
          <span className="text-[#5433eb]">Products Catalog</span>
        </nav>
      </div>

      {/* TailAdmin Filter & Control Card (Shop 28px radius & pills) */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Input with Live MongoDB Query Indicator */}
          <div className="relative flex-1 max-w-md">
            <Search size={16} className="pointer-events-none absolute left-4 top-3 text-[#787574]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm sản phẩm theo tên, mã SKU, thương hiệu..."
              className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5] py-2.5 pl-11 pr-10 text-[13.5px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors"
            />
            {isSearchingDb && (
              <span className="absolute right-3.5 top-3 h-4 w-4 border-2 border-[#5433eb] border-t-transparent rounded-full animate-spin pointer-events-none" />
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* View Mode Toggle Pills */}
            <div className="inline-flex items-center rounded-full bg-[#f2f4f5] p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-all ${
                  viewMode === 'table'
                    ? 'bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-[#787574] hover:text-[#000000]'
                }`}
              >
                <List size={13} />
                <span>Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-all ${
                  viewMode === 'grid'
                    ? 'bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                    : 'text-[#787574] hover:text-[#000000]'
                }`}
              >
                <LayoutGrid size={13} />
                <span>Cards</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => onOpenModal()}
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5433eb] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)] hover:bg-[#4524db] cursor-pointer transition-all"
            >
              <Plus size={15} />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Category & Stock Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#ebebeb] pt-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.value;
              return (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setSelectedCategory(cat.value)}
                  className={`rounded-full px-3.5 py-1.5 text-[12px] tracking-[-0.017em] cursor-pointer transition-colors ${
                    active
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {(
              [
                { id: 'ALL', label: `All (${products.length})` },
                { id: 'LOW', label: 'Low stock ≤ 8' },
                { id: 'OUT', label: 'Out of stock' },
                { id: 'FEATURED', label: 'Flagship' },
              ] as const
            ).map((flag) => {
              const active = stockFilter === flag.id;
              return (
                <button
                  key={flag.id}
                  type="button"
                  onClick={() => setStockFilter(flag.id)}
                  className={`rounded-full border px-3 py-1 text-[12px] tracking-[-0.017em] cursor-pointer transition-colors ${
                    active
                      ? 'border-[#5433eb] bg-[#5433eb] text-[#ffffff]'
                      : 'border-[#ebebeb] bg-[#ffffff] text-[#787574] hover:text-[#000000]'
                  }`}
                >
                  {flag.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Products Content: TailAdmin Data Table (Default) OR Grid Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-12 text-center space-y-3">
          <p className="text-[18px] tracking-[-0.04em] text-[#000000]">
            Không tìm thấy sản phẩm nào khớp với bộ lọc
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('ALL');
              setStockFilter('ALL');
            }}
            className="sl-btn-light text-[13px]"
          >
            Reset filters
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-[#ebebeb] text-[12px] tracking-[-0.017em] text-[#787574]">
                  <th className="pb-3.5 pr-4">Product</th>
                  <th className="pb-3.5 px-4">SKU</th>
                  <th className="pb-3.5 px-4">Category</th>
                  <th className="pb-3.5 px-4 text-right">Price</th>
                  <th className="pb-3.5 px-4 text-center">Stock</th>
                  <th className="pb-3.5 px-4 text-center">Status</th>
                  <th className="pb-3.5 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ebebeb]">
                {filtered.map((p) => {
                  const isLow = p.stock > 0 && p.stock <= 8;
                  const isOut = p.stock === 0;

                  return (
                    <tr key={p.id} className="hover:bg-[#f2f4f5]/60 transition-colors">
                      <td className="py-3.5 pr-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={p.image}
                            alt={p.name}
                            className="h-11 w-11 shrink-0 rounded-[14px] bg-[#f2f4f5] p-1 object-contain"
                          />
                          <div className="min-w-0 max-w-[240px]">
                            <p className="truncate text-[14px] tracking-[-0.014em] text-[#000000]">
                              {p.name}
                            </p>
                            <p className="truncate text-[11.5px] text-[#787574]">
                              {p.specs?.driverConfig || p.brand}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[12px] tracking-[-0.017em] text-[#5433eb]">
                        {p.sku}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[11px] text-[#000000]">
                          {p.category}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right text-[14px] tracking-[-0.014em] text-[#000000]">
                        {formatVND(p.price)}
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="block text-[11px] text-[#787574] line-through">
                            {formatVND(p.originalPrice)}
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1.5 rounded-full bg-[#f2f4f5] px-2 py-1">
                          <button
                            type="button"
                            onClick={() => onQuickUpdateStock(p, Math.max(0, p.stock - 1))}
                            disabled={p.stock <= 0}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffffff] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-35 cursor-pointer transition-colors"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="min-w-[26px] text-[12px] text-[#000000]">{p.stock}</span>
                          <button
                            type="button"
                            onClick={() => onQuickUpdateStock(p, p.stock + 1)}
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-[#ffffff] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff] cursor-pointer transition-colors"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {isOut ? (
                          <span className="rounded-full bg-[#000000] px-2.5 py-0.5 text-[11px] text-[#ffffff]">
                            Out of stock
                          </span>
                        ) : isLow ? (
                          <span className="rounded-full bg-[#332f2d] px-2.5 py-0.5 text-[11px] text-[#ffffff]">
                            Low ({p.stock})
                          </span>
                        ) : (
                          <span className="rounded-full bg-[#5433eb]/10 px-2.5 py-0.5 text-[11px] text-[#5433eb]">
                            In stock
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 pl-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onOpenModal(p)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#ebebeb] bg-[#ffffff] px-3 py-1 text-[12px] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff] hover:border-[#5433eb] cursor-pointer transition-colors"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p.id, p.name)}
                            disabled={deletingId === p.id}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-[#ebebeb] bg-[#ffffff] text-[#787574] hover:bg-[#000000] hover:text-[#ffffff] disabled:opacity-40 cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {filtered.map((p) => {
            const isLow = p.stock > 0 && p.stock <= 8;
            const isOut = p.stock === 0;
            return (
              <article
                key={p.id}
                className="flex flex-col justify-between rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-2.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]"
              >
                <div>
                  <div
                    onClick={() => onOpenModal(p)}
                    className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-[20px] bg-[#f2f4f5]/75 p-4 flex items-center justify-center group"
                  >
                    <img
                      src={p.image}
                      alt={p.name}
                      loading="lazy"
                      className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute left-2.5 top-2.5 flex items-center gap-1">
                      {p.featured && (
                        <span className="rounded-full bg-[#5433eb] px-2.5 py-0.5 text-[10px] text-[#ffffff]">
                          Flagship
                        </span>
                      )}
                      {isOut ? (
                        <span className="rounded-full bg-[#000000] px-2.5 py-0.5 text-[10px] text-[#ffffff]">
                          Out of stock
                        </span>
                      ) : isLow ? (
                        <span className="rounded-full bg-[#332f2d] px-2.5 py-0.5 text-[10px] text-[#ffffff]">
                          Low ({p.stock})
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="px-2 pt-3 pb-2 text-center space-y-1">
                    <p className="truncate text-[14px] tracking-[-0.014em] text-[#000000]">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-[#787574]">{p.sku}</p>
                    <p className="text-[14px] text-[#000000] pt-0.5">{formatVND(p.price)}</p>
                  </div>
                </div>

                <div className="mt-2 space-y-2 border-t border-[#ebebeb] pt-2.5 px-1 pb-1">
                  <div className="flex items-center justify-between rounded-full bg-[#f2f4f5] px-3 py-1">
                    <span className="text-[11px] text-[#787574]">Stock</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onQuickUpdateStock(p, Math.max(0, p.stock - 1))}
                        disabled={p.stock <= 0}
                        className="h-5 w-5 rounded-full bg-[#ffffff] flex items-center justify-center cursor-pointer disabled:opacity-35"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-[12px] min-w-[20px] text-center">{p.stock}</span>
                      <button
                        type="button"
                        onClick={() => onQuickUpdateStock(p, p.stock + 1)}
                        className="h-5 w-5 rounded-full bg-[#ffffff] flex items-center justify-center cursor-pointer"
                      >
                        <Plus size={11} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onOpenModal(p)}
                      className="flex-1 rounded-full bg-[#000000] py-1.5 text-[12px] text-[#ffffff] hover:bg-[#5433eb] cursor-pointer transition-colors"
                    >
                      Edit SKU
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(p.id, p.name)}
                      disabled={deletingId === p.id}
                      className="h-8 w-8 rounded-full border border-[#ebebeb] flex items-center justify-center text-[#787574] hover:bg-[#000000] hover:text-[#ffffff] cursor-pointer"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};
