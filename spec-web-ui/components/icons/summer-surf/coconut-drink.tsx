import React, { type SVGProps } from "react";

export function CoconutDrinkIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="椰子饮品" {...props}>
      <path
        d="M28 40 C22 40 18 46 20 56 L26 92 C26 96 30 98 34 98 L66 98 C70 98 74 96 74 92 L80 56 C82 46 78 40 72 40 Z"
        fill="rgb(var(--summer-wood, 122 82 48))"
      />
      <ellipse cx={50} cy={40} rx={30} ry={10} fill="rgb(var(--summer-wood, 122 82 48))" />
      <ellipse cx={50} cy={38} rx={24} ry={7} fill="rgb(var(--summer-sand, 255 246 229))" />
      <path
        d="M50 38 C58 20 76 14 88 18 C80 28 66 34 50 38 Z"
        fill="rgb(var(--summer-palm, 26 201 176))"
      />
      <path
        d="M50 38 C54 18 66 6 80 4 C76 18 64 30 50 38 Z"
        fill="rgb(var(--summer-palm, 26 201 176))"
        opacity={0.8}
      />
      <line x1={54} y1={36} x2={70} y2={10} stroke="rgb(var(--summer-sunset, 255 138 91))" strokeWidth={4} strokeLinecap="round" />
    </svg>
  );
}
