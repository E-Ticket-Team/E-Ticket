'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/utils';

export const TextHoverEffect = ({
  text,
  duration,
  className,
}: {
  text: string;
  duration?: number;
  automatic?: boolean;
  className?: string;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [cursor, setCursor] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  const [maskPosition, setMaskPosition] = useState({ cx: '50%', cy: '50%' });
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    if (svgRef.current) {
      const svgRect = svgRef.current.getBoundingClientRect();
      if (svgRect.width > 0 && svgRect.height > 0) {
        const cxPercentage = ((cursor.x - svgRect.left) / svgRect.width) * 100;
        const cyPercentage = ((cursor.y - svgRect.top) / svgRect.height) * 100;
        setMaskPosition({
          cx: `${cxPercentage}%`,
          cy: `${cyPercentage}%`,
        });
      }
    }
  }, [cursor]);

  return (
    <svg
      ref={svgRef}
      width="100%"
      height="100%"
      viewBox="0 0 380 100"
      xmlns="http://www.w3.org/2000/svg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={(e) => setCursor({ x: e.clientX, y: e.clientY })}
      className={cn('select-none uppercase cursor-pointer', className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id="eticketTextGradient"
          gradientUnits="userSpaceOnUse"
          x1="0%"
          y1="0%"
          x2="100%"
          y2="0%"
        >
          {hovered && (
            <>
              <stop offset="0%" stopColor="#D5EDE1" />
              <stop offset="25%" stopColor="#6EE7B7" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="75%" stopColor="#34D399" />
              <stop offset="100%" stopColor="#EAB308" />
            </>
          )}
        </linearGradient>

        <motion.radialGradient
          id="eticketRevealMask"
          gradientUnits="userSpaceOnUse"
          r="24%"
          initial={{ cx: '50%', cy: '50%' }}
          animate={maskPosition}
          transition={{ duration: duration ?? 0, ease: 'easeOut' }}
        >
          <stop offset="0%" stopColor="white" />
          <stop offset="100%" stopColor="black" />
        </motion.radialGradient>
        <mask id="eticketTextMask">
          <rect
            x="0"
            y="0"
            width="100%"
            height="100%"
            fill="url(#eticketRevealMask)"
          />
        </mask>
      </defs>

      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.45"
        style={{
          fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
          opacity: hovered ? 0.65 : 0,
        }}
        className="fill-transparent stroke-[#D5EDE1]/40 text-7xl font-extrabold tracking-tight"
      >
        {text}
      </text>

      <motion.text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        strokeWidth="0.45"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        className="fill-transparent stroke-[#10B981]/65 text-7xl font-extrabold tracking-tight"
        initial={
          prefersReducedMotion
            ? { strokeDashoffset: 0, strokeDasharray: 1000 }
            : { strokeDashoffset: 1000, strokeDasharray: 1000 }
        }
        animate={{
          strokeDashoffset: 0,
          strokeDasharray: 1000,
        }}
        transition={{
          duration: prefersReducedMotion ? 0 : 3.2,
          ease: 'easeInOut',
        }}
      >
        {text}
      </motion.text>

      <text
        x="50%"
        y="52%"
        textAnchor="middle"
        dominantBaseline="middle"
        stroke="url(#eticketTextGradient)"
        strokeWidth="0.55"
        mask="url(#eticketTextMask)"
        style={{ fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}
        className="fill-transparent text-7xl font-extrabold tracking-tight"
      >
        {text}
      </text>
    </svg>
  );
};

export const FooterBackgroundGradient = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-0"
      style={{
        background:
          'radial-gradient(125% 125% at 50% 10%, rgba(5, 46, 37, 0.96) 45%, rgba(8, 127, 91, 0.36) 100%)',
      }}
    />
  );
};
