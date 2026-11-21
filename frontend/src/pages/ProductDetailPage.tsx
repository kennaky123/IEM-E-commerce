import React, { useEffect, useRef, useState } from 'react';
import { FrequencyResponseChart } from '../components/FrequencyResponseChart';
import { ProductCard } from '../components/ProductCard';
import { ProductReviewsSection } from '../components/ProductReviewsSection';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';
import { ComponentCategory, Product, ReviewSummary } from '../types';
import {
  extractDetailedSpecRows,
  extractSilkscreenTags,
  formatVND,
} from '../utils/format';
import {
  gsap,
  runScrambleTargets,
  ScrollTrigger,
  SplitText,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

interface ProductDetailPageProps {
  productId: string;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  productId,
}) => {
  const {
    products,
    navigate,
    addToCart,
    assignBuildPart,
    buildParts,
    compareIds,
    toggleCompare,
  } = useStore();
  const detailRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [recommendedPairings, setRecommendedPairings] = useState<Product[]>([]);
  const [reviewSummary, setReviewSummary] = useState<ReviewSummary | null>(null);
  const [chainCompat, setChainCompat] = useState<{
    compatible: boolean;
    reason?: string;
  }>({ compatible: true });

  useEffect(() => {
    setSelectedImageIdx(0);
    setReviewSummary(null);
  }, [productId]);

  const product = products.find(
    (p) => p.id === productId || p.slug === productId
  );

  // Fetch compatible pairings & validate Signal Chain synergy via Backend API
  useEffect(() => {
    if (!product) {
      setRecommendedPairings([]);
      setChainCompat({ compatible: true });
      return;
    }

    let cancelled = false;
    api
      .getProductPairings(product.id, 3)
      .then((res) => {
        if (!cancelled) setRecommendedPairings(res.pairings);
      })
      .catch(() => {
        if (!cancelled) setRecommendedPairings([]);
      });

    const slots: Partial<Record<ComponentCategory, string>> = {};
    for (const [cat, item] of Object.entries(buildParts)) {
      if (item?.id) slots[cat as ComponentCategory] = item.id;
    }
    slots[product.category] = product.id;

    api
      .validateBuild(slots)
      .then((res) => {
        if (cancelled) return;
        const relevantError = res.validation.issues.find(
          (issue) =>
            issue.severity === 'ERROR' &&
            issue.affectedCategories.includes(product.category)
        );
        setChainCompat(
          relevantError
            ? { compatible: false, reason: relevantError.title }
            : { compatible: true }
        );
      })
      .catch(() => {
        if (!cancelled) setChainCompat({ compatible: true });
      });

    return () => {
      cancelled = true;
    };
  }, [product, buildParts]);

  useMagneticButtons(detailRef, [productId, Boolean(product)]);

  // 1. Entrance Choreography & Scroll-Triggered Reveals for Product Specs / Analysis
  useGSAP(
    () => {
      if (!product) return;

      const split = titleRef.current
        ? SplitText.create(titleRef.current, {
            type: 'words,lines',
            mask: 'lines',
          })
        : null;

      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

      tl.fromTo(
        '.js-detail-breadcrumb',
        { y: -16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.7, clearProps: 'transform' },
        0
      )
        .fromTo(
          '.js-detail-photo',
          { scale: 0.94, y: 32, autoAlpha: 0 },
          { scale: 1, y: 0, autoAlpha: 1, duration: 0.9, clearProps: 'transform' },
          0.08
        );

      if (split) {
        tl.fromTo(
          split.words,
          { yPercent: 115, autoAlpha: 0 },
          { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: 0.85 },
          0.16
        );
      }

      tl.fromTo(
        '.js-detail-info',
        { y: 28, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.085, duration: 0.75, clearProps: 'transform' },
        0.22
      ).fromTo(
        '.js-detail-tag',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, stagger: 0.05, duration: 0.55, clearProps: 'transform' },
        0.35
      );

      runScrambleTargets(detailRef.current, '.js-detail-scramble');

      const scrollBlocks = gsap.utils.toArray<HTMLElement>(
        '.js-detail-scroll-block',
        detailRef.current ?? undefined
      );
      scrollBlocks.forEach((el) => {
        gsap.fromTo(
          el,
          { y: 42, autoAlpha: 0, scale: 0.98 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: el,
              start: 'top 90%',
              once: true,
            },
          }
        );
      });

      const scrollGrids = gsap.utils.toArray<HTMLElement>(
        '.js-detail-grid',
        detailRef.current ?? undefined
      );
      scrollGrids.forEach((grid) => {
        const cells = gsap.utils.toArray<HTMLElement>('.js-spec-cell', grid);
        if (cells.length === 0) return;
        gsap.fromTo(
          cells,
          { y: 38, autoAlpha: 0, scale: 0.97 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            stagger: 0.075,
            duration: 0.75,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: cells[0],
              start: 'top 92%',
              once: true,
            },
          }
        );
      });

      const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 300);
      return () => {
        window.clearTimeout(refreshTimer);
        split?.revert();
      };
    },
    { scope: detailRef, dependencies: [productId, Boolean(product)], revertOnUpdate: true }
  );

  // 2. Smooth Gallery Angle Switch Transition
  useGSAP(
    () => {
      if (!product) return;
      gsap.fromTo(
        '.js-detail-active-img',
        { autoAlpha: 0, scale: 0.95, y: 10 },
        {
          autoAlpha: 1,
          scale: 1,
          y: 0,
          duration: 0.45,
          ease: 'power2.out',
          clearProps: 'transform',
        }
      );
    },
    { scope: detailRef, dependencies: [selectedImageIdx, productId] }
  );

  // 3. Verified Signal Pairings Scroll Reveal (after async pairings fetch)
  useGSAP(
    () => {
      if (recommendedPairings.length === 0) return;

      const header = detailRef.current?.querySelector<HTMLElement>('.js-pairing-header');
      const cards = gsap.utils.toArray<HTMLElement>(
        '.js-pairing-card',
        detailRef.current ?? undefined
      );

      if (header) {
        gsap.fromTo(
          header,
          { y: 28, autoAlpha: 0 },
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

      if (cards.length > 0) {
        gsap.fromTo(
          cards,
          { y: 44, autoAlpha: 0, scale: 0.96 },
          {
            y: 0,
            autoAlpha: 1,
            scale: 1,
            stagger: 0.12,
            duration: 0.8,
            ease: 'power3.out',
            clearProps: 'transform',
            scrollTrigger: {
              trigger: cards[0],
              start: 'top 90%',
              once: true,
            },
          }
        );
      }

      const refreshTimer = window.setTimeout(() => ScrollTrigger.refresh(), 200);
      return () => window.clearTimeout(refreshTimer);
    },
    {
      scope: detailRef,
      dependencies: [recommendedPairings.length, productId],
      revertOnUpdate: true,
    }
  );

  if (!product) {
    return (
      <section className="bg-[#f2f4f5] text-[#000000] px-4 py-16 md:px-8">
        <div className="mx-auto max-w-xl shop-card rounded-[28px] bg-[#ffffff] p-10 text-center space-y-4">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <span>404 · Product not found</span>
          </span>
          <h1 className="text-[26px] leading-tight tracking-[-0.05em] text-[#000000]">
            Requested product could not be found
          </h1>
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="rounded-full bg-[#5433eb] px-6 py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors mt-2"
          >
            Back to catalog
          </button>
        </div>
      </section>
    );
  }

  const specRows = extractDetailedSpecRows(product);
  const silkscreenTags = extractSilkscreenTags(product);
  const isSlotted = buildParts[product.category]?.id === product.id;
  const isComparing = compareIds.includes(product.id);
  const galleryImages = Array.from(
    new Set([product.image, ...(product.gallery ?? [])].filter(Boolean))
  );
  const activeImage = galleryImages[selectedImageIdx] ?? product.image;
  const isWideActiveImage =
    /(slider|banner|home|pc|pill-f|pudding-sl|solis2\.jpg|sparxie\.jpg|speaker-h)/i.test(
      activeImage
    );
  const tonalBands = product.specs.tonalNotes
    ? [
        { band: '01 · Sub-bass & low end', note: product.specs.tonalNotes.bass },
        { band: '02 · Vocal & midrange', note: product.specs.tonalNotes.midrange },
        { band: '03 · Air & treble extension', note: product.specs.tonalNotes.treble },
        { band: '04 · Soundstage & imaging', note: product.specs.tonalNotes.soundstage },
      ]
    : [];

  const effectiveReviewCount = reviewSummary
    ? reviewSummary.totalReviews
    : product.reviewCount;
  const effectiveRating = reviewSummary
    ? reviewSummary.totalReviews > 0
      ? reviewSummary.averageRating
      : product.rating
    : product.rating;
  const filledStars = Math.max(0, Math.min(5, Math.round(effectiveRating)));

  return (
    <div ref={detailRef} className="w-full bg-[#f2f4f5] text-[#000000] pb-28 sm:pb-20">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-4 md:px-8 pt-5 sm:pt-6 space-y-5 sm:space-y-6">
        {/* Top Breadcrumb Pill Bar */}
        <div className="js-detail-breadcrumb flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-4 py-2 text-[13px] tracking-[-0.014em] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:text-[#5433eb] cursor-pointer transition-colors"
          >
            <span>←</span>
            <span>Back to catalog</span>
          </button>

          <div className="flex items-center gap-2">
            <span
              className="js-detail-scramble rounded-full bg-[#ffffff] px-3.5 py-1.5 text-[12px] tracking-[-0.017em] text-[#787574] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
              data-scramble={product.sku}
            >
              {product.sku}
            </span>
            {product.specs.isNewRelease && (
              <span className="rounded-full bg-[#5433eb] px-3 py-1.5 text-[12px] tracking-[-0.017em] text-[#ffffff]">
                New release
              </span>
            )}
          </div>
        </div>

        {/* Primary Showcase Card */}
        <section className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-8 lg:p-10">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 items-start">
            {/* Left Stage: Product Frame + Multi-Angle Thumbnail Strip */}
            <div className="js-detail-photo lg:col-span-5 max-w-[460px] mx-auto w-full space-y-3">
              <div
                className={`w-full overflow-hidden rounded-[18px] sm:rounded-[20px] flex items-center justify-center ${
                  isWideActiveImage
                    ? 'bg-[#332f2d] p-4 min-h-[220px] sm:min-h-[300px]'
                    : 'bg-[#f2f4f5]/75 p-4 sm:p-6 h-[240px] sm:h-[380px]'
                }`}
              >
                <img
                  src={activeImage}
                  alt={`${product.name} — angle ${selectedImageIdx + 1}`}
                  className={
                    isWideActiveImage
                      ? 'js-detail-active-img mx-auto w-full h-auto max-h-[240px] sm:max-h-[300px] object-contain'
                      : 'js-detail-active-img mx-auto max-h-[200px] max-w-[200px] sm:max-h-[260px] sm:max-w-[260px] object-contain'
                  }
                />
              </div>

              {galleryImages.length > 1 && (
                <div className="rounded-[20px] bg-[#f2f4f5] p-3">
                  <div className="mb-2 flex items-center justify-between px-1 text-[11px] tracking-[-0.017em] text-[#787574]">
                    <span>
                      Gallery ({selectedImageIdx + 1} / {galleryImages.length})
                    </span>
                    <span>Select angle</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {galleryImages.map((imgSrc, idx) => {
                      const isSelected = idx === selectedImageIdx;
                      return (
                        <button
                          key={imgSrc}
                          type="button"
                          onClick={() => setSelectedImageIdx(idx)}
                          className={`group relative aspect-square overflow-hidden rounded-[12px] bg-[#ffffff] p-1 cursor-pointer transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#5433eb]'
                              : 'opacity-75 hover:opacity-100'
                          }`}
                          aria-label={`View gallery photo ${idx + 1}`}
                        >
                          <img
                            src={imgSrc}
                            alt={`${product.name} thumbnail ${idx + 1}`}
                            className="h-full w-full object-contain"
                          />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {silkscreenTags.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {silkscreenTags.map((tag) => (
                    <span
                      key={tag}
                      className="js-detail-tag js-detail-scramble rounded-full bg-[#f2f4f5] px-3 py-1 text-[11px] tracking-[-0.017em] text-[#000000]"
                      data-scramble={tag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Right Metadata & Purchase Controls */}
            <div className="lg:col-span-7 space-y-5">
              <div
                className="js-detail-info js-detail-scramble inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#787574]"
                data-scramble={`${product.brand} · ${product.category.replace('_', '/')}`}
              >
                <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                <span>
                  {product.brand} · {product.category.replace('_', '/')}
                </span>
              </div>

              <h1
                ref={titleRef}
                style={{ fontKerning: 'none' }}
                className="text-[26px] sm:text-[48px] leading-[1.05] tracking-[-0.05em] text-[#000000]"
              >
                {product.name}
              </h1>

              {/* Rating & Price Row */}
              <div className="js-detail-info flex flex-wrap items-center gap-3 sm:gap-4 text-[13px] tracking-[-0.014em] text-[#787574]">
                <button
                  type="button"
                  onClick={() =>
                    document
                      .getElementById('product-reviews')
                      ?.scrollIntoView({ behavior: 'smooth' })
                  }
                  className="inline-flex items-center gap-1.5 cursor-pointer hover:text-[#5433eb] transition-colors"
                >
                  <span>
                    <span className="text-[#5433eb]">{'★'.repeat(filledStars)}</span>
                    <span className="text-[#d4d4d8]">
                      {'☆'.repeat(5 - filledStars)}
                    </span>
                  </span>
                  <span className="text-[#000000]">{effectiveRating.toFixed(1)}</span>
                  <span>({effectiveReviewCount} đánh giá)</span>
                </button>
                <span>·</span>
                <span>
                  Acoustic index{' '}
                  <strong className="font-normal text-[#000000]">
                    {product.performanceScore}/100
                  </strong>
                </span>
              </div>

              <div className="js-detail-info flex items-baseline gap-3">
                <span className="text-[24px] sm:text-[30px] leading-none tracking-[-0.05em] text-[#000000]">
                  {formatVND(product.price)}
                </span>
                {product.originalPrice && product.originalPrice > product.price && (
                  <span className="text-[14px] sm:text-[15px] tracking-[-0.014em] text-[#787574] line-through">
                    {formatVND(product.originalPrice)}
                  </span>
                )}
              </div>

              <p className="js-detail-info text-[14.5px] sm:text-[16px] leading-[1.5] tracking-[-0.031em] text-[#787574] max-w-2xl">
                {product.summary}
              </p>

              {/* Availability & Signal Chain Compatibility Bento Box */}
              <div className="js-detail-info rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-3.5 sm:p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] tracking-[-0.014em]">
                  <span className="inline-flex items-center gap-2 text-[#000000]">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${
                        product.stock > 0 ? 'bg-[#5433eb]' : 'bg-[#787574]'
                      }`}
                    />
                    <span>
                      {product.stock > 0
                        ? `In stock · ${product.stock} units ready to ship`
                        : 'Currently out of stock'}
                    </span>
                  </span>
                </div>

                <div className="border-t border-[#ebebeb] pt-2.5 text-[13px] tracking-[-0.014em] text-[#787574]">
                  Signal Chain match:{' '}
                  <span className="text-[#000000]">
                    {chainCompat.compatible
                      ? 'Compatible with your current Signal Chain setup'
                      : chainCompat.reason}
                  </span>
                </div>
              </div>

              {/* Pill CTA Actions */}
              <div className="js-detail-info flex flex-wrap gap-2 sm:gap-2.5 pt-2">
                <button
                  type="button"
                  disabled={product.stock <= 0}
                  onClick={() => addToCart(product, 1)}
                  className="js-magnetic w-full sm:w-auto flex items-center justify-center rounded-full bg-[#5433eb] px-7 py-3.5 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-40"
                >
                  {product.stock > 0 ? 'Add to bag' : 'Out of stock'}
                </button>

                <button
                  type="button"
                  onClick={() => assignBuildPart(product)}
                  className={`js-magnetic flex-1 sm:flex-initial flex items-center justify-center rounded-full px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    isSlotted
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                  }`}
                >
                  {isSlotted ? '✓ Slotted in Signal Chain' : '+ Add to Signal Chain'}
                </button>

                <button
                  type="button"
                  onClick={() => toggleCompare(product.id)}
                  className={`js-magnetic flex-1 sm:flex-initial flex items-center justify-center rounded-full px-4 sm:px-5 py-3 sm:py-3.5 text-[13px] sm:text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    isComparing
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                  }`}
                >
                  {isComparing ? '✓ In Compare Lab' : '+ Compare curve'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Frequency Response Measurement Card */}
        {product.specs.frCurve && product.specs.frCurve.length > 0 && (
          <section className="js-detail-scroll-block shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8">
            <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-4 space-y-3">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                  <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                  <span>IEC61094 Frequency Measurement</span>
                </div>
                <h2 className="text-[22px] sm:text-[24px] leading-tight tracking-[-0.05em] text-[#000000]">
                  Measured curve vs VDSF target
                </h2>
                <p className="text-[14px] leading-[1.5] tracking-[-0.014em] text-[#787574]">
                  Tuning profile: <span className="text-[#000000]">{product.specs.soundSignature}</span>. Hover the plot to inspect exact Hz &amp; dB alignment.
                </p>
              </div>

              <div className="lg:col-span-8 rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-3.5 sm:p-5 md:p-6">
                <FrequencyResponseChart
                  darkSurface={false}
                  traces={[
                    {
                      label: product.name,
                      values: product.specs.frCurve,
                      color: '#5433eb',
                    },
                  ]}
                />
              </div>
            </div>
          </section>
        )}

        {/* Acoustic Monograph & In-The-Box Manifest */}
        {(product.longDescription ||
          (product.specs.boxContents && product.specs.boxContents.length > 0)) && (
          <section className="js-detail-grid grid grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-12">
            {product.longDescription && (
              <div className="js-spec-cell shop-card lg:col-span-7 rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                  <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                  <span>Acoustic monograph &amp; architecture</span>
                </div>
                <h2 className="text-[22px] sm:text-[24px] leading-tight tracking-[-0.05em] text-[#000000]">
                  {product.name} — Engineering overview
                </h2>
                <p className="text-[14.5px] sm:text-[15px] leading-[1.6] tracking-[-0.031em] text-[#787574]">
                  {product.longDescription}
                </p>
              </div>
            )}

            {product.specs.boxContents && product.specs.boxContents.length > 0 && (
              <div className="js-spec-cell shop-card lg:col-span-5 rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8">
                <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3.5">
                  <span className="text-[18px] tracking-[-0.05em] text-[#000000]">
                    In the box
                  </span>
                  <span className="rounded-full bg-[#f2f4f5] px-2.5 py-0.5 text-[12px] tracking-[-0.017em] text-[#787574]">
                    {product.specs.boxContents.length} items
                  </span>
                </div>
                <ul className="mt-4 divide-y divide-[#ebebeb]">
                  {product.specs.boxContents.map((item, idx) => (
                    <li
                      key={item}
                      className="flex items-start gap-3 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000]"
                    >
                      <span className="text-[12px] text-[#5433eb] min-w-[24px]">
                        {String(idx + 1).padStart(2, '0')}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* 4-Band Tonal Analysis */}
        {tonalBands.length > 0 && (
          <section className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
            <div className="js-detail-scroll-block flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] pb-4">
              <span className="text-[20px] sm:text-[22px] leading-none tracking-[-0.05em] text-[#000000]">
                4-band tonal analysis
              </span>
              <span className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                {product.specs.soundSignature ?? 'Studio'} target
              </span>
            </div>
            <div className="js-detail-grid grid grid-cols-1 gap-3.5 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {tonalBands.map((band) => (
                <div
                  key={band.band}
                  className="js-spec-cell rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-4 sm:p-5 space-y-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                    <span className="text-[12px] tracking-[-0.017em] text-[#787574]">
                      {band.band}
                    </span>
                  </div>
                  <p className="text-[14px] leading-[1.5] tracking-[-0.014em] text-[#000000]">
                    {band.note}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Engineering Specifications Bento Grid */}
        <section className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
          <div className="js-detail-scroll-block flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] pb-4">
            <span className="text-[20px] sm:text-[22px] leading-none tracking-[-0.05em] text-[#000000]">
              Engineering specifications
            </span>
            <span className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#5433eb]">
              Index {product.performanceScore}/100
            </span>
          </div>

          <div className="js-detail-grid grid grid-cols-1 gap-3 sm:gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {specRows.map((spec) => (
              <div
                key={spec.label}
                className="js-spec-cell rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-4 sm:p-5"
              >
                <div className="text-[12px] tracking-[-0.017em] text-[#787574]">
                  {spec.label}
                </div>
                <div className="mt-2 text-[18px] sm:text-[20px] leading-tight tracking-[-0.05em] text-[#000000]">
                  {spec.value}
                </div>
                <div className="mt-1 text-[13px] tracking-[-0.014em] text-[#787574]">
                  {spec.note}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* User Ratings, Reviews & Threaded Comments */}
        <ProductReviewsSection
          product={product}
          onSummaryChange={setReviewSummary}
        />

        {/* Verified Signal Pairings Rail */}
        {recommendedPairings.length > 0 && (
          <section className="pt-4 space-y-6">
            <div className="js-pairing-header flex flex-wrap items-center justify-between gap-4 px-1">
              <div>
                <span className="text-[12px] tracking-[-0.017em] text-[#5433eb]">
                  Compatible pairings
                </span>
                <h2 className="mt-1 text-[24px] leading-none tracking-[-0.05em] text-[#000000]">
                  Verified Signal Chain matches
                </h2>
              </div>
              <button
                type="button"
                onClick={() => navigate('/chain-builder')}
                className="js-magnetic rounded-full bg-[#ffffff] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:text-[#5433eb] cursor-pointer transition-colors"
              >
                Open Signal Chain Lab
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:gap-5 md:grid-cols-3 justify-items-center max-w-[960px] mx-auto">
              {recommendedPairings.map((item) => (
                <div key={item.id} className="js-pairing-card w-full flex justify-center">
                  <ProductCard product={item} variant="light" />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Mobile Sticky Add-to-Bag Bar */}
      <div className="sm:hidden fixed bottom-[58px] inset-x-0 z-30 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#ebebeb] px-4 py-2.5 flex items-center justify-between gap-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-2.5 min-w-0">
          <img
            src={product.image}
            alt={product.name}
            className="h-10 w-10 rounded-[10px] bg-[#f2f4f5] p-1 object-contain shrink-0"
          />
          <div className="min-w-0">
            <div className="text-[12.5px] text-[#000000] truncate">{product.name}</div>
            <div className="text-[13px] font-medium text-[#5433eb]">{formatVND(product.price)}</div>
          </div>
        </div>
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={() => addToCart(product, 1)}
          className="shrink-0 rounded-full bg-[#5433eb] px-5 py-2.5 text-[12.5px] text-[#ffffff] shadow-[0_4px_16px_rgba(69,36,219,0.28)] cursor-pointer disabled:opacity-40"
        >
          {product.stock > 0 ? 'Add to bag' : 'Out of stock'}
        </button>
      </div>
    </div>
  );
};
