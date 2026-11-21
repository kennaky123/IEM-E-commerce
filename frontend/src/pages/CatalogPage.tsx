import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { ComponentCategory, Product } from '../types';
import { CATEGORY_META, CATEGORY_ORDER } from '../utils/format';
import {
  Flip,
  gsap,
  runScrambleTargets,
  ScrollTrigger,
  SplitText,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

export const CatalogPage: React.FC = () => {
  const { products: storeProducts, loading, currentSearch } = useStore();
  const catalogRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const flipStateRef = useRef<Flip.FlipState | null>(null);

  const [category, setCategory] = useState<ComponentCategory | 'ALL'>('ALL');
  const [signature, setSignature] = useState<string>('ALL');
  const [pinFilter, setPinFilter] = useState<string>('ALL');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<
    'featured' | 'price-asc' | 'price-desc' | 'score-desc'
  >('featured');

  // Database-driven products queried through API & MongoDB
  const [dbProducts, setDbProducts] = useState<Product[]>([]);
  const [hasQueriedDb, setHasQueriedDb] = useState(false);

  useEffect(() => {
    const sp = new URLSearchParams(currentSearch);
    const catParam = sp.get('category') as ComponentCategory | null;
    if (catParam && CATEGORY_ORDER.includes(catParam)) {
      setCategory(catParam);
    } else if (!catParam) {
      setCategory('ALL');
    }
    const sigParam = sp.get('signature');
    if (sigParam) {
      setSignature(sigParam);
    } else {
      setSignature('ALL');
    }
    const qParam = sp.get('search');
    if (qParam !== null) {
      setSearch(qParam);
    }
  }, [currentSearch]);

  // Live Database Query through Backend API (MongoDB find with $regex, $or, $gte, $lte)
  useEffect(() => {
    let cancelled = false;

    const timer = setTimeout(() => {
      api
        .getProducts({
          search: search.trim() || undefined,
          category: category !== 'ALL' ? category : undefined,
          soundSignature: signature !== 'ALL' ? signature : undefined,
          pinType: pinFilter !== 'ALL' ? pinFilter : undefined,
          inStock: inStockOnly || undefined,
          sort: sortBy,
        })
        .then((res) => {
          if (!cancelled) {
            setDbProducts(res.products);
            setHasQueriedDb(true);
          }
        })
        .catch(() => {
          // Keep current products if search query fails
        });
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [category, signature, pinFilter, inStockOnly, search, sortBy]);

  // Active product list returned directly by the MongoDB database query
  const filtered = useMemo(() => {
    if (hasQueriedDb) return dbProducts;
    return storeProducts;
  }, [hasQueriedDb, dbProducts, storeProducts]);

  const captureFlip = () => {
    const items = gsap.utils.toArray<HTMLElement>(
      '.js-catalog-item',
      catalogRef.current ?? undefined
    );
    if (items.length > 0) {
      flipStateRef.current = Flip.getState(items);
    }
  };

  useMagneticButtons(catalogRef, [filtered.length]);

  useGSAP(
    () => {
      const split = titleRef.current
        ? SplitText.create(titleRef.current, {
            type: 'words,lines',
            mask: 'lines',
          })
        : null;

      if (split) {
        gsap.from(split.words, {
          yPercent: 115,
          stagger: 0.05,
          duration: 0.75,
          ease: 'power3.out',
        });
      }

      gsap.from('.js-catalog-header', {
        y: 25,
        autoAlpha: 0,
        duration: 0.65,
        stagger: 0.08,
        ease: 'power3.out',
      });

      runScrambleTargets(catalogRef.current, '.js-catalog-scramble');

      return () => split?.revert();
    },
    { scope: catalogRef }
  );

  useGSAP(
    () => {
      if (loading) return;

      const state = flipStateRef.current;
      flipStateRef.current = null;

      if (state) {
        Flip.from(state, {
          targets: '.js-catalog-item',
          duration: 0.55,
          ease: 'power2.inOut',
          stagger: 0.02,
          scale: false,
          absolute: false,
          onEnter: (els) =>
            gsap.fromTo(
              els,
              { autoAlpha: 0, y: 30 },
              { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }
            ),
          onLeave: (els) =>
            gsap.to(els, { autoAlpha: 0, duration: 0.2 }),
        });
      } else if (filtered.length > 0) {
        // Initial entrance batch + scroll reveal for catalog items
        ScrollTrigger.batch('.js-catalog-item', {
          start: 'top 92%',
          once: true,
          onEnter: (batch) =>
            gsap.fromTo(
              batch,
              { y: 40, autoAlpha: 0, scale: 0.97 },
              {
                y: 0,
                autoAlpha: 1,
                scale: 1,
                stagger: 0.06,
                duration: 0.65,
                ease: 'power3.out',
                clearProps: 'transform',
                overwrite: 'auto',
              }
            ),
        });
      }

      runScrambleTargets(catalogRef.current, '.js-count-scramble');
    },
    {
      scope: catalogRef,
      dependencies: [
        loading,
        category,
        signature,
        pinFilter,
        inStockOnly,
        sortBy,
        search,
        filtered.length,
      ],
    }
  );

  return (
    <div ref={catalogRef} className="w-full bg-[#f2f4f5] text-[#000000] pb-20">
      {/* Shop.md Light Header & Floating Filter Console */}
      <section className="px-3 sm:px-4 pt-6 sm:pt-8 pb-4 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="text-center flex flex-col items-center pb-6 sm:pb-8">
            <span
              className="js-catalog-header js-catalog-scramble inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-3.5 py-1.5 text-[11.5px] sm:text-[12px] tracking-[-0.017em] text-[#787574] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              data-scramble="Complete Audio Hardware Catalog"
            >
              <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
              <span>Complete Audio Hardware Catalog</span>
            </span>
            <h1
              ref={titleRef}
              style={{ fontKerning: 'none' }}
              className="mt-3 sm:mt-4 text-[30px] sm:text-[52px] leading-none tracking-[-0.05em] text-[#000000]"
            >
              Explore audio hardware
            </h1>
            <p className="js-catalog-header mt-2.5 sm:mt-3 max-w-2xl text-[14px] sm:text-[16px] leading-[1.4] tracking-[-0.031em] text-[#787574]">
              Inspect every in-ear monitor, balanced DAC/AMP, planar headphone, and interconnect cable across the live MongoDB inventory.
            </p>
          </div>

          {/* Floating White Filter Card */}
          <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-5 md:p-6 space-y-4 sm:space-y-5">
            {/* Category Pills Strip (Swipeable on Mobile) */}
            <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto no-scrollbar border-b border-[#ebebeb] pb-4 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap">
              <button
                type="button"
                onClick={() => {
                  captureFlip();
                  setCategory('ALL');
                }}
                className={`js-magnetic shrink-0 rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12.5px] sm:text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                  category === 'ALL'
                    ? 'bg-[#000000] text-[#ffffff]'
                    : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                }`}
              >
                All ({storeProducts.length})
              </button>
              {CATEGORY_ORDER.map((cat) => {
                const count = storeProducts.filter((p) => p.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      captureFlip();
                      setCategory(cat);
                    }}
                    className={`js-magnetic shrink-0 rounded-full px-3.5 sm:px-4 py-1.5 sm:py-2 text-[12.5px] sm:text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                      category === cat
                        ? 'bg-[#000000] text-[#ffffff]'
                        : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                    }`}
                  >
                    {CATEGORY_META[cat].shortLabel} ({count})
                  </button>
                );
              })}
            </div>

            {/* Search & Facet Filter Controls */}
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 md:grid-cols-12 items-end">
              <div className="col-span-2 md:col-span-4">
                <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                  Search model, chip or driver
                </label>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => {
                    captureFlip();
                    setSearch(e.target.value);
                  }}
                  placeholder="e.g. Dusk, CS43198, Planar..."
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/60 px-4 py-2 sm:py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none"
                />
              </div>

              <div className="col-span-1 md:col-span-3">
                <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                  Tuning target
                </label>
                <select
                  value={signature}
                  onChange={(e) => {
                    captureFlip();
                    setSignature(e.target.value);
                  }}
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/60 px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">All signatures</option>
                  <option value="VDSF Neutral">VDSF Neutral</option>
                  <option value="Harman Sub-Bass">Harman Sub-Bass</option>
                  <option value="Studio Reference">Studio Reference</option>
                  <option value="Warm Musical">Warm Musical</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                  Connector / Plug
                </label>
                <select
                  value={pinFilter}
                  onChange={(e) => {
                    captureFlip();
                    setPinFilter(e.target.value);
                  }}
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/60 px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Any terminal</option>
                  <option value="0.78mm 2-Pin">0.78mm 2-Pin</option>
                  <option value="MMCX">MMCX</option>
                  <option value="4.4mm Balanced">4.4mm Balanced</option>
                  <option value="3.5mm SE">3.5mm SE</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                  Sort order
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    captureFlip();
                    setSortBy(
                      e.target.value as
                        | 'featured'
                        | 'price-asc'
                        | 'price-desc'
                        | 'score-desc'
                    );
                  }}
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5]/60 px-3 sm:px-4 py-2 sm:py-2.5 text-[13px] sm:text-[14px] tracking-[-0.014em] text-[#000000] focus:border-[#5433eb] focus:bg-[#ffffff] focus:outline-none cursor-pointer"
                >
                  <option value="featured">Featured</option>
                  <option value="score-desc">Acoustic index</option>
                  <option value="price-asc">Price: Low to high</option>
                  <option value="price-desc">Price: High to low</option>
                </select>
              </div>

              <div className="col-span-1 md:col-span-1">
                <button
                  type="button"
                  onClick={() => {
                    captureFlip();
                    setInStockOnly((v) => !v);
                  }}
                  className={`js-magnetic w-full rounded-full px-3 py-2 sm:py-2.5 text-[12.5px] sm:text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    inStockOnly
                      ? 'bg-[#5433eb] text-[#ffffff]'
                      : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                  }`}
                >
                  In stock
                </button>
              </div>
            </div>
          </div>

          {/* Results Meta */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="js-count-scramble text-[13px] tracking-[-0.014em] text-[#787574]"
                data-scramble={`Showing ${filtered.length} products`}
              >
                Showing {filtered.length} products
              </span>
            </div>
            {(category !== 'ALL' ||
              signature !== 'ALL' ||
              pinFilter !== 'ALL' ||
              inStockOnly ||
              search) && (
              <button
                type="button"
                onClick={() => {
                  captureFlip();
                  setCategory('ALL');
                  setSignature('ALL');
                  setPinFilter('ALL');
                  setInStockOnly(false);
                  setSearch('');
                }}
                className="rounded-full bg-[#ffffff] px-3.5 py-1.5 text-[12px] tracking-[-0.017em] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:text-[#5433eb] cursor-pointer transition-colors"
              >
                Reset filters
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                <div
                  key={n}
                  className="h-72 sm:h-96 w-full max-w-none sm:max-w-[290px] rounded-[20px] sm:rounded-[28px] bg-[#ffffff] animate-pulse shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06)]"
                />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="mt-8 shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-10 sm:p-12 text-center space-y-3">
              <p className="text-[18px] tracking-[-0.031em] text-[#000000]">
                No matching audio products found
              </p>
              <p className="text-[14px] text-[#787574]">
                Try clearing one of your active filters or search terms.
              </p>
            </div>
          ) : (
            <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4 justify-items-center">
              {filtered.map((product) => (
                <div
                  key={product.id}
                  data-flip-id={product.id}
                  className="js-catalog-item w-full flex justify-center"
                >
                  <ProductCard product={product} variant="light" />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
