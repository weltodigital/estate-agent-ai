"use client";

import { useState } from "react";

export function BeforeAfterSlider({
  before,
  after,
  className,
}: {
  before: string;
  after: string;
  className?: string;
}) {
  const [pos, setPos] = useState(50);
  return (
    <div
      className={`relative aspect-[4/3] w-full select-none overflow-hidden bg-slate-900 ${className ?? ""}`}
    >
      <img
        src={after}
        alt="after enhancement"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
      >
        <img src={before} alt="before enhancement" className="h-full w-full object-cover" />
      </div>
      <div
        className="pointer-events-none absolute inset-y-0"
        style={{ left: `calc(${pos}% - 1px)` }}
      >
        <div className="bg-brand-cream h-full w-0.5 shadow" />
      </div>
      <div className="text-brand-cream absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium">
        Before
      </div>
      <div className="text-brand-cream absolute right-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs font-medium">
        After
      </div>
      <input
        aria-label="Before/after slider"
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        className="absolute inset-x-0 bottom-2 mx-3 w-[calc(100%-1.5rem)]"
      />
    </div>
  );
}
