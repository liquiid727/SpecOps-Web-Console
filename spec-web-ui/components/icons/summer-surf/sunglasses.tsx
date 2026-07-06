import React, { type SVGProps } from "react";

export function SunglassesIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 60" role="img" aria-label="太阳镜" {...props}>
      <path
        d="M6 18 L30 18 L34 26 L66 26 L70 18 L94 18"
        fill="none"
        stroke="rgb(var(--summer-ink, 23 58 77))"
        strokeWidth={4}
        strokeLinecap="round"
      />
      <rect x={6} y={18} width={30} height={22} rx={11} fill="rgb(var(--summer-ink, 23 58 77))" />
      <rect x={64} y={18} width={30} height={22} rx={11} fill="rgb(var(--summer-ink, 23 58 77))" />
      <rect x={12} y={23} width={10} height={8} rx={4} fill="rgb(var(--summer-sky, 79 195 232))" opacity={0.7} />
      <rect x={70} y={23} width={10} height={8} rx={4} fill="rgb(var(--summer-sky, 79 195 232))" opacity={0.7} />
    </svg>
  );
}
