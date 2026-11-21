import React, { useRef } from 'react';
import { FrequencyResponseChart } from '../components/FrequencyResponseChart';
import { useStore } from '../context/StoreContext';
import { extractSilkscreenTags, formatVND } from '../utils/format';
import {
  gsap,
  REDUCED_MOTION_QUERY,
  SplitText,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

const TRACE_COLORS = ['#5433eb', '#000000', '#0ea5e9'];

export const ComparePage: React.FC = () => {
  const {
    products,
    compareProducts,
    toggleCompare,
    clearCompare,
    addToCart,
    assignBuildPart,
    navigate,
  } = useStore();
  const compareRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const quickIems = products.filter((p) => p.category === 'IEM').slice(0, 4);

  const frTraces = compareProducts
    .filter((p) => Array.isArray(p.specs.frCurve) && p.specs.frCurve.length > 0)
    .map((p, idx) => ({
      label: p.name,
      values: p.specs.frCurve!,
      color: TRACE_COLORS[idx] ?? '#000000',
    }));

  useMagneticButtons(compareRef, [compareProducts.length]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (context) => {
        if (context.conditions?.reduceMotion) return;
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
        return () => split?.revert();
      });
      return () => mm.revert();
    },
    { scope: compareRef }
  );

  useGSAP(
    () => {
      if (compareProducts.length === 0) return;
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (context) => {
        if (context.conditions?.reduceMotion) return;
        gsap.fromTo(
          '.js-compare-col',
          { y: 20, autoAlpha: 0 },
          {
            y: 0,
            autoAlpha: 1,
            stagger: 0.08,
            duration: 0.45,
            ease: 'power2.out',
            overwrite: 'auto',
          }
        );
      });
      return () => mm.revert();
    },
    { scope: compareRef, dependencies: [compareProducts.length] }
  );

  return (
    <div ref={compareRef} className="w-full bg-[#f2f4f5] text-[#000000] pb-20">
      <section className="px-3 sm:px-4 pt-6 sm:pt-8 pb-6 md:px-8">
        <div className="mx-auto max-w-[1440px] space-y-5 sm:space-y-6">
          {/* Header & Quick Toggle Card */}
          <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8 space-y-5 sm:space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#ebebeb] pb-4 sm:pb-5">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                  <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
                  <span>Acoustic comparison lab</span>
                </span>
                <h1
                  ref={titleRef}
                  style={{ fontKerning: 'none' }}
                  className="mt-3 text-[26px] sm:text-[48px] leading-none tracking-[-0.05em] text-[#000000]"
                >
                  Compare lab ({compareProducts.length}/3)
                </h1>
                <p className="mt-2.5 text-[14px] sm:text-[15px] tracking-[-0.031em] text-[#787574]">
                  Overlay frequency response curves (20Hz – 16kHz) and compare driver topology and electrical specs side by side.
                </p>
              </div>
              {compareProducts.length > 0 && (
                <button
                  type="button"
                  onClick={clearCompare}
                  className="js-magnetic rounded-full bg-[#f2f4f5] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
                >
                  Clear compare tray
                </button>
              )}
            </div>

            {/* Quick Toggle Strip */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center justify-between gap-3">
              <span className="text-[13px] tracking-[-0.014em] text-[#787574]">
                Quick-toggle featured IEMs:
              </span>
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full sm:w-auto sm:flex-wrap pb-1 sm:pb-0">
                {quickIems.map((item) => {
                  const active = compareProducts.some((c) => c.id === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleCompare(item.id)}
                      className={`js-magnetic shrink-0 rounded-full px-4 py-2 text-[12px] tracking-[-0.017em] cursor-pointer transition-colors ${
                        active
                          ? 'bg-[#5433eb] text-[#ffffff] shadow-[0_4px_16px_rgba(84,51,235,0.28)]'
                          : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                      }`}
                    >
                      {active ? `✓ ${item.name}` : `+ ${item.name}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {compareProducts.length === 0 ? (
            <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-10 sm:p-14 text-center space-y-4">
              <div className="text-[12px] tracking-[-0.017em] text-[#787574]">
                Compare tray is empty
              </div>
              <p className="text-[18px] sm:text-[20px] tracking-[-0.05em] text-[#000000]">
                Select up to 3 units from the catalog or quick-toggle above.
              </p>
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="js-magnetic rounded-full bg-[#5433eb] px-6 py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors mt-2"
              >
                Browse catalog
              </button>
            </div>
          ) : (
            <>
              {/* Overlaid FR Chart */}
              {frTraces.length > 0 && (
                <div className="shop-card rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-6 md:p-8">
                  <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-[#ebebeb] pb-4">
                    <span className="text-[18px] sm:text-[20px] leading-none tracking-[-0.05em] text-[#000000]">
                      Overlaid frequency response (20Hz – 16kHz)
                    </span>
                    <span className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574]">
                      Dashed curve = VDSF Target
                    </span>
                  </div>
                  <FrequencyResponseChart
                    darkSurface={false}
                    traces={frTraces}
                    height={280}
                  />
                </div>
              )}

              {/* Side-by-Side Rounded Comparison Cards */}
              <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-3 justify-items-center max-w-[1140px] mx-auto">
                {compareProducts.map((item) => (
                  <div
                    key={item.id}
                    className="js-compare-col shop-card flex flex-col justify-between rounded-[22px] sm:rounded-[28px] bg-[#ffffff] p-4 sm:p-5 max-w-[360px] mx-auto w-full text-center"
                  >
                    <div>
                      <div className="flex items-center justify-between px-1">
                        <span className="text-[11px] tracking-[-0.017em] text-[#787574]">
                          {item.sku}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleCompare(item.id)}
                          className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[11px] tracking-[-0.017em] text-[#787574] hover:text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      </div>

                      <div
                        onClick={() => navigate(`/product/${item.id}`)}
                        className="mt-3 h-[190px] w-full cursor-pointer rounded-[20px] bg-[#f2f4f5]/75 p-4 flex items-center justify-center group"
                      >
                        <img
                          src={item.image}
                          alt={item.name}
                          className="mx-auto max-h-[145px] max-w-[145px] object-contain transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => navigate(`/product/${item.id}`)}
                        className="mt-4 block w-full text-center text-[18px] leading-[1.2] tracking-[-0.05em] text-[#000000] hover:text-[#5433eb] cursor-pointer"
                      >
                        {item.name}
                      </button>

                      <div className="mt-4 divide-y divide-[#ebebeb] border-y border-[#ebebeb] text-left">
                        <div className="flex justify-between py-2.5 text-[13px] tracking-[-0.014em]">
                          <span className="text-[#787574]">Price</span>
                          <span className="text-[#000000]">{formatVND(item.price)}</span>
                        </div>
                        <div className="flex justify-between py-2.5 text-[13px] tracking-[-0.014em]">
                          <span className="text-[#787574]">Acoustic index</span>
                          <span className="text-[#5433eb]">{item.performanceScore}/100</span>
                        </div>
                        <div className="flex justify-between py-2.5 text-[13px] tracking-[-0.014em]">
                          <span className="text-[#787574]">Impedance</span>
                          <span className="text-[#000000]">
                            {item.specs.impedanceOhms
                              ? `${item.specs.impedanceOhms} Ω`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2.5 text-[13px] tracking-[-0.014em]">
                          <span className="text-[#787574]">Sensitivity / Power</span>
                          <span className="text-[#000000]">
                            {item.specs.sensitivityDb
                              ? `${item.specs.sensitivityDb} dB`
                              : item.specs.outputPowerMw
                              ? `${item.specs.outputPowerMw} mW`
                              : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between py-2.5 text-[13px] tracking-[-0.014em]">
                          <span className="text-[#787574]">Terminal</span>
                          <span className="text-[#000000]">
                            {item.specs.pinType ?? item.specs.plugType ?? 'Universal'}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex flex-wrap justify-center gap-1.5">
                        {extractSilkscreenTags(item).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[#f2f4f5] px-2.5 py-0.5 text-[11px] tracking-[-0.017em] text-[#787574]"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => addToCart(item, 1)}
                        className="js-magnetic flex-1 rounded-full bg-[#5433eb] py-2.5 px-4 text-[13px] tracking-[-0.014em] text-[#ffffff] hover:bg-[#4524db] cursor-pointer transition-colors"
                      >
                        Add to bag
                      </button>
                      <button
                        type="button"
                        onClick={() => assignBuildPart(item)}
                        className="js-magnetic rounded-full bg-[#f2f4f5] py-2.5 px-4 text-[13px] tracking-[-0.014em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
                      >
                        + Chain
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
};
