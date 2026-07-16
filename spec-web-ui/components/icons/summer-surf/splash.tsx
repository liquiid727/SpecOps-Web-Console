import React, { type SVGProps } from "react";

export function SplashIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="水花" {...props}>
      <g fill="rgb(var(--summer-sky, 79 195 232))">
        <circle cx={50} cy={66} r={8} />
        <circle cx={28} cy={50} r={5} />
        <circle cx={72} cy={50} r={5} />
      </g>
      <g fill="rgb(var(--summer-palm, 26 201 176))">
        <circle cx={16} cy={30} r={3.5} />
        <circle cx={84} cy={30} r={3.5} />
        <circle cx={50} cy={16} r={3.5} />
      </g>
      <g stroke="rgb(var(--summer-sea, 15 160 196))" strokeWidth={4} fill="none" strokeLinecap="round">
        <path d="M50 82 C42 82 36 76 36 68 C36 76 30 78 26 84" />
        <path d="M50 82 C58 82 64 76 64 68 C64 76 70 78 74 84" />
      </g>
    </svg>
  );
}
