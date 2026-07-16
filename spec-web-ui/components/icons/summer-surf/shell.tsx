import React, { type SVGProps } from "react";

export function ShellIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="贝壳" {...props}>
      <path
        d="M50 12 C74 12 92 40 92 66 C92 66 74 58 50 58 C26 58 8 66 8 66 C8 40 26 12 50 12 Z"
        fill="rgb(var(--summer-sun, 255 212 71))"
      />
      <g stroke="rgb(var(--summer-sunset, 255 138 91))" strokeWidth={3} fill="none" strokeLinecap="round">
        <line x1={50} y1={18} x2={50} y2={58} />
        <line x1={38} y1={20} x2={30} y2={58} />
        <line x1={62} y1={20} x2={70} y2={58} />
        <line x1={26} y1={28} x2={14} y2={60} />
        <line x1={74} y1={28} x2={86} y2={60} />
      </g>
      <path
        d="M8 66 C24 78 76 78 92 66 C88 80 70 90 50 90 C30 90 12 80 8 66 Z"
        fill="rgb(var(--summer-sunset, 255 138 91))"
      />
    </svg>
  );
}
