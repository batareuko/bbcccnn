"use client";
import { useEffect, useRef } from "react";

/** Animated pixel "plasma" background with a glow that follows the cursor. */
export function PixelField({ cell = 16 }: { cell?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    let w = 0, h = 0, cols = 0, rows = 0, raf = 0;
    const mouse = { x: -9999, y: -9999 };
    // brand gradient stops
    const stops = [[91, 91, 240], [139, 92, 246], [236, 72, 153]];
    const mix = (t: number) => {
      const s = t * (stops.length - 1), i = Math.min(stops.length - 2, Math.floor(s)), f = s - i;
      return stops[i].map((c, k) => Math.round(c + (stops[i + 1][k] - c) * f));
    };

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / cell); rows = Math.ceil(h / cell);
    }

    function frame(time: number) {
      const t = time / 1000;
      ctx.clearRect(0, 0, w, h);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = x * cell, py = y * cell;
          // plasma from a few sine waves
          const v =
            Math.sin(x * 0.16 + t * 0.9) +
            Math.sin(y * 0.21 - t * 0.7) +
            Math.sin((x + y) * 0.09 + t * 0.5) +
            Math.sin(Math.hypot(x - cols / 2, y - rows * 0.2) * 0.18 - t * 1.3);
          let a = Math.max(0, v / 4) ** 2.2 * 0.55;
          // fade towards the bottom and the edges of the hero
          a *= Math.max(0, 1 - py / h) ** 1.4;
          const d = Math.hypot(px - mouse.x, py - mouse.y);
          if (d < 180) a += (1 - d / 180) ** 2 * 0.6;
          if (a < 0.02) continue;
          const [r, g, b] = mix((x / cols + Math.sin(t * 0.3) * 0.15 + 0.15) % 1);
          ctx.fillStyle = `rgba(${r},${g},${b},${Math.min(dark ? 0.75 : 0.5, a)})`;
          ctx.fillRect(px + 1, py + 1, cell - 3, cell - 3);
        }
      }
      if (!reduce) raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      if (reduce) frame(performance.now());
    };
    resize();
    raf = requestAnimationFrame(frame);
    addEventListener("resize", resize);
    addEventListener("pointermove", onMove);
    return () => {
      cancelAnimationFrame(raf);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
    };
  }, [cell]);

  return <canvas ref={ref} className="pixel-field" aria-hidden />;
}
