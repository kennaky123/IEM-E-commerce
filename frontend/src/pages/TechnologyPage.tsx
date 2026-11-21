import React, { useMemo, useRef } from 'react';
import { FrequencyResponseChart } from '../components/FrequencyResponseChart';
import { useStore } from '../context/StoreContext';
import {
  gsap,
  REDUCED_MOTION_QUERY,
  runScrambleTargets,
  ScrollTrigger,
  SplitText,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

export const TechnologyPage: React.FC = () => {
  const { products, navigate } = useStore();
  const techRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pillarSectionRef = useRef<HTMLElement>(null);
  const pillarTrackRef = useRef<HTMLDivElement>(null);

  const pillars = useMemo(() => {
    const withRichMedia = [...products]
      .filter((p) => Array.isArray(p.gallery) && p.gallery.length > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore);

    const picks: typeof products = [];
    const seenCats = new Set<string>();
    for (const p of withRichMedia) {
      if (!seenCats.has(p.category) && picks.length < 4) {
        picks.push(p);
        seenCats.add(p.category);
      }
    }
    for (const p of withRichMedia) {
      if (picks.length >= 4) break;
      if (!picks.some((x) => x.id === p.id)) picks.push(p);
    }

    return picks.map((p, idx) => ({
      productId: p.id,
      code: `0${idx + 1} · ${p.sku}`,
      title: p.specs.driverConfig ?? p.specs.dacChip ?? p.name,
      image: p.gallery?.[0] ?? p.image,
      body: p.longDescription ?? p.summary,
      spec:
        p.specs.frequencyRange ??
        p.specs.thdPlusN ??
        `${p.category.replace('_', '/')} · ${p.performanceScore}/100`,
    }));
  }, [products]);

  const frComparePair = useMemo(() => {
    const withFr = [...products]
      .filter((p) => Array.isArray(p.specs.frCurve) && p.specs.frCurve.length > 0)
      .sort((a, b) => b.performanceScore - a.performanceScore);
    const primary = withFr[0];
    const secondary =
      withFr.find(
        (p) =>
          p.id !== primary?.id &&
          p.specs.soundSignature !== primary?.specs.soundSignature
      ) ?? withFr[1];
    return [primary, secondary].filter(Boolean) as typeof products;
  }, [products]);

  useMagneticButtons(techRef, [products.length]);

  useGSAP(
    () => {
      if (products.length === 0) return;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (context) => {
        if (context.conditions?.reduceMotion) return;

          const split = titleRef.current
            ? SplitText.create(titleRef.current, {
                type: 'words,lines',
                mask: 'lines',
              })
            : null;

          const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
          tl.from('.js-tech-meta', { y: -12, autoAlpha: 0, duration: 0.5 });

          if (split) {
            tl.from(
              split.words,
              { yPercent: 115, stagger: 0.045, duration: 0.8 },
              '<0.08'
            );
          }

          tl.from(
            '.js-tech-sub',
            { y: 20, autoAlpha: 0, duration: 0.6 },
            '<0.25'
          ).from(
            '.js-tech-btn',
            { y: 14, autoAlpha: 0, stagger: 0.08, duration: 0.45 },
            '<0.15'
          );

          runScrambleTargets(techRef.current, '.js-scramble');

          ScrollTrigger.refresh();
          return () => split?.revert();
        }
      );

      return () => mm.revert();
    },
    { scope: techRef, dependencies: [products.length], revertOnUpdate: true }
  );

  return (
    <div ref={techRef} className="w-full bg-[#f2f4f5] text-[#000000] pb-20">
      {/* Light Elevated Research Hero Card */}
      <section className="px-3 sm:px-4 pt-6 sm:pt-8 pb-6 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] px-4 py-9 sm:px-6 md:px-12 md:py-16 text-center flex flex-col items-center">
            <div className="js-tech-meta inline-flex items-center justify-center gap-2 rounded-full bg-[#f2f4f5] px-4 py-1.5 text-[12px] tracking-[-0.017em] text-[#787574]">
              <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
              <span
                className="js-scramble"
                data-scramble="Acoustic research monograph"
              >
                Acoustic research monograph
              </span>
            </div>

            <h1
              ref={titleRef}
              style={{ fontKerning: 'none' }}
              className="mt-5 text-[28px] sm:text-[58px] leading-[1.02] tracking-[-0.05em] text-[#000000] max-w-4xl"
            >
              VDSF Target &amp; Transducer Physics
            </h1>

            <p className="js-tech-sub mt-4 sm:mt-5 max-w-3xl text-[14px] sm:text-[16px] leading-[1.5] tracking-[-0.031em] text-[#787574]">
              Virtual Diffuse Sound Field tuning aligns ear-canal pinna compensation with B&amp;K 5128 acoustic measurements to reconstruct loudspeaker spatial accuracy inside a compact IEM chamber.
            </p>

            <div className="mt-6 sm:mt-8 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => navigate('/products?category=IEM')}
                className="js-tech-btn js-magnetic rounded-full bg-[#5433eb] px-6 py-3 text-[13.5px] sm:text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors"
              >
                Explore VDSF monitors
              </button>
              <button
                type="button"
                onClick={() => navigate('/chain-builder')}
                className="js-tech-btn js-magnetic rounded-full bg-[#f2f4f5] px-6 py-3 text-[13.5px] sm:text-[14px] tracking-[-0.014em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
              >
                Open Signal Chain Lab
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Four Acoustic Pillars */}
      <section
        ref={pillarSectionRef}
        className="w-full px-3 sm:px-4 pt-6 sm:pt-10 pb-8 sm:pb-10 md:px-8"
      >
        <div className="mx-auto max-w-[1440px]">
          <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-8 lg:p-10 pb-6 sm:pb-10">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebebeb] pb-4">
              <div>
                <span className="text-[12px] tracking-[-0.017em] text-[#5433eb] font-medium">
                  Four acoustic pillars
                </span>
                <h2 className="mt-1.5 text-[24px] leading-tight tracking-[-0.05em] text-[#000000]">
                  Transducer topology, flux circuits, and decoding stages
                </h2>
              </div>
              <span className="rounded-full bg-[#f2f4f5] px-3.5 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                IEC61094 Standard
              </span>
            </div>

            <div
              ref={pillarTrackRef}
              className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 items-stretch"
            >
              {pillars.map((pillar) => (
                <div
                  key={pillar.code}
                  onClick={() => navigate(`/product/${pillar.productId}`)}
                  className="cursor-pointer flex flex-col justify-between rounded-[24px] bg-[#f8f9fa] border border-[#ebebeb]/80 p-4 sm:p-5 text-center transition-all duration-300 hover:shadow-lg hover:-translate-y-1 w-full"
                >
                  <div className="flex flex-col items-center">
                    <div className="aspect-[16/10] w-full overflow-hidden rounded-[18px] bg-[#ffffff] border border-[#ebebeb]/70 flex items-center justify-center p-3 shadow-xs">
                      <img
                        src={pillar.image}
                        alt={pillar.title}
                        className="mx-auto max-h-full max-w-full object-contain"
                      />
                    </div>
                    <div className="px-1 pt-4 pb-2 flex flex-col items-center text-center">
                      <span className="rounded-full bg-[#ffffff] border border-[#ebebeb]/60 px-3 py-0.5 text-[11px] tracking-[-0.017em] text-[#5433eb] shadow-[0_2px_6px_rgba(0,0,0,0.04)] font-medium">
                        {pillar.code}
                      </span>
                      <h3 className="text-[16px] leading-[1.25] tracking-[-0.04em] text-[#000000] font-medium mt-2.5">
                        {pillar.title}
                      </h3>
                      <p className="text-[13px] leading-[1.45] tracking-[-0.014em] mt-2 text-[#787574] line-clamp-3">
                        {pillar.body}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-[14px] bg-[#ffffff] border border-[#ebebeb]/60 px-3 py-2 flex items-center justify-center gap-2 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#5433eb] shrink-0" />
                    <span className="text-[11px] tracking-[-0.017em] text-[#000000] truncate">
                      {pillar.spec}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Target Curve Overlay Comparison */}
      <section className="px-3 sm:px-4 py-6 md:px-8">
        <div className="mx-auto max-w-[1440px] shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-10">
          <div className="grid grid-cols-1 gap-6 sm:gap-8 lg:grid-cols-12 items-center">
            <div className="lg:col-span-5 space-y-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                <span>Target curve overlay</span>
              </span>
              <h2 className="text-[24px] sm:text-[28px] leading-[1.15] tracking-[-0.05em] text-[#000000]">
                Comparing {frComparePair[0]?.name ?? 'Primary Reference'} against{' '}
                {frComparePair[1]?.name ?? 'Secondary Target'}
              </h2>
              <p className="text-[14px] sm:text-[15px] leading-[1.5] tracking-[-0.031em] text-[#787574]">
                Live frequency traces queried from MongoDB B&amp;K 5128 measurements highlight pinna gain contour and sub-bass shelf balance.
              </p>
              <button
                type="button"
                onClick={() => navigate('/compare')}
                className="js-magnetic rounded-full bg-[#000000] px-6 py-3 text-[13px] tracking-[-0.014em] text-[#ffffff] hover:bg-[#5433eb] cursor-pointer transition-colors"
              >
                Open interactive FR compare
              </button>
            </div>

            <div className="lg:col-span-7 rounded-[18px] sm:rounded-[20px] bg-[#f2f4f5] p-3.5 sm:p-5 md:p-6">
              <FrequencyResponseChart
                darkSurface={false}
                traces={frComparePair
                  .filter((p) => Array.isArray(p.specs.frCurve))
                  .map((p, idx) => ({
                    label: `${p.name} (${p.specs.soundSignature ?? 'FR'})`,
                    values: p.specs.frCurve!,
                    color: idx === 0 ? '#5433eb' : '#000000',
                  }))}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
