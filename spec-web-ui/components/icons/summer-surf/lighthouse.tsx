import React, { type SVGProps } from "react";

export function LighthouseIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 120" role="img" aria-label="灯塔" {...props}>
      <path
        d="M40 112 L44 40 L56 40 L60 112 Z"
        fill="rgb(var(--summer-sand, 255 246 229))"
        stroke="rgb(var(--summer-sea, 15 160 196))"
        strokeWidth={3}
      />
      <rect x={42} y={52} width={16} height={12} fill="rgb(var(--summer-sunset, 255 138 91))" />
      <rect x={42} y={76} width={16} height={12} fill="rgb(var(--summer-sunset, 255 138 91))" />
      <path d="M36 40 L64 40 L58 24 L42 24 Z" fill="rgb(var(--summer-sunset, 255 138 91))" />
      <rect x={40} y={14} width={20} height={12} rx={2} fill="rgb(var(--summer-ink, 23 58 77))" />
      <path
        d="M50 4 L50 14 M42 8 L50 14 L58 8"
        stroke="rgb(var(--summer-sun, 255 212 71))"
        strokeWidth={3}
        fill="none"
        strokeLinecap="round"
      />
      <rect x={34} y={112} width={32} height={6} rx={2} fill="rgb(var(--summer-wood, 122 82 48))" />
    </svg>
  );
}
