import React, { type SVGProps } from "react";

export function SunIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="太阳" {...props}>
      <g stroke="rgb(var(--summer-sun, 255 212 71))" strokeWidth={5} strokeLinecap="round">
        <line x1={50} y1={6} x2={50} y2={18} />
        <line x1={50} y1={82} x2={50} y2={94} />
        <line x1={6} y1={50} x2={18} y2={50} />
        <line x1={82} y1={50} x2={94} y2={50} />
        <line x1={18} y1={18} x2={27} y2={27} />
        <line x1={73} y1={73} x2={82} y2={82} />
        <line x1={82} y1={18} x2={73} y2={27} />
        <line x1={27} y1={73} x2={18} y2={82} />
      </g>
      <circle cx={50} cy={50} r={22} fill="rgb(var(--summer-sun, 255 212 71))" />
    </svg>
  );
}
