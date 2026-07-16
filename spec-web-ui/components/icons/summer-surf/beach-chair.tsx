import React, { type SVGProps } from "react";

export function BeachChairIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="沙滩椅" {...props}>
      <g stroke="rgb(var(--summer-wood, 122 82 48))" strokeWidth={4} fill="none" strokeLinecap="round">
        <path d="M20 90 L30 40 L75 40" />
        <path d="M30 40 L15 20" />
        <path d="M75 40 L85 90" />
        <path d="M20 90 L85 90" />
      </g>
      <path
        d="M17 22 C35 30 60 30 74 40"
        stroke="rgb(var(--summer-palm, 26 201 176))"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M30 40 C45 45 62 45 75 40"
        stroke="rgb(var(--summer-sky, 79 195 232))"
        strokeWidth={10}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
