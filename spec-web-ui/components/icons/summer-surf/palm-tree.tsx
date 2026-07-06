import React, { type SVGProps } from "react";

export function PalmTreeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 120" role="img" aria-label="椰子树" {...props}>
      <path
        d="M50 118 C48 90 52 65 55 45"
        stroke="rgb(var(--summer-wood, 122 82 48))"
        strokeWidth={5}
        fill="none"
        strokeLinecap="round"
      />
      <g fill="rgb(var(--summer-palm, 26 201 176))">
        <path d="M55 45 C40 42 25 48 15 40 C28 38 42 38 55 45 Z" />
        <path d="M55 45 C42 35 32 20 22 15 C34 20 46 28 55 45 Z" />
        <path d="M55 45 C50 30 50 15 45 5 C52 14 57 28 55 45 Z" />
        <path d="M55 45 C60 30 62 15 68 6 C64 18 60 30 55 45 Z" />
        <path d="M55 45 C65 35 78 22 88 18 C76 26 65 34 55 45 Z" />
        <path d="M55 45 C68 42 82 46 92 38 C80 38 66 39 55 45 Z" />
      </g>
      <g fill="rgb(var(--summer-wood, 122 82 48))">
        <circle cx={52} cy={46} r={4} />
        <circle cx={58} cy={48} r={4} />
        <circle cx={55} cy={52} r={4} />
      </g>
    </svg>
  );
}
