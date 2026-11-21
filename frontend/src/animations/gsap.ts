import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

if (typeof window !== 'undefined') {
  if (typeof window.matchMedia === 'function') {
    gsap.registerPlugin(ScrollTrigger, useGSAP);
  } else {
    gsap.registerPlugin(useGSAP);
  }
}

export { gsap, ScrollTrigger, useGSAP };
