import React from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin';
import { Flip } from 'gsap/Flip';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(
  useGSAP,
  ScrollTrigger,
  SplitText,
  ScrambleTextPlugin,
  Flip,
  DrawSVGPlugin
);

gsap.defaults({
  ease: 'power2.out',
  duration: 0.6,
});

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export function runScrambleTargets(
  scopeEl: HTMLElement | null,
  selector = '.js-scramble'
): void {
  if (!scopeEl) return;
  const targets = gsap.utils.toArray<HTMLElement>(selector, scopeEl);
  targets.forEach((el, idx) => {
    const finalText = el.dataset.scramble || el.textContent || '';
    if (!finalText.trim()) return;
    gsap.to(el, {
      duration: 0.75,
      delay: idx * 0.04,
      scrambleText: {
        text: finalText,
        chars: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ/-+Ω.',
        revealDelay: 0.1,
        speed: 0.65,
      },
      overwrite: 'auto',
    });
  });
}

export function useMagneticButtons(
  scopeRef: React.RefObject<HTMLElement | null>,
  deps: unknown[] = []
): void {
  useGSAP(
    () => {
      const root = scopeRef.current;
      if (!root) return;

      const mm = gsap.matchMedia();
      mm.add(
        {
          reduceMotion: REDUCED_MOTION_QUERY,
          finePointer: '(pointer: fine)',
        },
        (context) => {
          const { reduceMotion, finePointer } = context.conditions ?? {};
          if (reduceMotion || !finePointer) return;

          const buttons = gsap.utils.toArray<HTMLElement>('.js-magnetic', root);
          const cleanups: Array<() => void> = [];

          buttons.forEach((btn) => {
            const xTo = gsap.quickTo(btn, 'x', {
              duration: 0.35,
              ease: 'power3.out',
            });
            const yTo = gsap.quickTo(btn, 'y', {
              duration: 0.35,
              ease: 'power3.out',
            });

            const onMove = (e: MouseEvent) => {
              const rect = btn.getBoundingClientRect();
              if (!rect.width || !rect.height) return;
              const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
              const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
              xTo(gsap.utils.clamp(-8, 8, relX * 8));
              yTo(gsap.utils.clamp(-5, 5, relY * 5));
            };

            const onLeave = () => {
              xTo(0);
              yTo(0);
            };

            btn.addEventListener('mousemove', onMove);
            btn.addEventListener('mouseleave', onLeave);
            cleanups.push(() => {
              btn.removeEventListener('mousemove', onMove);
              btn.removeEventListener('mouseleave', onLeave);
              gsap.set(btn, { x: 0, y: 0 });
            });
          });

          return () => {
            cleanups.forEach((fn) => fn());
          };
        }
      );

      return () => mm.revert();
    },
    { scope: scopeRef, dependencies: deps }
  );
}

export {
  DrawSVGPlugin,
  Flip,
  gsap,
  ScrambleTextPlugin,
  ScrollTrigger,
  SplitText,
  useGSAP,
};
