import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ProductCard } from '../components/ProductCard';
import {
  ConstellationItem,
  ThreeHeroConstellation,
} from '../components/ThreeHeroConstellation';
import { useStore } from '../context/StoreContext';
import { api, StudioSonglongSet } from '../services/api';
import { ComponentCategory, Product } from '../types';
import { CATEGORY_META, CATEGORY_ORDER, formatVND } from '../utils/format';
import {
  gsap,
  REDUCED_MOTION_QUERY,
  ScrollTrigger,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

const CATEGORY_PILL_ACCENTS: Record<ComponentCategory, string> = {
  IEM: '#5433eb',
  DAC_AMP: '#7c3aed',
  HEADPHONE: '#10b981',
  CABLE: '#0ea5e9',
  ACCESSORY: '#f59e0b',
};

function findMatchingProduct(
  folder: string,
  products: Product[]
): Product | undefined {
  const clean = folder
    .replace(/^(tai-nghe-|dac-amp-|moondrop-)/gi, '')
    .replace(/-/g, ' ')
    .toLowerCase();
  const tokens = clean.split(/\s+/).filter((t) => t.length > 1);

  return (
    products.find((p) => {
      const hay = `${p.id} ${p.slug} ${p.name} ${p.sku}`.toLowerCase();
      return tokens.length > 0 && tokens.every((t) => hay.includes(t));
    }) ||
    products.find((p) => {
      const hay = `${p.id} ${p.slug} ${p.name}`.toLowerCase();
      return tokens.some((t) => hay.includes(t));
    })
  );
}

function getHeroVisualForProduct(p?: Product): string {
  if (!p) return '';
  const banner = p.gallery?.find((g) =>
    /(slider|banner|home|pc|solis2\.jpg|sparxie\.jpg|speaker-h)/i.test(g)
  );
  return banner ?? p.gallery?.[0] ?? p.image;
}

export const HomePage: React.FC = () => {
  const { products, navigate, addToCart } = useStore();
  const pageRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const studioRef = useRef<HTMLElement>(null);
  const activeRailAnimRef = useRef<{ cat: ComponentCategory; dir: 1 | -1 } | null>(null);
  const studioRailAnimRef = useRef<1 | -1 | null>(null);

  const [studioSets, setStudioSets] = useState<StudioSonglongSet[]>([]);
  const [totalStudioImages, setTotalStudioImages] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [liveSearchResults, setLiveSearchResults] = useState<Product[]>([]);
  const [isLiveSearching, setIsLiveSearching] = useState(false);
  const [showLiveDropdown, setShowLiveDropdown] = useState(false);

  // Live Database Search querying MongoDB via backend API
  useEffect(() => {
    const q = searchQuery.trim();
    if (q.length < 2) {
      setLiveSearchResults([]);
      setShowLiveDropdown(false);
      setIsLiveSearching(false);
      return;
    }

    setIsLiveSearching(true);
    const timer = setTimeout(() => {
      api
        .getProducts({ search: q })
        .then((res) => {
          setLiveSearchResults(res.products.slice(0, 6));
          setShowLiveDropdown(true);
          setIsLiveSearching(false);
        })
        .catch(() => {
          setIsLiveSearching(false);
        });
    }, 240);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setShowLiveDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [selectedCategory, setSelectedCategory] = useState<
    ComponentCategory | 'ALL'
  >('ALL');
  const [categoryOffsets, setCategoryOffsets] = useState<Record<string, number>>(
    {}
  );
  const [studioPageOffset, setStudioPageOffset] = useState(0);
  const [showAllStudioSets, setShowAllStudioSets] = useState(false);
  const [activeStudioImgByFolder, setActiveStudioImgByFolder] = useState<
    Record<string, number>
  >({});
  const [cookieDismissed, setCookieDismissed] = useState(false);

  useEffect(() => {
    api
      .getStudioSonglongSets()
      .then((res) => {
        setStudioSets(res.sets);
        setTotalStudioImages(res.totalImages);
      })
      .catch(() => {
        // Fallback smoothly to product gallery if media endpoint unavailable
      });
  }, []);

  // Build Three.js Constellation Items directly from studio_songlong sets (249 images / 32 sets)
  const constellationItems = useMemo<ConstellationItem[]>(() => {
    if (studioSets.length > 0) {
      return studioSets.map((set) => {
        const matched = set.product || findMatchingProduct(set.folder, products);
        return {
          id: matched?.id ?? set.folder,
          title: set.title,
          subtitle: matched ? formatVND(matched.price) : `${set.count} studio angles`,
          rating: matched?.rating ?? 4.9,
          images: set.images,
        };
      });
    }

    return [...products]
      .sort((a, b) => b.performanceScore - a.performanceScore)
      .slice(0, 12)
      .map((p) => ({
        id: p.id,
        title: p.name.replace(/^MOONDROP\s*/i, ''),
        subtitle: formatVND(p.price),
        rating: p.rating,
        images: [p.image, ...(p.gallery ?? [])].filter(Boolean),
      }));
  }, [studioSets, products]);

  const handleSelectConstellation = useCallback(
    (item: ConstellationItem) => {
      const matched = products.find((p) => p.id === item.id);
      if (matched) {
        navigate(`/product/${matched.id}`);
      } else {
        navigate(`/products?search=${encodeURIComponent(item.title)}`);
      }
    },
    [products, navigate]
  );

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/products?search=${encodeURIComponent(q)}` : '/products');
  };

  const visibleCategories = useMemo(
    () =>
      selectedCategory === 'ALL'
        ? CATEGORY_ORDER
        : CATEGORY_ORDER.filter((c) => c === selectedCategory),
    [selectedCategory]
  );

  const categoryDataMap = useMemo(() => {
    const map = new Map<
      ComponentCategory,
      { lead: Product; spotlightTop: Product[]; railItems: Product[]; heroImg: string }
    >();
    for (const cat of CATEGORY_ORDER) {
      const list = [...products]
        .filter((p) => p.category === cat)
        .sort(
          (a, b) =>
            Number(Boolean(b.featured)) - Number(Boolean(a.featured)) ||
            b.performanceScore - a.performanceScore
        );
      const lead =
        list.find((p) => (p.gallery?.length ?? 0) > 0) ?? list[0];
      if (!lead) continue;
      const spotlightTop = list.filter((p) => p.id !== lead.id).slice(0, 2);
      const railItems = list.filter((p) => p.id !== lead.id);
      map.set(cat, {
        lead,
        spotlightTop,
        railItems: railItems.length > 0 ? railItems : list,
        heroImg: getHeroVisualForProduct(lead),
      });
    }
    return map;
  }, [products]);

  const visibleStudioSets = useMemo(() => {
    if (showAllStudioSets) return studioSets;
    if (studioSets.length <= 8) return studioSets;
    const out: StudioSonglongSet[] = [];
    for (let i = 0; i < 8; i++) {
      out.push(studioSets[(studioPageOffset + i) % studioSets.length]);
    }
    return out;
  }, [studioSets, studioPageOffset, showAllStudioSets]);

  useMagneticButtons(pageRef, [products.length, studioSets.length, selectedCategory]);

  // 1. Initial Page & Hero Entrance Animation (Khi mới vào trang)
  const { contextSafe } = useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      // Overall page container gentle fade-in
      if (pageRef.current) {
        tl.fromTo(
          pageRef.current,
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.9, ease: 'power2.out' },
          0
        );
      }

      // Three.js 3D Constellation soft entrance
      tl.fromTo(
        '.js-hero-constellation',
        { autoAlpha: 0, scale: 0.94, y: 28 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.85,
          ease: 'power3.out',
          clearProps: 'transform',
        },
        0.08
      );

      // Search Bar floats up
      tl.fromTo(
        '.js-hero-search',
        { y: 32, autoAlpha: 0, scale: 0.96 },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          duration: 0.75,
          ease: 'power3.out',
          clearProps: 'transform',
        },
        0.2
      );

      // Category Filter Pills staggered entrance
      tl.fromTo(
        '.js-category-pill',
        { y: 20, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: 0.55,
          stagger: 0.045,
          ease: 'power3.out',
          clearProps: 'transform',
        },
        0.35
      );
    },
    { scope: pageRef }
  );

  // 2. Per-Category Section Choreography on Scroll (Smooth Fade-In & Elevation as user scrolls down)
  useGSAP(
    () => {
      if (products.length === 0) return;

      const sections = gsap.utils.toArray<HTMLElement>(
        '.js-category-section',
        pageRef.current ?? undefined
      );

      sections.forEach((sectionEl) => {
        const header = sectionEl.querySelector<HTMLElement>('.js-cat-header');
        const topCards = gsap.utils.toArray<HTMLElement>('.js-cat-top-card', sectionEl);
        const railCards = gsap.utils.toArray<HTMLElement>('.js-cat-rail-card', sectionEl);
        const heroParallax = sectionEl.querySelector<HTMLElement>('.js-cat-hero-img');

        // 1. Category Header Scroll Trigger
        if (header) {
          gsap.fromTo(
            header,
            { y: 30, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: header,
                start: 'top 92%',
                once: true,
              },
            }
          );
        }

        // 2. Spotlight Top Cards Scroll Trigger (Floats up with elegant stagger)
        if (topCards.length > 0) {
          gsap.fromTo(
            topCards,
            { y: 48, autoAlpha: 0, scale: 0.96 },
            {
              y: 0,
              autoAlpha: 1,
              scale: 1,
              duration: 0.8,
              stagger: 0.12,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: topCards[0],
                start: 'top 90%',
                once: true,
              },
            }
          );
        }

        // 3. Rail Cards Scroll Trigger (Slides up with wave stagger)
        if (railCards.length > 0) {
          gsap.fromTo(
            railCards,
            { y: 38, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.7,
              stagger: 0.05,
              ease: 'power3.out',
              clearProps: 'transform',
              scrollTrigger: {
                trigger: railCards[0],
                start: 'top 92%',
                once: true,
              },
            }
          );
        }

        // 4. Subtle parallax on hero lead image
        if (heroParallax) {
          gsap.fromTo(
            heroParallax,
            { yPercent: -5, scale: 1.05 },
            {
              yPercent: 5,
              scale: 1.05,
              ease: 'none',
              scrollTrigger: {
                trigger: sectionEl,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.5,
              },
            }
          );
        }
      });

      const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => window.clearTimeout(refreshTimer);
    },
    { scope: pageRef, dependencies: [products.length, selectedCategory], revertOnUpdate: true }
  );

  // 3. SongLong Studio Showcase Scroll Reveal
  useGSAP(
    () => {
      if (studioSets.length === 0 || !studioRef.current) return;

      const studioEl = studioRef.current;
      const studioHeader = studioEl.querySelector<HTMLElement>('.js-studio-header');
      const studioCards = gsap.utils.toArray<HTMLElement>('.js-studio-card', studioEl);

      if (studioHeader) {
        gsap.fromTo(
          studioHeader,
          { y: 30, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            duration: 0.7,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: studioHeader,
              start: 'top 92%',
              once: true,
            },
          }
        );
      }

      if (studioCards.length > 0) {
        gsap.fromTo(
          studioCards,
          { y: 48, autoAlpha: 0, scale: 0.95 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.75,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: studioCards[0],
              start: 'top 90%',
              once: true,
            },
          }
        );
      }

      const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => window.clearTimeout(refreshTimer);
    },
    { scope: studioRef, dependencies: [studioSets.length, showAllStudioSets], revertOnUpdate: true }
  );

  // 4. Category Carousel Rail Slide-In after offset changes
  useGSAP(
    () => {
      const pending = activeRailAnimRef.current;
      if (!pending) return;
      activeRailAnimRef.current = null;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (ctx) => {
        if (ctx.conditions?.reduceMotion) return;
        const railTrack = pageRef.current?.querySelector(
          `[data-rail-cat="${pending.cat}"]`
        );
        if (!railTrack) return;
        const cards = gsap.utils.toArray<HTMLElement>('.js-cat-rail-card', railTrack);
        if (cards.length === 0) return;

        gsap.fromTo(
          cards,
          { x: pending.dir * 36, autoAlpha: 0, scale: 0.98 },
          {
            x: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform',
          }
        );
      });
      return () => mm.revert();
    },
    { scope: pageRef, dependencies: [categoryOffsets] }
  );

  // 5. Studio Showcase Carousel Rail Slide-In after offset changes
  useGSAP(
    () => {
      const dir = studioRailAnimRef.current;
      if (!dir) return;
      studioRailAnimRef.current = null;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (ctx) => {
        if (ctx.conditions?.reduceMotion) return;
        const cards = gsap.utils.toArray<HTMLElement>(
          '.js-studio-card',
          studioRef.current ?? undefined
        );
        if (cards.length === 0) return;

        gsap.fromTo(
          cards,
          { x: dir * 36, autoAlpha: 0, scale: 0.98 },
          {
            x: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.5,
            stagger: 0.06,
            ease: 'power3.out',
            clearProps: 'transform',
          }
        );
      });
      return () => mm.revert();
    },
    { scope: studioRef, dependencies: [studioPageOffset] }
  );

  const handleCategorySelect = (
    nextCat: ComponentCategory | 'ALL',
    scrollToGrid = false
  ) => {
    if (scrollToGrid) {
      categoriesRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
    if (nextCat !== selectedCategory) {
      setSelectedCategory(nextCat);
    }
  };

  const advanceCategoryRail = contextSafe(
    (cat: ComponentCategory, total: number, dir: 1 | -1 = 1) => {
      const safeTotal = Math.max(total, 1);
      const applyOffset = () => {
        activeRailAnimRef.current = { cat, dir };
        setCategoryOffsets((prev) => ({
          ...prev,
          [cat]: (((prev[cat] ?? 0) + dir * 4) % safeTotal + safeTotal) % safeTotal,
        }));
      };

      if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
        applyOffset();
        return;
      }

      const railTrack = pageRef.current?.querySelector(`[data-rail-cat="${cat}"]`);
      const cards = railTrack
        ? gsap.utils.toArray<HTMLElement>('.js-cat-rail-card', railTrack)
        : [];
      if (cards.length === 0) {
        applyOffset();
        return;
      }

      gsap.killTweensOf(cards);
      gsap.to(cards, {
        x: dir * -28,
        autoAlpha: 0,
        duration: 0.18,
        stagger: 0.025,
        ease: 'power2.in',
        onComplete: applyOffset,
      });
    }
  );

  const advanceStudioRail = contextSafe((dir: 1 | -1) => {
    const len = Math.max(studioSets.length, 1);
    const applyOffset = () => {
      studioRailAnimRef.current = dir;
      setStudioPageOffset((prev) => (((prev + dir * 4) % len) + len) % len);
    };

    if (window.matchMedia(REDUCED_MOTION_QUERY).matches) {
      applyOffset();
      return;
    }

    const cards = gsap.utils.toArray<HTMLElement>(
      '.js-studio-card',
      studioRef.current ?? undefined
    );
    if (cards.length === 0) {
      applyOffset();
      return;
    }

    gsap.killTweensOf(cards);
    gsap.to(cards, {
      x: dir * -28,
      autoAlpha: 0,
      duration: 0.18,
      stagger: 0.025,
      ease: 'power2.in',
      onComplete: applyOffset,
    });
  });

  return (
    <div ref={pageRef} className="w-full bg-[#f2f4f5] text-[#000000]">
      {/* SECTION 1: Hero Constellation Band (Three.js 3D Product Constellation + Violet Search + Category Pills) */}
      <section className="w-full pb-12 pt-2">
        {/* Three.js 3D Product Constellation Canvas surrounding centered #5433eb shop wordmark */}
        <div className="js-hero-constellation">
          <ThreeHeroConstellation
            items={constellationItems}
            onSelectItem={handleSelectConstellation}
          />
        </div>

        <div className="mx-auto max-w-[1200px] px-4 space-y-6 -mt-2 relative z-20">
          {/* Pill Search Bar with Violet Circular Submit Button (#5433eb) & Live Autocomplete Dropdown */}
          <div ref={searchBoxRef} className="relative mx-auto max-w-[540px] w-full">
            <form
              onSubmit={handleHeroSearch}
              className="js-hero-search w-full rounded-full bg-[#ffffff] border border-[#05294d]/10 pl-4 pr-1 py-1 sm:pl-5 sm:pr-1.5 shadow-[0_2px_8px_rgba(0,0,0,0.06)] flex items-center gap-2"
            >
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchQuery.trim().length >= 2 && liveSearchResults.length > 0) {
                    setShowLiveDropdown(true);
                  }
                }}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you shopping for today?"
                aria-label="What are you shopping for today?"
                className="flex-1 min-w-0 bg-transparent text-[14px] sm:text-[16px] leading-[1.33] tracking-[-0.031em] text-[#000000] placeholder:text-[#787574] focus:outline-none py-2"
              />
              {isLiveSearching && (
                <span className="h-4 w-4 rounded-full border-2 border-[#5433eb] border-t-transparent animate-spin shrink-0 mr-1" />
              )}
              <button
                type="submit"
                aria-label="Search catalog"
                className="shop-violet-submit h-10 w-10 sm:h-12 sm:w-12 shrink-0"
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2.2"
                >
                  <path
                    d="M5 12h14M13 5l7 7-7 7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </form>

            {/* Live MongoDB Database Dropdown */}
            {showLiveDropdown && searchQuery.trim().length >= 2 && (
              <div className="absolute left-0 right-0 top-full mt-2.5 z-50 rounded-[24px] bg-[#ffffff] border border-[#ebebeb] shadow-[0_12px_36px_rgba(0,0,0,0.12)] p-3 space-y-2 max-h-[420px] overflow-y-auto">
                <div className="flex items-center justify-between px-3 py-1.5 text-[11px] tracking-[-0.017em] text-[#787574] border-b border-[#f2f4f5]">
                  <span className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isLiveSearching ? 'bg-[#5433eb] animate-pulse' : 'bg-[#10b981]'
                      }`}
                    />
                    <span>
                      {isLiveSearching
                        ? 'Searching...'
                        : `${liveSearchResults.length} results found`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowLiveDropdown(false)}
                    className="hover:text-[#000000] cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {liveSearchResults.length === 0 && !isLiveSearching && (
                  <div className="px-3 py-4 text-center text-[13px] text-[#787574]">
                    Không có sản phẩm nào trong database khớp với &quot;{searchQuery}&quot;.
                  </div>
                )}

                {liveSearchResults.map((prod) => (
                  <div
                    key={prod.id}
                    onClick={() => {
                      setShowLiveDropdown(false);
                      navigate(`/product/${prod.id}`);
                    }}
                    className="flex items-center gap-3 rounded-[18px] p-2 hover:bg-[#f2f4f5] cursor-pointer transition-colors"
                  >
                    <img
                      src={prod.image}
                      alt={prod.name}
                      className="h-12 w-12 rounded-[14px] object-contain bg-[#f2f4f5] p-1 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13.5px] text-[#000000] truncate font-normal">
                        {prod.name}
                      </div>
                      <div className="text-[11.5px] text-[#787574] flex items-center gap-2">
                        <span className="rounded-full bg-[#f2f4f5] px-2 py-0.5">
                          {CATEGORY_META[prod.category].shortLabel}
                        </span>
                        <span>{prod.sku}</span>
                      </div>
                    </div>
                    <div className="text-[13px] text-[#5433eb] shrink-0 font-normal">
                      {formatVND(prod.price)}
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={(e) => handleHeroSearch(e)}
                  className="w-full rounded-full bg-[#f2f4f5] py-2 text-[12.5px] text-[#000000] hover:bg-[#ebebeb] transition-colors flex items-center justify-center gap-1.5 cursor-pointer mt-1"
                >
                  <span>Xem tất cả kết quả tìm kiếm trong Catalog ({liveSearchResults.length}+)</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Centered Category Pills Row (Swipeable on Mobile, Wrapped Centered on Desktop) */}
          <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-2.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => handleCategorySelect('ALL', true)}
              className={`js-category-pill js-magnetic shrink-0 rounded-full py-1.5 pl-2 pr-3.5 sm:pr-4 flex items-center gap-2 text-[13.5px] sm:text-[15px] tracking-[-0.031em] cursor-pointer transition-all ${
                selectedCategory === 'ALL'
                  ? 'bg-[#000000] text-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                  : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#f2f4f5]'
              }`}
            >
              <span className="h-4 w-4 rounded-full bg-[#5433eb] shrink-0" />
              <span>All Categories</span>
            </button>

            {CATEGORY_ORDER.map((cat) => {
              const active = selectedCategory === cat;
              const accent = CATEGORY_PILL_ACCENTS[cat];
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleCategorySelect(cat)}
                  className={`js-category-pill js-magnetic shrink-0 rounded-full py-1.5 pl-2 pr-3.5 sm:pr-4 flex items-center gap-2 text-[13.5px] sm:text-[15px] tracking-[-0.031em] cursor-pointer transition-all ${
                    active
                      ? 'bg-[#000000] text-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
                      : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#f2f4f5]'
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full shrink-0"
                    style={{ backgroundColor: accent }}
                  />
                  <span>{CATEGORY_META[cat].shortLabel}</span>
                </button>
              );
            })}

            {studioSets.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  studioRef.current?.scrollIntoView({ behavior: 'smooth' })
                }
                className="js-category-pill js-magnetic shrink-0 rounded-full py-1.5 pl-2 pr-3.5 sm:pr-4 flex items-center gap-2 text-[13.5px] sm:text-[15px] tracking-[-0.031em] bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#5433eb] cursor-pointer"
              >
                <span className="h-4 w-4 rounded-full bg-[#332f2d] shrink-0" />
                <span>Studio SongLong ({studioSets.length})</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* SECTION 2: Category Discovery Bands */}
      <div
        ref={categoriesRef}
        className="mx-auto max-w-[1200px] px-3 sm:px-4 py-5 sm:py-8 space-y-10 sm:space-y-16"
      >
        {visibleCategories.map((cat) => {
          const data = categoryDataMap.get(cat);
          if (!data) return null;

          const { lead, spotlightTop, railItems, heroImg } = data;
          const offset = categoryOffsets[cat] ?? 0;
          const railSlice: Product[] = [];
          const showCount = Math.min(4, railItems.length);
          for (let i = 0; i < showCount; i++) {
            railSlice.push(railItems[(offset + i) % railItems.length]);
          }

          return (
            <section
              key={cat}
              data-category={cat}
              className="js-category-section"
            >
              {/* Category Section Header (20px GT Standard -1.0px tracking + 16px right chevron, 24px bottom margin) */}
              <div className="js-cat-header mb-6 flex items-center justify-between gap-4">
                <button
                  type="button"
                  onClick={() => navigate(`/products?category=${cat}`)}
                  className="flex items-center gap-1.5 text-[20px] leading-[1.2] tracking-[-0.05em] text-[#000000] cursor-pointer group"
                >
                  <span>{CATEGORY_META[cat].label}</span>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#000000"
                    strokeWidth="2"
                    className="transition-transform group-hover:translate-x-0.5"
                  >
                    <path
                      d="M9 6l6 6-6 6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/products?category=${cat}`)}
                  className="rounded-full bg-[#ffffff] border border-[#ebebeb] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#787574] hover:text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer"
                >
                  See all
                </button>
              </div>

              {/* Row 1: Product Type Hero Image (28px dark/lifestyle overlay card) + 2 Brand Spotlight Cards */}
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4 mb-2.5 sm:mb-3">
                {/* Product Type Hero Image Card */}
                <div
                  onClick={() => navigate(`/product/${lead.id}`)}
                  className="js-cat-top-card col-span-2 lg:col-span-2 relative min-h-[230px] sm:min-h-[340px] cursor-pointer overflow-hidden rounded-[22px] sm:rounded-[28px] bg-[#000000] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] group"
                >
                  <div className="js-cat-hero-img h-full w-full">
                    <img
                      src={heroImg}
                      alt={lead.name}
                      loading="lazy"
                      className="h-full w-full object-cover opacity-85 transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#000000]/55 via-transparent to-[#000000]/35" />

                  {/* Top-Left White Brand Overlay */}
                  <div className="absolute left-4 top-4 right-4 sm:left-6 sm:top-6 sm:right-6 text-[#ffffff]">
                    <div className="text-[22px] sm:text-[34px] leading-[1.08] tracking-[-0.05em]">
                      {lead.name}
                    </div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 sm:gap-2 text-[12px] sm:text-[14px] text-[#ffffff]/95">
                      <span>★★★★★</span>
                      <span>
                        {lead.rating.toFixed(1)} ({lead.reviewCount})
                      </span>
                      <span>· {formatVND(lead.price)}</span>
                    </div>
                  </div>

                  {/* Bottom-Left Semi-Transparent White Type Chip + Quick Bag Button */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-5 sm:right-5 flex items-center justify-between gap-2">
                    <span className="rounded-[10px] sm:rounded-[12px] bg-[#ffffff]/90 backdrop-blur-sm p-2 sm:p-3 text-[11.5px] sm:text-[14px] leading-none tracking-[-0.014em] text-[#000000] truncate max-w-[58%] sm:max-w-none">
                      {CATEGORY_META[cat].shortLabel} · {lead.sku}
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        addToCart(lead, 1);
                      }}
                      className="shrink-0 rounded-full bg-[#5433eb] px-3.5 py-1.5 sm:px-4 sm:py-2 text-[12px] sm:text-[13px] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:opacity-95 cursor-pointer"
                    >
                      Quick buy
                    </button>
                  </div>
                </div>

                {/* Right 2 Columns: Elevated White Brand Spotlight Cards */}
                {spotlightTop.map((prod) => (
                  <div key={prod.id} className="js-cat-top-card flex">
                    <ProductCard product={prod} variant="light" />
                  </div>
                ))}
              </div>

              {/* Row 2: Horizontal Product Rail with Floating Circular Carousel Arrows */}
              <div className="relative">
                <div
                  data-rail-cat={cat}
                  className="js-cat-rail-track grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4"
                >
                  {railSlice.map((prod) => (
                    <div key={`${cat}-${prod.id}`} className="js-cat-rail-card flex">
                      <ProductCard product={prod} variant="light" />
                    </div>
                  ))}
                </div>

                {railItems.length > 4 && (
                  <>
                    <button
                      type="button"
                      onClick={() => advanceCategoryRail(cat, railItems.length, -1)}
                      aria-label={`Previous ${CATEGORY_META[cat].shortLabel}`}
                      className="shop-carousel-arrow absolute left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-20"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2"
                      >
                        <path
                          d="M15 6l-6 6 6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => advanceCategoryRail(cat, railItems.length, 1)}
                      aria-label={`Next ${CATEGORY_META[cat].shortLabel}`}
                      className="shop-carousel-arrow absolute right-1 sm:-right-2 top-1/2 -translate-y-1/2 z-20"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000000"
                        strokeWidth="2"
                      >
                        <path
                          d="M9 6l6 6-6 6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </button>
                  </>
                )}
              </div>
            </section>
          );
        })}

        {/* SECTION 3: SongLong Studio Multi-Angle Collection (32 Sets / 249 Studio Photos) */}
        {studioSets.length > 0 && (
          <section ref={studioRef} className="pt-4 pb-8">
            <div className="js-studio-header mb-5 sm:mb-6 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
              <button
                type="button"
                onClick={() => setShowAllStudioSets((prev) => !prev)}
                className="flex items-center gap-1.5 text-[16px] sm:text-[20px] leading-[1.2] tracking-[-0.05em] text-[#000000] cursor-pointer text-left"
              >
                <span>
                  SongLong Studio Showcase · {studioSets.length} Sets (
                  {totalStudioImages} Photos)
                </span>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#000000"
                  strokeWidth="2"
                  className="shrink-0"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <button
                type="button"
                onClick={() => setShowAllStudioSets((prev) => !prev)}
                className="rounded-full bg-[#ffffff] border border-[#ebebeb] px-4 py-1.5 text-[12.5px] sm:text-[13px] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#000000] hover:text-[#ffffff] cursor-pointer transition-colors"
              >
                {showAllStudioSets
                  ? 'Show 8 featured sets'
                  : `Browse all ${studioSets.length} sets`}
              </button>
            </div>

            <div className="relative">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
                {visibleStudioSets.map((set) => {
                  const matchedProd = findMatchingProduct(set.folder, products);
                  const activeIdx = activeStudioImgByFolder[set.folder] ?? 0;
                  const activeUrl = set.images[activeIdx] ?? set.cover;

                  return (
                    <div
                      key={set.folder}
                      className="js-studio-card mx-auto w-full max-w-none sm:max-w-[290px] rounded-[20px] sm:rounded-[28px] bg-[#ffffff] p-2 sm:p-2.5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.1)] flex flex-col justify-between transition-transform duration-200 hover:-translate-y-1"
                    >
                      <div>
                        <div
                          onClick={() =>
                            matchedProd
                              ? navigate(`/product/${matchedProd.id}`)
                              : navigate(
                                  `/products?search=${encodeURIComponent(set.title)}`
                                )
                          }
                          className="relative aspect-square w-full cursor-pointer overflow-hidden rounded-[14px] sm:rounded-[20px] bg-[#f2f4f5]/75 p-2.5 sm:p-4 flex items-center justify-center"
                        >
                          <img
                            src={activeUrl}
                            alt={set.title}
                            loading="lazy"
                            className="max-h-full max-w-full object-contain"
                          />
                          <span className="absolute left-2 top-2 sm:left-2.5 sm:top-2.5 rounded-full bg-[#ffffff]/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                            {activeIdx + 1}/{set.count} photos
                          </span>
                        </div>

                        {/* Mini Product Thumbnail Strip */}
                        <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-[2px]">
                          {set.images.slice(0, 4).map((url, idx) => (
                            <button
                              key={url}
                              type="button"
                              onMouseEnter={() =>
                                setActiveStudioImgByFolder((prev) => ({
                                  ...prev,
                                  [set.folder]: idx,
                                }))
                              }
                              onClick={() =>
                                setActiveStudioImgByFolder((prev) => ({
                                  ...prev,
                                  [set.folder]: idx,
                                }))
                              }
                              aria-label={`View ${set.title} angle ${idx + 1}`}
                              className={`h-8 w-8 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-[8px] sm:rounded-[12px] bg-[#f2f4f5] cursor-pointer ${
                                idx === activeIdx
                                  ? 'ring-1 ring-[#5433eb] opacity-100'
                                  : 'opacity-70 hover:opacity-100'
                              }`}
                            >
                              <img
                                src={url}
                                alt=""
                                loading="lazy"
                                className="h-full w-full object-contain p-0.5"
                              />
                            </button>
                          ))}
                        </div>

                        <div className="px-1 sm:px-2 pt-2 sm:pt-3 pb-1 text-center space-y-1">
                          <div className="text-[12.5px] sm:text-[14px] leading-[1.25] tracking-[-0.014em] text-[#000000] line-clamp-1">
                            {set.title}
                          </div>
                          <div className="flex items-center justify-center gap-1.5 text-[9px] leading-none tracking-[-0.058em]">
                            <span className="text-[#5433eb]">★★★★★</span>
                            <span className="text-[#787574]">
                              {matchedProd
                                ? `${formatVND(matchedProd.price)}`
                                : `${set.count} Studio Angles`}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="px-1 sm:px-2 pt-2 sm:pt-2.5 pb-0.5 sm:pb-1">
                        <button
                          type="button"
                          onClick={() =>
                            matchedProd
                              ? navigate(`/product/${matchedProd.id}`)
                              : navigate(
                                  `/products?search=${encodeURIComponent(set.title)}`
                                )
                          }
                          className="w-full rounded-full bg-[#f2f4f5] hover:bg-[#5433eb] hover:text-[#ffffff] text-[#000000] py-1.5 sm:py-2 px-2.5 sm:px-3 text-[11.5px] sm:text-[12px] tracking-[-0.017em] cursor-pointer transition-colors"
                        >
                          {matchedProd ? 'View product' : 'Explore similar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {!showAllStudioSets && studioSets.length > 8 && (
                <>
                  <button
                    type="button"
                    onClick={() => advanceStudioRail(-1)}
                    aria-label="Previous Studio SongLong collections"
                    className="shop-carousel-arrow absolute left-1 sm:-left-2 top-1/2 -translate-y-1/2 z-20"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2"
                    >
                      <path
                        d="M15 6l-6 6 6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => advanceStudioRail(1)}
                    aria-label="Next Studio SongLong collections"
                    className="shop-carousel-arrow absolute right-1 sm:-right-2 top-1/2 -translate-y-1/2 z-20"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#000000"
                      strokeWidth="2"
                    >
                      <path
                        d="M9 6l6 6-6 6"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Dismissible Cookie Consent Pill */}
      {!cookieDismissed && (
        <div className="fixed bottom-20 md:bottom-4 left-3 right-3 sm:right-auto md:left-20 z-40 rounded-full bg-[#ffffff] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] py-1.5 px-4 flex items-center justify-between sm:justify-start gap-3 text-[11.5px] sm:text-[12px] text-[#000000]">
          <span>We use cookies to improve your experience.</span>
          <button
            type="button"
            onClick={() => setCookieDismissed(true)}
            className="text-[13px] sm:text-[14px] underline underline-offset-2 text-[#000000] cursor-pointer shrink-0"
          >
            Accept
          </button>
        </div>
      )}
    </div>
  );
};
