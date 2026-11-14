"use client";
import { useEffect, useRef } from "react";

type P = { x: number; y: number; tx: number; ty: number; vx: number; vy: number; c: number };

/** Thousands of pixels that assemble into words, morph between them and scatter from the cursor. */
export function PixelMorph({ words, height = 220 }: { words: string[]; height?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const colors = ["#5b5bf0", "#7c6cf6", "#8b5cf6", "#b45ad8", "#ec4899"];
    let w = 0, h = height, size = 6, raf = 0, idx = 0, timer = 0;
    let ps: P[] = [];
    const mouse = { x: -9999, y: -9999 };

    /** Rasterises a word and returns target pixel positions. */
    function targets(word: string) {
      const off = document.createElement("canvas");
      off.width = Math.max(1, Math.floor(w / size));
      off.height = Math.max(1, Math.floor(h / size));
      const o = off.getContext("2d")!;
      let fs = off.height * 0.8;
      o.font = `900 ${fs}px Inter, system-ui, sans-serif`;
      while (o.measureText(word).width > off.width * 0.94 && fs > 6) {
        fs -= 1;
        o.font = `900 ${fs}px Inter, system-ui, sans-serif`;
      }
      o.textAlign = "center";
      o.textBaseline = "middle";
      o.fillText(word, off.width / 2, off.height / 2 + fs * 0.05);
      const data = o.getImageData(0, 0, off.width, off.height).data;
      const pts: { x: number; y: number }[] = [];
      for (let y = 0; y < off.height; y++)
        for (let x = 0; x < off.width; x++) if (data[(y * off.width + x) * 4 + 3] > 128) pts.push({ x: x * size, y: y * size });
      return pts;
    }

    function setWord(word: string) {
      const pts = targets(word);
      // grow / shrink the particle pool to match
      while (ps.length < pts.length)
        ps.push({ x: Math.random() * w, y: Math.random() * h, tx: 0, ty: 0, vx: 0, vy: 0, c: (Math.random() * colors.length) | 0 });
      ps.length = pts.length;
      // shuffle so the morph flows nicely
      for (let i = pts.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [pts[i], pts[j]] = [pts[j], pts[i]];
      }
      pts.forEach((p, i) => ((ps[i].tx = p.x), (ps[i].ty = p.y)));
      if (reduce) ps.forEach((p) => ((p.x = p.tx), (p.y = p.ty)));
    }

    function resize() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width;
      size = w < 600 ? 4 : 6;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      setWord(words[idx]);
    }

    function frame() {
      ctx.clearRect(0, 0, w, h);
      for (const p of ps) {
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 6400) {
          const f = (6400 - d2) / 6400 * 3;
          const d = Math.sqrt(d2) || 1;
          p.vx += (dx / d) * f; p.vy += (dy / d) * f;
        }
        p.vx += (p.tx - p.x) * 0.045; p.vy += (p.ty - p.y) * 0.045;
        p.vx *= 0.82; p.vy *= 0.82;
        p.x += p.vx; p.y += p.vy;
        ctx.fillStyle = colors[p.c];
        ctx.fillRect(p.x, p.y, size - 1, size - 1);
      }
      raf = requestAnimationFrame(frame);
    }

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    };
    const onLeave = () => ((mouse.x = -9999), (mouse.y = -9999));

    resize();
    if (reduce) frame();
    else {
      raf = requestAnimationFrame(frame);
      timer = window.setInterval(() => {
        idx = (idx + 1) % words.length;
        // burst outward before re-forming
        for (const p of ps) { p.vx += (Math.random() - 0.5) * 30; p.vy += (Math.random() - 0.5) * 30; }
        setWord(words[idx]);
      }, 2800);
    }
    addEventListener("resize", resize);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(timer);
      removeEventListener("resize", resize);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [words, height]);

  return <canvas ref={ref} className="pixel-morph" style={{ height }} aria-label={words.join(" · ")} role="img" />;
}
