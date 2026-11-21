import { gsap } from './gsap';
import { prefersReducedMotion } from './reduced-motion';
import { MOTION_EASE } from './transitions';

export function runStaggerScrollReveal(
  selector: string,
  triggerElement?: HTMLElement | null,
) {
  if (prefersReducedMotion()) return;

  const targets = triggerElement
    ? triggerElement.querySelectorAll(selector)
    : document.querySelectorAll(selector);

  if (!targets || targets.length === 0) return;

  gsap.from(targets, {
    opacity: 0,
    y: 22,
    duration: 0.55,
    stagger: 0.08,
    ease: MOTION_EASE.luxury,
    clearProps: 'transform,opacity',
    scrollTrigger: triggerElement
      ? {
          trigger: triggerElement,
          start: 'top 88%',
          once: true,
        }
      : undefined,
  });
}

export function runSectionHeadingReveal(
  selector: string,
  triggerElement: HTMLElement | null,
) {
  if (!triggerElement || prefersReducedMotion()) return;
  const targets = triggerElement.querySelectorAll(selector);
  if (targets.length === 0) return;

  gsap.from(targets, {
    opacity: 0,
    y: 18,
    duration: 0.5,
    stagger: 0.08,
    ease: MOTION_EASE.luxury,
    clearProps: 'transform,opacity',
    scrollTrigger: {
      trigger: triggerElement,
      start: 'top 90%',
      once: true,
    },
  });
}

export function runCountUp(
  element: HTMLElement | null,
  endValue: number,
  formatFn: (val: number) => string,
) {
  if (!element) return;
  if (prefersReducedMotion() || !Number.isFinite(endValue)) {
    element.textContent = formatFn(endValue);
    return;
  }

  const counter = { val: 0 };
  gsap.to(counter, {
    val: endValue,
    duration: 0.9,
    ease: MOTION_EASE.smooth,
    onUpdate: () => {
      element.textContent = formatFn(counter.val);
    },
    onComplete: () => {
      element.textContent = formatFn(endValue);
    },
  });
}
