"use client";
import { useEffect, useState } from "react";

const GLYPHS = "▓▒░█▚▞▙▟#*+";

/** Text that "decodes" from pixel glyphs into the final string. */
export function Scramble({ text, delay = 0, className }: { text: string; delay?: number; className?: string }) {
  const [out, setOut] = useState(text);

  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0, raf = 0;
    const start = performance.now() + delay;
    const total = 28 + text.length * 1.4;
    function tick(now: number) {
      if (now < start) {
        setOut(text.replace(/\S/g, () => GLYPHS[(Math.random() * GLYPHS.length) | 0]));
        raf = requestAnimationFrame(tick);
        return;
      }
      frame++;
      const revealed = Math.floor((frame / total) * text.length);
      setOut(
        text
          .split("")
          .map((ch, i) => (i < revealed || ch === " " ? ch : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
          .join(""),
      );
      if (revealed < text.length) raf = requestAnimationFrame(tick);
      else setOut(text);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [text, delay]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden>{out}</span>
    </span>
  );
}
