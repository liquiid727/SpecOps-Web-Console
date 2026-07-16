import React, { type SVGProps } from "react";

export function HibiscusIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="扶桑花" {...props}>
      <g fill="rgb(var(--summer-sunset, 255 138 91))">
        <ellipse cx={50} cy={28} rx={14} ry={22} />
        <ellipse cx={50} cy={28} rx={14} ry={22} transform="rotate(72 50 50)" />
        <ellipse cx={50} cy={28} rx={14} ry={22} transform="rotate(144 50 50)" />
        <ellipse cx={50} cy={28} rx={14} ry={22} transform="rotate(216 50 50)" />
        <ellipse cx={50} cy={28} rx={14} ry={22} transform="rotate(288 50 50)" />
      </g>
      <circle cx={50} cy={50} r={10} fill="rgb(var(--summer-sun, 255 212 71))" />
    </svg>
  );
}
