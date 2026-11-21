import React, { useRef } from 'react';
import { gsap, REDUCED_MOTION_QUERY, useGSAP } from '../utils/gsapSetup';

export interface FrTrace {
  label: string;
  values: number[];
  color: string;
  dashed?: boolean;
}

const FREQ_LABELS = ['20', '60', '150', '400', '1K', '2.5K', '4.5K', '8K', '16K'];
const FREQ_HZ = [20, 60, 150, 400, 1000, 2500, 4500, 8000, 16000];
export const VDSF_BASELINE = [67, 66, 63, 60, 60, 69, 67, 63, 58];

interface FrequencyResponseChartProps {
  traces: FrTrace[];
  showVdsfTarget?: boolean;
  darkSurface?: boolean;
  height?: number;
}

function interpolateTraceAtRatio(values: number[], ratio: number): number {
  const clamped = Math.max(0, Math.min(1, ratio));
  const scaled = clamped * (values.length - 1);
  const lo = Math.floor(scaled);
  const hi = Math.min(values.length - 1, lo + 1);
  const t = scaled - lo;
  return values[lo] * (1 - t) + values[hi] * t;
}

function formatHz(hz: number): string {
  if (hz >= 1000) {
    return `${(hz / 1000).toFixed(1).replace(/\.0$/, '')}KHZ`;
  }
  return `${Math.round(hz)}HZ`;
}

