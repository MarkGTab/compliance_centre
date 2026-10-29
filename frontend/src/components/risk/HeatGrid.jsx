import React from "react";

const cellColor = (score) => {
  if (score <= 6) return "bg-emerald-200";
  if (score <= 12) return "bg-amber-300";
  return "bg-red-400";
};

// 5x5 grid: columns = likelihood (1..5 L->R), rows = impact (5..1 top->bottom)
const ROWS = [5, 4, 3, 2, 1];
const COLS = [1, 2, 3, 4, 5];

export default function HeatGrid({ inherent, residual, size = 170 }) {
  const cell = size / 5;
  const posFor = (l, i) => {
    const ln = Number(l), in_ = Number(i);
    if (!ln || !in_) return null;
    const x = (ln - 1) * cell;
    const y = ROWS.indexOf(in_) * cell;
    return { x, y };
  };
  const inh = posFor(inherent?.likelihood, inherent?.impact);
  const res = posFor(residual?.likelihood, residual?.impact);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground" style={{ height: size }}>
        <span>5</span><span>4</span><span>3</span><span>2</span><span>1</span>
      </div>
      <div>
        <div className="relative" style={{ width: size, height: size }}>
          <div className="grid grid-cols-5" style={{ width: size, height: size }}>
            {ROWS.map((i) =>
              COLS.map((l) => (
                <div
                  key={`${i}-${l}`}
                  className={`border border-white ${cellColor(i * l)}`}
                  style={{ width: cell, height: cell }}
                />
              ))
            )}
          </div>
          {inh && (
            <div
              className="absolute rounded-full border-2 border-slate-800 bg-white/70"
              style={{ width: cell * 0.45, height: cell * 0.45, left: inh.x + cell * 0.27, top: inh.y + cell * 0.27 }}
              title="Inherent"
            />
          )}
          {res && (
            <div
              className="absolute rounded-full bg-slate-900 ring-2 ring-white"
              style={{ width: cell * 0.45, height: cell * 0.45, left: res.x + cell * 0.27, top: res.y + cell * 0.27 }}
              title="Residual"
            />
          )}
        </div>
        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground" style={{ width: size }}>
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div>
      <div className="flex flex-col justify-between py-0.5 text-[10px] text-muted-foreground">
        <div className="-rotate-90 whitespace-nowrap">Impact</div>
      </div>
      <div className="self-end text-[10px] text-muted-foreground">Likelihood →</div>
    </div>
  );
}