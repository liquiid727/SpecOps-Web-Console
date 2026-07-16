import React, { type SVGProps } from "react";

export function StarfishIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 100 100" role="img" aria-label="海星" {...props}>
      <path
        d="M50 6 L60 38 L94 38 L66 58 L76 92 L50 70 L24 92 L34 58 L6 38 L40 38 Z"
        fill="rgb(var(--summer-sunset, 255 138 91))"
      />
      <circle cx={50} cy={50} r={6} fill="rgb(var(--summer-sun, 255 212 71))" />
    </svg>
  );
}
