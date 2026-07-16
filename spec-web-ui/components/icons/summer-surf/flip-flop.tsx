import React, { type SVGProps } from "react";

export function FlipFlopIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="人字拖" {...props}>
      <path
        d="M50 6 C68 6 78 24 76 46 C74 64 82 76 74 90 C68 98 32 98 26 90 C18 76 26 64 24 46 C22 24 32 6 50 6 Z"
        fill="rgb(var(--summer-sunset, 255 138 91))"
      />
      <circle cx={50} cy={26} r={5} fill="rgb(var(--summer-ink, 23 58 77))" />
      <path
        d="M50 26 L30 46 M50 26 L70 46"
        stroke="rgb(var(--summer-ink, 23 58 77))"
        strokeWidth={4}
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}
