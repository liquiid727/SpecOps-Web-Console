import React, { type SVGProps } from "react";

export function WaveIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="海浪" {...props}>
      <path
        d="M4 70 C18 55 30 55 44 70 C58 85 70 85 84 70 C90 63 94 60 96 58"
        stroke="rgb(var(--summer-sea, 15 160 196))"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
      <path
        d="M4 86 C18 71 30 71 44 86 C58 101 70 101 84 86 C90 79 94 76 96 74"
        stroke="rgb(var(--summer-sky, 79 195 232))"
        strokeWidth={6}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
