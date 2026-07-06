import React, { type SVGProps } from "react";

export function BeachUmbrellaIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 110" role="img" aria-label="遮阳伞" {...props}>
      <g stroke="rgb(var(--summer-wood, 122 82 48))" strokeWidth={4} strokeLinecap="round">
        <line x1={50} y1={30} x2={50} y2={104} />
        <path d="M50 100 L38 106 M50 100 L62 106" fill="none" />
      </g>
      <path d="M8 32 C8 12 30 2 50 2 C70 2 92 12 92 32 Z" fill="rgb(var(--summer-sea, 15 160 196))" />
      <path d="M8 32 C22 26 34 26 50 32 C66 26 78 26 92 32 Z" fill="rgb(var(--summer-sun, 255 212 71))" />
      <line x1={50} y1={2} x2={50} y2={32} stroke="rgb(var(--summer-sand, 255 246 229))" strokeWidth={2} />
      <path
        d="M8 32 C24 38 76 38 92 32"
        stroke="rgb(var(--summer-ink, 23 58 77))"
        strokeWidth={2}
        fill="none"
        opacity={0.3}
      />
    </svg>
  );
}
