import React, { type SVGProps } from "react";

export function CloudIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 60" role="img" aria-label="云朵" {...props}>
      <path
        d="M20 45 a15 15 0 0 1 0-30 a20 20 0 0 1 38-8 a17 17 0 0 1 20 24 a13 13 0 0 1-3 14 Z"
        fill="rgb(var(--summer-sand, 255 246 229))"
        stroke="rgb(var(--summer-sky, 79 195 232))"
        strokeWidth={2}
      />
    </svg>
  );
}
