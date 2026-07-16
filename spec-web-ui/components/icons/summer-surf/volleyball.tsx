import React, { type SVGProps } from "react";

export function VolleyballIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="排球" {...props}>
      <circle cx={50} cy={50} r={44} fill="rgb(var(--summer-sand, 255 246 229))" stroke="rgb(var(--summer-ink, 23 58 77))" strokeWidth={3} />
      <g fill="none" stroke="rgb(var(--summer-sunset, 255 138 91))" strokeWidth={5} strokeLinecap="round">
        <path d="M50 6 C34 24 34 76 50 94" />
        <path d="M50 6 C66 24 66 76 50 94" />
      </g>
      <path
        d="M8 38 C26 30 74 30 92 38"
        fill="none"
        stroke="rgb(var(--summer-sea, 15 160 196))"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <path
        d="M8 62 C26 70 74 70 92 62"
        fill="none"
        stroke="rgb(var(--summer-palm, 26 201 176))"
        strokeWidth={5}
        strokeLinecap="round"
      />
    </svg>
  );
}
