import { gsap } from './gsap';
import { prefersReducedMotion } from './reduced-motion';

export const MOTION_EASE = {
  luxury: 'power3.out',
  smooth: 'power2.out',
  snap: 'power2.inOut',
} as const;

export const MOTION_DURATION = {
  micro: 0.18,
  component: 0.28,
  entrance: 0.55,
  hero: 0.75,
} as const;

export function animatePanelEnter(target: HTMLElement | null) {
  if (!target || prefersReducedMotion()) return;
  gsap.from(target, {
    opacity: 0,
    y: 14,
    scale: 0.985,
    duration: MOTION_DURATION.component,
    ease: MOTION_EASE.luxury,
    clearProps: 'transform,opacity',
  });
}
