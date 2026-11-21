import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from '../context/StoreContext';
import { Product } from '../types';
import { extractSilkscreenTags, formatVND } from '../utils/format';

interface ProductCardProps {
  product: Product;
  variant?: 'light' | 'dark';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  variant = 'light',
}) => {
  const {
    navigate,
    addToCart,
    assignBuildPart,
    buildParts,
    compareIds,
    toggleCompare,
  } = useStore();

  const [activeImgIdx, setActiveImgIdx] = useState(0);

  useEffect(() => {
    setActiveImgIdx(0);
  }, [product.id]);

  const allImages = useMemo(
    () =>
      Array.from(
        new Set([product.image, ...(product.gallery ?? [])].filter(Boolean))
      ),
    [product.image, product.gallery]
  );

  const currentImage = allImages[activeImgIdx] ?? product.image;
  const tags = extractSilkscreenTags(product);
  const isSlotted = buildParts[product.category]?.id === product.id;
  const isComparing = compareIds.includes(product.id);
  const isDark = variant === 'dark';

  const isWidePreview =
    /(slider|banner|home|pc|pill-f|pudding-sl|solis2\.jpg|sparxie\.jpg|speaker-h)/i.test(
      currentImage
    );

  // Shop.md Brand Spotlight Card: Dark variant for slate-ink contrast or crisp White (#ffffff) 28px radius w/ dual-layer shadow
  return (
    <article
      className={`mx-auto flex w-full max-w-none sm:max-w-[290px] flex-col justify-between rounded-[20px] sm:rounded-[28px] p-2 sm:p-2.5 transition-transform duration-200 hover:-translate-y-1 ${
        isDark
          ? 'bg-[#332f2d] text-[#ffffff]'
          : 'bg-[#ffffff] text-[#000000]'
      }`}
      style={{
        boxShadow:
          'rgba(0, 0, 0, 0.1) 0px 4px 6px -1px, rgba(0, 0, 0, 0.1) 0px 2px 4px -2px',
      }}
    >
      <div>
        {/* 20px Inner Image Frame */}
        <div
          onClick={() => navigate(`/product/${product.id}`)}
          className={`relative aspect-square w-full cursor-pointer overflow-hidden rounded-[14px] sm:rounded-[20px] flex items-center justify-center group ${
            isWidePreview ? 'bg-[#332f2d] p-1.5 sm:p-2' : 'bg-[#f2f4f5]/75 p-2.5 sm:p-4'
          }`}
        >
          <img
            src={currentImage}
            alt={product.name}
            loading="lazy"
            className="max-h-full max-w-full object-contain transition-transform duration-300 group-hover:scale-105"
          />

          {/* Subtle top-left badge pill */}
          {(product.specs.isNewRelease || allImages.length > 1) && (
            <div className="absolute left-2 top-2 sm:left-2.5 sm:top-2.5 flex items-center gap-1">
              {product.specs.isNewRelease && (
                <span className="rounded-full bg-[#5433eb] px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-[#ffffff]">
                  New
                </span>
              )}
              {allImages.length > 1 && (
                <span className="rounded-full bg-[#ffffff]/90 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
                  {allImages.length} photos
                </span>
              )}
            </div>
          )}
        </div>

        {/* Mini Product Thumbnail Strip */}
        {allImages.length > 1 && (
          <div className="mt-1.5 sm:mt-2 flex items-center justify-center gap-[2px] px-0.5 sm:px-1">
            {allImages.slice(0, 4).map((imgUrl, idx) => {
              const isSelected = idx === activeImgIdx;
              return (
                <button
                  key={imgUrl}
                  type="button"
                  onMouseEnter={() => setActiveImgIdx(idx)}
                  onClick={() => setActiveImgIdx(idx)}
                  aria-label={`View angle ${idx + 1} of ${product.name}`}
                  className={`h-8 w-8 sm:h-11 sm:w-11 shrink-0 overflow-hidden rounded-[8px] sm:rounded-[12px] bg-[#f2f4f5] cursor-pointer transition-opacity ${
                    isSelected
                      ? 'opacity-100 ring-1 ring-[#5433eb]'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-contain p-0.5"
                  />
                </button>
              );
            })}
          </div>
        )}

        {/* Metadata Block */}
        <div className="px-1 sm:px-2 pt-2 sm:pt-3 pb-1 text-center space-y-1 sm:space-y-1.5">
          <button
            type="button"
            onClick={() => navigate(`/product/${product.id}`)}
            className={`block w-full text-center text-[12.5px] sm:text-[14px] leading-[1.25] tracking-[-0.014em] line-clamp-1 cursor-pointer hover:text-[#5433eb] ${
              isDark ? 'text-[#ffffff]' : 'text-[#000000]'
            }`}
          >
            {product.name}
          </button>

          {/* 5-Star Rating Row */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 text-[9px] leading-none tracking-[-0.058em]">
            <span>
              <span className="text-[#5433eb]">
                {'★'.repeat(Math.max(0, Math.min(5, Math.round(product.rating))))}
              </span>
              <span className={isDark ? 'text-[#787574]' : 'text-[#d4d4d8]'}>
                {'☆'.repeat(
                  5 - Math.max(0, Math.min(5, Math.round(product.rating)))
                )}
              </span>
            </span>
            <span className={isDark ? 'text-[#cccccc]' : 'text-[#787574]'}>
              {product.rating.toFixed(1)} ({product.reviewCount}) ·{' '}
              {product.category.replace('_', '/')}
            </span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-0.5">
            <span
              className={`text-[12.5px] sm:text-[14px] tracking-[-0.014em] ${
                isDark ? 'text-[#ffffff]' : 'text-[#000000]'
              }`}
            >
              {formatVND(product.price)}
            </span>
            {tags[0] && (
              <span
                className={`hidden sm:inline-block rounded-full px-2 py-0.5 text-[10px] tracking-[-0.017em] ${
                  isDark
                    ? 'bg-[#000000]/40 text-[#cccccc]'
                    : 'bg-[#f2f4f5] text-[#787574]'
                }`}
              >
                {tags[0]}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Pillow-Soft Pill Actions */}
      <div className="px-1 sm:px-2 pt-2 sm:pt-2.5 pb-0.5 sm:pb-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={product.stock <= 0}
          onClick={() => addToCart(product, 1)}
          className={`js-magnetic w-full sm:flex-1 rounded-full py-1.5 sm:py-2 px-2.5 sm:px-3 text-[11.5px] sm:text-[12px] tracking-[-0.017em] cursor-pointer transition-colors disabled:opacity-40 ${
            isDark
              ? 'bg-[#ffffff] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff]'
              : 'bg-[#000000] text-[#ffffff] hover:bg-[#5433eb]'
          }`}
        >
          {product.stock > 0 ? 'Add to bag' : 'Sold out'}
        </button>

        <div className="flex items-center gap-1 sm:contents">
          <button
            type="button"
            onClick={() => assignBuildPart(product)}
            className={`js-magnetic flex-1 sm:flex-initial rounded-full py-1.5 sm:py-2 px-2 sm:px-2.5 text-[10.5px] sm:text-[11px] tracking-[-0.017em] border cursor-pointer transition-colors ${
              isSlotted
                ? 'bg-[#5433eb] border-[#5433eb] text-[#ffffff]'
                : isDark
                  ? 'border-[#ffffff]/25 text-[#ffffff] hover:bg-[#ffffff] hover:text-[#000000]'
                  : 'border-[#ebebeb] bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#f2f4f5]'
            }`}
            title="Add to Signal Chain"
          >
            {isSlotted ? 'In chain' : '+ Chain'}
          </button>

          <button
            type="button"
            onClick={() => toggleCompare(product.id)}
            className={`js-magnetic flex-1 sm:flex-initial rounded-full py-1.5 sm:py-2 px-2 sm:px-2.5 text-[10.5px] sm:text-[11px] tracking-[-0.017em] border cursor-pointer transition-colors ${
              isComparing
                ? 'bg-[#5433eb] border-[#5433eb] text-[#ffffff]'
                : isDark
                  ? 'border-[#ffffff]/25 text-[#ffffff] hover:bg-[#ffffff] hover:text-[#000000]'
                  : 'border-[#ebebeb] bg-[#ffffff] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#f2f4f5]'
            }`}
            title="Compare FR Curve"
          >
            {isComparing ? 'Cmp ✓' : 'Cmp'}
          </button>
        </div>
      </div>
    </article>
  );
};
