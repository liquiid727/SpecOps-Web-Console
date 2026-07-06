import React, { type SVGProps } from "react";

export function SurfboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 60 120" role="img" aria-label="冲浪板" {...props}>
      <path
        d="M30 4 C48 30 48 90 30 116 C12 90 12 30 30 4 Z"
        fill="rgb(var(--summer-sunset, 255 138 91))"
      />
      <line x1={30} y1={12} x2={30} y2={108} stroke="rgb(var(--summer-sand, 255 246 229))" strokeWidth={3} />
      <path
        d="M30 4 C40 24 42 40 40 55 C36 40 32 24 30 4 Z"
        fill="rgb(var(--summer-sun, 255 212 71))"
        opacity={0.85}
      />
    </svg>
  );
}
