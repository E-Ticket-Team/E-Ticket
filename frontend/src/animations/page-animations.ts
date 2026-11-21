import { gsap } from './gsap';
import { prefersReducedMotion } from './reduced-motion';
import { MOTION_EASE } from './transitions';

export function runHeroEntrance(container: HTMLElement | null) {
  if (!container || prefersReducedMotion()) return;

  const tl = gsap.timeline({
    defaults: { ease: MOTION_EASE.luxury },
  });

  const eyebrow = container.querySelector('.hero-eyebrow');
  const title = container.querySelector('.hero-title');
  const desc = container.querySelector('.hero-description');
  const search = container.querySelector('.hero-search');
  const actions = container.querySelector('.hero-actions');
  const showcase = container.querySelector('.hero-showcase');
  const accent = container.querySelector('.hero-accent-orb');

  if (eyebrow) {
    tl.from(eyebrow, { opacity: 0, y: 16, duration: 0.42, clearProps: 'transform,opacity' });
  }
  if (title) {
    tl.from(
      title,
      { opacity: 0, y: 28, duration: 0.65, clearProps: 'transform,opacity' },
      '-=0.22',
    );
  }
  if (desc) {
    tl.from(
      desc,
      { opacity: 0, y: 18, duration: 0.48, clearProps: 'transform,opacity' },
      '-=0.36',
    );
  }
  if (search) {
    tl.from(
      search,
      { opacity: 0, y: 14, duration: 0.42, clearProps: 'transform,opacity' },
      '-=0.28',
    );
  }
  if (actions) {
    tl.from(
      actions,
      { opacity: 0, y: 12, duration: 0.4, clearProps: 'transform,opacity' },
      '-=0.24',
    );
  }
  if (showcase) {
    tl.from(
      showcase,
      {
        opacity: 0,
        y: 22,
        clipPath: 'inset(6% 0% 0% 0% round 22px)',
        duration: 0.68,
        clearProps: 'transform,opacity,clipPath',
      },
      '-=0.45',
    );
  }
  if (accent) {
    gsap.to(accent, {
      y: -8,
      duration: 3.4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    });
  }
}

export function runPageEntrance(container: HTMLElement | null) {
  if (!container || prefersReducedMotion()) return;

  gsap.from(container, {
    opacity: 0,
    y: 12,
    duration: 0.34,
    ease: MOTION_EASE.luxury,
    clearProps: 'transform,opacity',
  });
}