export const FrequencyResponseChart: React.FC<FrequencyResponseChartProps> = ({
  traces,
  showVdsfTarget = true,
  darkSurface = true,
  height = 240,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const crosshairGroupRef = useRef<SVGGElement>(null);
  const vLineRef = useRef<SVGLineElement>(null);
  const hLineRef = useRef<SVGLineElement>(null);
  const dotRef = useRef<SVGCircleElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);

  const width = 640;
  const padLeft = 46;
  const padRight = 24;
  const padTop = 20;
  const padBottom = 34;

  const plotW = width - padLeft - padRight;
  const plotH = height - padTop - padBottom;

  const minDb = 50;
  const maxDb = 78;

  const xPos = (idx: number) =>
    padLeft + (idx / (FREQ_LABELS.length - 1)) * plotW;

  const yPos = (db: number) => {
    const clamped = Math.max(minDb, Math.min(maxDb, db));
    return padTop + ((maxDb - clamped) / (maxDb - minDb)) * plotH;
  };

  const buildPath = (vals: number[]) =>
    vals
      .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xPos(i).toFixed(1)} ${yPos(v).toFixed(1)}`)
      .join(' ');

  const gridStroke = darkSurface ? 'rgba(255,255,255,0.14)' : '#ebebeb';
  const labelColor = darkSurface ? 'rgba(255,255,255,0.68)' : '#787574';

  const allTraces: FrTrace[] = showVdsfTarget
    ? [
        {
          label: 'VDSF Target',
          values: VDSF_BASELINE,
          color: darkSurface ? '#cccccc' : '#787574',
          dashed: true,
        },
        ...traces,
      ]
    : traces;

  const primaryTrace = traces[0] ?? allTraces[0];
  const traceSignature = allTraces
    .map((t) => `${t.label}:${t.values.join(',')}`)
    .join('|');

  useGSAP(
    (_context, contextSafe) => {
      const mm = gsap.matchMedia();
      mm.add({ reduceMotion: REDUCED_MOTION_QUERY }, (ctx) => {
        if (!ctx.conditions?.reduceMotion) {
          const paths = gsap.utils.toArray<SVGPathElement>(
            '.js-fr-path',
            chartRef.current ?? undefined
          );

          paths.forEach((path, idx) => {
            if (path.dataset.dashed === 'true') {
              gsap.fromTo(
                path,
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 0.45, ease: 'power2.out' }
              );
              return;
            }
            gsap.fromTo(
              path,
              { drawSVG: '0% 0%', autoAlpha: 1 },
              {
                drawSVG: '0% 100%',
                duration: 0.95,
                delay: idx * 0.1,
                ease: 'power2.out',
              }
            );
          });

          gsap.fromTo(
            '.js-fr-legend',
            { y: 8, autoAlpha: 0 },
            {
              y: 0,
              autoAlpha: 1,
              duration: 0.4,
              stagger: 0.08,
              ease: 'power2.out',
              overwrite: 'auto',
            }
          );
        }
      });

      // Interactive SVG Crosshair via gsap.quickTo (runs smoothly at 60fps without React re-renders)
      const svgEl = svgRef.current;
      const groupEl = crosshairGroupRef.current;
      const vLine = vLineRef.current;
      const hLine = hLineRef.current;
      const dot = dotRef.current;

      if (svgEl && groupEl && vLine && hLine && dot && primaryTrace && contextSafe) {
        const vxTo = gsap.quickTo(vLine, 'x', { duration: 0.14, ease: 'power2.out' });
        const hyTo = gsap.quickTo(hLine, 'y', { duration: 0.14, ease: 'power2.out' });
        const dotXTo = gsap.quickTo(dot, 'x', { duration: 0.14, ease: 'power2.out' });
        const dotYTo = gsap.quickTo(dot, 'y', { duration: 0.14, ease: 'power2.out' });

        const onPointerMove = contextSafe((e: PointerEvent) => {
          const rect = svgEl.getBoundingClientRect();
          if (!rect.width) return;

          const svgX = ((e.clientX - rect.left) / rect.width) * width;
          const clampedX = Math.max(padLeft, Math.min(width - padRight, svgX));
          const ratio = (clampedX - padLeft) / plotW;

          const measuredDb = interpolateTraceAtRatio(primaryTrace.values, ratio);
          const vdsfDb = interpolateTraceAtRatio(VDSF_BASELINE, ratio);
          const deltaDb = measuredDb - vdsfDb;

          // Log-frequency interpolation for display readout
          const logMin = Math.log10(FREQ_HZ[0]);
          const logMax = Math.log10(FREQ_HZ[FREQ_HZ.length - 1]);
          const freqHz = Math.pow(10, logMin + ratio * (logMax - logMin));

          const svgY = yPos(measuredDb);

          gsap.to(groupEl, { autoAlpha: 1, duration: 0.15, overwrite: 'auto' });
          vxTo(clampedX);
          hyTo(svgY);
          dotXTo(clampedX);
          dotYTo(svgY);

          if (readoutRef.current) {
            const sign = deltaDb >= 0 ? '+' : '';
            readoutRef.current.textContent = `Probe · ${formatHz(freqHz)} · ${measuredDb.toFixed(
              1
            )} dB · VDSF ${vdsfDb.toFixed(1)} dB (${sign}${deltaDb.toFixed(1)} dB)`;
          }
        });

        const onPointerLeave = contextSafe(() => {
          gsap.to(groupEl, { autoAlpha: 0, duration: 0.2, overwrite: 'auto' });
          if (readoutRef.current) {
            readoutRef.current.textContent =
              'Hover graph to inspect frequency & VDSF delta';
          }
        });

        svgEl.addEventListener('pointermove', onPointerMove);
        svgEl.addEventListener('pointerleave', onPointerLeave);

        return () => {
          svgEl.removeEventListener('pointermove', onPointerMove);
          svgEl.removeEventListener('pointerleave', onPointerLeave);
          mm.revert();
        };
      }

      return () => mm.revert();
    },
    { scope: chartRef, dependencies: [traceSignature], revertOnUpdate: true }
  );

  return (
    <div ref={chartRef} className="w-full">
      <div
        ref={readoutRef}
        className={`mb-2.5 flex items-center justify-between text-[11px] sm:text-[12px] leading-snug tracking-[-0.017em] ${
          darkSurface ? 'text-[#cccccc]' : 'text-[#787574]'
        }`}
      >
        Hover graph to inspect frequency &amp; VDSF delta
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto block cursor-crosshair select-none touch-pan-y"
        role="img"
        aria-label="Interactive Frequency Response Graph 20Hz to 16kHz"
      >
        {/* Horizontal dB Grid */}
        {[55, 60, 65, 70, 75].map((db) => (
          <g key={db}>
            <line
              x1={padLeft}
              y1={yPos(db)}
              x2={width - padRight}
              y2={yPos(db)}
              stroke={gridStroke}
              strokeWidth="1"
            />
            <text
              x={padLeft - 8}
              y={yPos(db) + 4}
              textAnchor="end"
              fill={labelColor}
              style={{
                fontFamily: 'var(--font-sl-condensed)',
                fontSize: '11px',
                letterSpacing: '0.08em',
              }}
            >
              {db}DB
            </text>
          </g>
        ))}

        {/* Vertical Frequency Grid */}
        {FREQ_LABELS.map((freq, idx) => (
          <g key={freq}>
            <line
              x1={xPos(idx)}
              y1={padTop}
              x2={xPos(idx)}
              y2={height - padBottom}
              stroke={gridStroke}
              strokeWidth="1"
            />
            <text
              x={xPos(idx)}
              y={height - 10}
              textAnchor="middle"
              fill={labelColor}
              style={{
                fontFamily: 'var(--font-sl-condensed)',
                fontSize: '11px',
                letterSpacing: '0.08em',
              }}
            >
              {freq}HZ
            </text>
          </g>
        ))}

        {/* Outer Calibration Box */}
        <rect
          x={padLeft}
          y={padTop}
          width={plotW}
          height={plotH}
          rx={12}
          fill="none"
          stroke={darkSurface ? 'rgba(255,255,255,0.22)' : '#ebebeb'}
          strokeWidth="1"
        />

        {/* FR Curves */}
        {allTraces.map((trace) => (
          <path
            key={trace.label}
            className="js-fr-path"
            data-dashed={trace.dashed ? 'true' : 'false'}
            d={buildPath(trace.values)}
            fill="none"
            stroke={trace.color}
            strokeWidth={trace.dashed ? '1.25' : '2.25'}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={trace.dashed ? '5 4' : undefined}
          />
        ))}

        {/* Interactive Laser Crosshair Overlay */}
        <g
          ref={crosshairGroupRef}
          style={{ opacity: 0, pointerEvents: 'none' }}
        >
          <line
            ref={vLineRef}
            x1={0}
            y1={padTop}
            x2={0}
            y2={height - padBottom}
            stroke="#5433eb"
            strokeWidth="1.25"
            strokeDasharray="3 3"
          />
          <line
            ref={hLineRef}
            x1={padLeft}
            y1={0}
            x2={width - padRight}
            y2={0}
            stroke={darkSurface ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.25)'}
            strokeWidth="1"
            strokeDasharray="3 3"
          />
          <circle
            ref={dotRef}
            cx={0}
            cy={0}
            r="5"
            fill="#5433eb"
            stroke="#ffffff"
            strokeWidth="2"
          />
        </g>
      </svg>

      {/* Legend Strip */}
      <div className="mt-3 flex flex-wrap items-center gap-5">
        {allTraces.map((trace) => (
          <div key={trace.label} className="js-fr-legend flex items-center gap-2">
            <span
              className="inline-block h-[2.5px] w-5 rounded-full"
              style={{
                backgroundColor: trace.dashed ? 'transparent' : trace.color,
                borderTop: trace.dashed ? `1.5px dashed ${trace.color}` : undefined,
              }}
            />
            <span
              className={`text-[12px] tracking-[-0.017em] ${
                darkSurface ? 'text-[#ffffff]' : 'text-[#000000]'
              }`}
            >
              {trace.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
