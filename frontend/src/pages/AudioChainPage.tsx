import React, { useEffect, useRef, useState } from 'react';
import { FrequencyResponseChart } from '../components/FrequencyResponseChart';
import { useStore } from '../context/StoreContext';
import { api, BuildCandidateEvaluation } from '../services/api';
import { BuildValidationResult, ComponentCategory, Product } from '../types';
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  extractSilkscreenTags,
  formatVND,
} from '../utils/format';

const EMPTY_VALIDATION: BuildValidationResult = {
  isCompatible: true,
  hasWarnings: false,
  estimatedSplDb: null,
  dampingFactor: null,
  outputPowerMw: null,
  requiredPowerMw: null,
  activeTermination: null,
  totalPrice: 0,
  selectedCount: 0,
  totalSlots: 4,
  completenessPercent: 0,
  performanceTier: 'UNCONFIGURED',
  averageScore: 0,
  issues: [],
  checks: [],
};
import {
  gsap,
  REDUCED_MOTION_QUERY,
  runScrambleTargets,
  SplitText,
  useGSAP,
  useMagneticButtons,
} from '../utils/gsapSetup';

export const AudioChainPage: React.FC = () => {
  const {
    presets,
    buildParts,
    assignBuildPart,
    removeBuildSlot,
    loadPresetIntoBuilder,
    clearBuild,
    deployRigToCart,
    navigate,
  } = useStore();
  const chainRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  // Refs for animated GSAP number counters
  const counterValsRef = useRef({
    price: 0,
    damping: 0,
    spl: 0,
    power: 0,
  });
  const priceDisplayRef = useRef<HTMLSpanElement>(null);
  const dampingDisplayRef = useRef<HTMLDivElement>(null);
  const splDisplayRef = useRef<HTMLDivElement>(null);
  const powerDisplayRef = useRef<HTMLDivElement>(null);

  const [pickingSlot, setPickingSlot] = useState<ComponentCategory | null>(null);
  const [strictFilter, setStrictFilter] = useState(true);
  const [pickerSearch, setPickerSearch] = useState('');
  const [validation, setValidation] =
    useState<BuildValidationResult>(EMPTY_VALIDATION);
  const [pickerCandidates, setPickerCandidates] = useState<
    BuildCandidateEvaluation[]
  >([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  // Validate active Signal Chain via Backend OOP CompatibilityService
  useEffect(() => {
    let cancelled = false;
    const slots: Partial<Record<ComponentCategory, string>> = {};
    for (const cat of CATEGORY_ORDER) {
      const part = buildParts[cat];
      if (part?.id) slots[cat] = part.id;
    }

    api
      .validateBuild(slots)
      .then((res) => {
        if (!cancelled) setValidation(res.validation);
      })
      .catch(() => {
        if (!cancelled) setValidation(EMPTY_VALIDATION);
      });

    return () => {
      cancelled = true;
    };
  }, [buildParts]);

  const activeTransducer = buildParts.IEM ?? buildParts.HEADPHONE;

  useMagneticButtons(chainRef, [validation.selectedCount]);

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

        const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
        if (split) {
          tl.from(
            split.words,
            { yPercent: 115, stagger: 0.05, duration: 0.75, ease: 'power3.out' },
            0
          );
        }
        tl.from(
          '.js-chain-slot',
          { y: 22, autoAlpha: 0, stagger: 0.07, duration: 0.5 },
          0.15
        ).from(
          '.js-chain-console',
          { x: 20, autoAlpha: 0, duration: 0.55 },
          '<0.15'
        );

        return () => split?.revert();
      });
      return () => mm.revert();
    },
    { scope: chainRef }
  );

  // Animated Number Counter + ScrambleText status on slot updates
  useGSAP(
    () => {
      const targetPrice = validation.totalPrice;
      const targetDamping = validation.dampingFactor ?? 0;
      const targetSpl = validation.estimatedSplDb ?? 0;
      const targetPower = validation.outputPowerMw ?? 0;

      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (context) => {
        if (context.conditions?.reduceMotion) {
          if (priceDisplayRef.current)
            priceDisplayRef.current.textContent = formatVND(targetPrice);
          if (dampingDisplayRef.current)
            dampingDisplayRef.current.textContent = targetDamping
              ? `${targetDamping}:1`
              : '—';
          if (splDisplayRef.current)
            splDisplayRef.current.textContent = targetSpl
              ? `${targetSpl} dB`
              : '—';
          if (powerDisplayRef.current)
            powerDisplayRef.current.textContent = targetPower
              ? `${targetPower} mW`
              : '—';
          return;
        }

        gsap.to(counterValsRef.current, {
          price: targetPrice,
          damping: targetDamping,
          spl: targetSpl,
          power: targetPower,
          duration: 0.6,
          ease: 'power2.out',
          overwrite: 'auto',
          onUpdate: () => {
            const c = counterValsRef.current;
            if (priceDisplayRef.current) {
              priceDisplayRef.current.textContent = formatVND(Math.round(c.price));
            }
            if (dampingDisplayRef.current) {
              dampingDisplayRef.current.textContent =
                targetDamping > 0 ? `${Math.round(c.damping)}:1` : '—';
            }
            if (splDisplayRef.current) {
              splDisplayRef.current.textContent =
                targetSpl > 0 ? `${Math.round(c.spl)} dB` : '—';
            }
            if (powerDisplayRef.current) {
              powerDisplayRef.current.textContent =
                targetPower > 0 ? `${Math.round(c.power)} mW` : '—';
            }
          },
        });

        runScrambleTargets(chainRef.current, '.js-chain-scramble');
      });
      return () => mm.revert();
    },
    {
      scope: chainRef,
      dependencies: [
        validation.totalPrice,
        validation.dampingFactor,
        validation.estimatedSplDb,
        validation.outputPowerMw,
        validation.isCompatible,
        validation.selectedCount,
      ],
    }
  );

  // Query MongoDB & evaluate candidate compatibility via Backend API
  useEffect(() => {
    if (!pickingSlot) {
      setPickerCandidates([]);
      return;
    }

    let cancelled = false;
    setLoadingCandidates(true);
    const timer = setTimeout(() => {
      const slots: Partial<Record<ComponentCategory, string>> = {};
      for (const cat of CATEGORY_ORDER) {
        if (cat === pickingSlot) continue;
        const part = buildParts[cat];
        if (part?.id) slots[cat] = part.id;
      }

      api
        .evaluateBuildCandidates({
          category: pickingSlot,
          slots,
          search: pickerSearch.trim() || undefined,
          strictOnly: strictFilter,
        })
        .then((res) => {
          if (!cancelled) {
            setPickerCandidates(res.candidates);
            setLoadingCandidates(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPickerCandidates([]);
            setLoadingCandidates(false);
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [pickingSlot, buildParts, pickerSearch, strictFilter]);

  const handleSelectCandidate = (product: Product) => {
    assignBuildPart(product);
    setPickingSlot(null);
    setPickerSearch('');
  };

  const statusText = !validation.isCompatible
    ? 'ELECTRICAL / PIN CONFLICT'
    : validation.hasWarnings
    ? 'SYNERGY ADVISORY'
    : validation.selectedCount > 0
    ? 'SIGNAL CHAIN VERIFIED'
    : 'AWAITING HARDWARE';

  return (
    <div ref={chainRef} className="w-full">
      {/* Dark Header */}
      <section className="border-b border-[#000000] bg-[#141414] text-[#ffffff] px-4 py-8 md:px-10 md:py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-[7px] w-[7px] rounded-full bg-[#e66f27]" />
              <span className="sl-label">SIGNAL PATH &amp; IMPEDANCE SYNERGY LAB</span>
            </div>
            <h1
              ref={titleRef}
              style={{ fontKerning: 'none' }}
              className="sl-display mt-3 text-[28px] sm:text-[58px]"
            >
              AUDIO CHAIN CONFIGURATOR
            </h1>
            <p className="sl-body mt-3 max-w-2xl text-[#8c8c8c]">
              Verifies transducer pin connectors (0.78mm 2-Pin vs MMCX), balanced 4.4mm / 3.5mm jack compatibility, 8:1 damping ratio, and planar drive headroom.
            </p>
          </div>

          <div className="flex items-center gap-2.5 overflow-x-auto no-scrollbar w-full sm:w-auto sm:flex-wrap pb-1 sm:pb-0">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => loadPresetIntoBuilder(preset)}
                className="js-magnetic sl-btn-dark shrink-0"
              >
                LOAD: {preset.name}
              </button>
            ))}
            {validation.selectedCount > 0 && (
              <button
                type="button"
                onClick={clearBuild}
                className="js-magnetic sl-btn-dark shrink-0 border-[#8c8c8c] text-[#8c8c8c]"
              >
                CLEAR CHAIN
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Main Builder Canvas (#f6f4f2 Pulp Cream) */}
      <section className="bg-[#f6f4f2] text-[#141414] px-4 py-8 md:px-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
          {/* Left 7 cols: 5 Hardware Slots */}
          <div className="lg:col-span-7 space-y-[15px]">
            {CATEGORY_ORDER.map((slotCategory) => {
              const selected = buildParts[slotCategory];
              const meta = CATEGORY_META[slotCategory];
              const hasError = validation.issues.some(
                (i) =>
                  i.severity === 'ERROR' &&
                  i.affectedCategories.includes(slotCategory)
              );

              return (
                <div
                  key={slotCategory}
                  className={`js-chain-slot border border-[#000000] p-4 sm:p-[24px] md:p-[30px] ${
                    hasError ? 'bg-[#e4e3e2]' : 'bg-[#ffffff]'
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4 min-w-0">
                      {selected ? (
                        <img
                          src={selected.image}
                          alt={selected.name}
                          onClick={() => navigate(`/product/${selected.id}`)}
                          className="h-16 w-16 shrink-0 cursor-pointer border border-[#000000] bg-[#ffffff] p-1 object-contain"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[#000000] bg-[#e4e3e2] sl-label text-[#8c8c8c]">
                          {meta.serial}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="sl-label text-[#8c8c8c]">
                            {meta.serial} // {meta.label}
                          </span>
                          {hasError && (
                            <span className="sl-label flex items-center gap-1 text-[#141414]">
                              <span className="h-[6px] w-[6px] rounded-full bg-[#e66f27]" />
                              <span>CONFLICT</span>
                            </span>
                          )}
                        </div>

                        {selected ? (
                          <>
                            <button
                              type="button"
                              onClick={() => navigate(`/product/${selected.id}`)}
                              className="sl-heading mt-1 block truncate text-left hover:underline cursor-pointer"
                            >
                              {selected.name}
                            </button>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {extractSilkscreenTags(selected).map((tag) => (
                                <span
                                  key={tag}
                                  className="sl-label text-[12px] border border-[#000000] px-2 py-0.5"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </>
                        ) : (
                          <p className="sl-body mt-1 text-[#232323]">
                            {meta.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-3 sm:gap-[15px] justify-between sm:justify-end w-full sm:w-auto border-t border-[#000000]/10 pt-3 sm:border-0 sm:pt-0">
                      {selected && (
                        <span className="sl-subheading">
                          {formatVND(selected.price)}
                        </span>
                      )}
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setPickingSlot(slotCategory)}
                          className="js-magnetic sl-btn-light"
                        >
                          {selected ? 'SWAP' : 'SELECT'}
                        </button>
                        {selected && (
                          <button
                            type="button"
                            onClick={() => removeBuildSlot(slotCategory)}
                            className="sl-label text-[#8c8c8c] hover:text-[#141414] cursor-pointer"
                          >
                            [X]
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Live Frequency Curve Preview if Transducer has FR */}
            {activeTransducer?.specs.frCurve && (
              <div className="border border-[#000000] bg-[#141414] text-[#ffffff] p-4 sm:p-[30px]">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-[#ffffff]/20 pb-3">
                  <span className="sl-label">
                    ACTIVE TRANSDUCER RESPONSE // {activeTransducer.name}
                  </span>
                  <span className="sl-label text-[#8c8c8c]">
                    {activeTransducer.specs.soundSignature?.toUpperCase()}
                  </span>
                </div>
                <FrequencyResponseChart
                  darkSurface
                  height={200}
                  traces={[
                    {
                      label: activeTransducer.name,
                      values: activeTransducer.specs.frCurve,
                      color: '#e66f27',
                    },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Right 5 cols: Electrical Synergy Diagnostics Console */}
          <aside className="lg:col-span-5">
            <div className="js-chain-console sticky top-[88px] border border-[#000000] bg-[#e4e3e2] p-5 sm:p-[30px] space-y-6">
              {/* Status Line */}
              <div className="border-b border-[#000000] pb-4">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-[8px] w-[8px] rounded-full ${
                      !validation.isCompatible || validation.hasWarnings
                        ? 'bg-[#e66f27]'
                        : 'bg-[#141414]'
                    }`}
                  />
                  <span
                    className="js-chain-scramble sl-heading"
                    data-scramble={statusText}
                  >
                    {statusText}
                  </span>
                </div>
                <div
                  className="js-chain-scramble sl-label mt-2 text-[#8c8c8c]"
                  data-scramble={`${validation.selectedCount} UNITS // ${validation.performanceTier}`}
                >
                  {validation.selectedCount} UNITS // {validation.performanceTier}
                </div>
              </div>

              {/* Animated Counter Readout Grid */}
              <div className="grid grid-cols-2 border-t border-l border-[#000000] bg-[#f6f4f2]">
                <div className="border-r border-b border-[#000000] p-4">
                  <div className="sl-label text-[12px] text-[#8c8c8c]">
                    DAMPING RATIO
                  </div>
                  <div ref={dampingDisplayRef} className="sl-subheading mt-1">
                    {validation.dampingFactor ? `${validation.dampingFactor}:1` : '—'}
                  </div>
                </div>
                <div className="border-r border-b border-[#000000] p-4">
                  <div className="sl-label text-[12px] text-[#8c8c8c]">
                    EST. PEAK SPL
                  </div>
                  <div ref={splDisplayRef} className="sl-subheading mt-1">
                    {validation.estimatedSplDb ? `${validation.estimatedSplDb} dB` : '—'}
                  </div>
                </div>
                <div className="border-r border-b border-[#000000] p-4">
                  <div className="sl-label text-[12px] text-[#8c8c8c]">
                    DAC OUTPUT
                  </div>
                  <div ref={powerDisplayRef} className="sl-subheading mt-1">
                    {validation.outputPowerMw ? `${validation.outputPowerMw} mW` : '—'}
                  </div>
                </div>
                <div className="border-r border-b border-[#000000] p-4">
                  <div className="sl-label text-[12px] text-[#8c8c8c]">
                    TERMINATION
                  </div>
                  <div
                    className="js-chain-scramble sl-label mt-2"
                    data-scramble={validation.activeTermination ?? 'UNSET'}
                  >
                    {validation.activeTermination ?? 'UNSET'}
                  </div>
                </div>
              </div>

              {/* Diagnostic Logs */}
              {validation.issues.length > 0 && (
                <div className="space-y-3">
                  <div className="sl-label text-[13px]">
                    DIAGNOSTIC LOGS ({validation.issues.length})
                  </div>
                  {validation.issues.map((issue) => (
                    <div
                      key={issue.id}
                      className={`border p-4 ${
                        issue.severity === 'ERROR'
                          ? 'border-[#000000] bg-[#141414] text-[#ffffff]'
                          : 'border-[#000000] bg-[#f6f4f2] text-[#141414]'
                      }`}
                    >
                      <div className="flex items-center gap-2 sl-label text-[13px]">
                        <span className="h-[6px] w-[6px] rounded-full bg-[#e66f27]" />
                        <span>{issue.title}</span>
                      </div>
                      <p className="sl-body mt-2 opacity-85">{issue.detail}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification Matrix */}
              <div className="border border-[#000000] bg-[#f6f4f2] p-4 space-y-2.5">
                <div className="sl-label text-[13px] text-[#8c8c8c]">
                  SYNERGY RULE MATRIX
                </div>
                {validation.checks.map((chk) => (
                  <div
                    key={chk.rule}
                    className="flex items-center justify-between gap-2 border-b border-[#000000]/15 pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="sl-label text-[13px]">{chk.rule}</span>
                    <span
                      className={`sl-label text-[12px] ${
                        chk.passed === false
                          ? 'underline decoration-[#e66f27]'
                          : 'text-[#232323]'
                      }`}
                    >
                      {chk.statusText}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Deploy */}
              <div className="border-t border-[#000000] pt-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="sl-label">TOTAL SYSTEM VALUE</span>
                  <span ref={priceDisplayRef} className="sl-subheading">
                    {formatVND(validation.totalPrice)}
                  </span>
                </div>
                <p className="sl-body text-[#232323]">
                  Active promo codes are fetched and validated from MongoDB during checkout.
                </p>
                <button
                  type="button"
                  disabled={validation.selectedCount === 0}
                  onClick={() => deployRigToCart(buildParts)}
                  className="js-magnetic sl-btn-light w-full bg-[#141414] text-[#ffffff]"
                >
                  DEPLOY {validation.selectedCount} UNITS TO CART
                </button>
              </div>
            </div>
          </aside>
        </div>
      </section>

      {/* Component Picker Modal */}
      {pickingSlot && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#000000]/75 p-0 sm:p-4"
          onClick={() => setPickingSlot(null)}
        >
          <div
            className="flex max-h-[88vh] w-full max-w-3xl flex-col rounded-t-[24px] sm:rounded-none border border-[#000000] bg-[#f6f4f2] text-[#141414] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#000000] px-4 sm:px-6 py-4">
              <div>
                <div className="sl-label text-[12px] text-[#8c8c8c]">
                  SLOT SELECTION // {CATEGORY_META[pickingSlot].serial}
                </div>
                <div className="sl-heading mt-1">
                  {CATEGORY_META[pickingSlot].label}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPickingSlot(null)}
                className="sl-btn-light"
              >
                CLOSE [X]
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3 sm:gap-[15px] border-b border-[#000000] bg-[#e4e3e2] px-4 sm:px-6 py-3">
              <input
                type="text"
                value={pickerSearch}
                onChange={(e) => setPickerSearch(e.target.value)}
                placeholder={`Filter ${pickingSlot}...`}
                className="flex-1 min-w-[160px] rounded-none border border-[#000000] bg-[#ffffff] px-3 py-2 sl-body focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setStrictFilter((v) => !v)}
                className={`sl-btn-light ${
                  strictFilter ? 'bg-[#141414] text-[#ffffff]' : ''
                }`}
              >
                {strictFilter ? 'COMPATIBLE ONLY: ON' : 'SHOW CONFLICTS: ON'}
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-[15px]">
              {loadingCandidates ? (
                <div className="border border-[#000000] bg-[#e4e3e2] p-8 text-center">
                  <p className="sl-body">Querying MongoDB &amp; checking electrical synergy...</p>
                </div>
              ) : pickerCandidates.length === 0 ? (
                <div className="border border-[#000000] bg-[#e4e3e2] p-8 text-center">
                  <p className="sl-body">
                    No compatible candidates under strict mode.
                  </p>
                  <button
                    type="button"
                    onClick={() => setStrictFilter(false)}
                    className="sl-btn-light mt-4"
                  >
                    SHOW ALL INCLUDING CONFLICTS
                  </button>
                </div>
              ) : (
                pickerCandidates.map(({ product, compat }) => (
                  <div
                    key={product.id}
                    className={`flex flex-col gap-4 border border-[#000000] p-4 sm:flex-row sm:items-center sm:justify-between ${
                      compat.compatible ? 'bg-[#ffffff]' : 'bg-[#e4e3e2]'
                    }`}
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="h-14 w-14 shrink-0 border border-[#000000] bg-[#ffffff] p-1 object-contain"
                      />
                      <div className="min-w-0">
                        <div className="sl-heading text-[18px] truncate">
                          {product.name}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {extractSilkscreenTags(product).map((t) => (
                            <span
                              key={t}
                              className="sl-label text-[11px] border border-[#000000] px-1.5 py-0.5"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                        {!compat.compatible && (
                          <div className="mt-2 flex items-center gap-1.5 sl-label text-[12px]">
                            <span className="h-[6px] w-[6px] rounded-full bg-[#e66f27]" />
                            <span>{compat.reason}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-4 justify-end">
                      <span className="sl-subheading">
                        {formatVND(product.price)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectCandidate(product)}
                        className="sl-btn-light"
                      >
                        {compat.compatible ? 'SELECT' : 'FORCE SELECT'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
