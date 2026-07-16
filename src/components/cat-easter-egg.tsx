import { useEffect, useState } from "react";

// Konami code → make it rain cats for a few seconds. Harmless, purr-ely for fun.
const CODE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];
const CATS = ["🐱", "🐈", "😺", "😸", "🐈‍⬛", "😻"];

type Cat = { emoji: string; left: number; size: number; dur: number; delay: number };

export function CatEasterEgg() {
  const [cats, setCats] = useState<Cat[] | null>(null);

  useEffect(() => {
    let i = 0;
    function onKey(e: KeyboardEvent) {
      i = e.key.toLowerCase() === CODE[i].toLowerCase() ? i + 1 : 0;
      if (i === CODE.length) {
        i = 0;
        // randomness lives here (an event), not in render
        setCats(
          Array.from({ length: 40 }, (_, n) => ({
            emoji: CATS[n % CATS.length],
            left: Math.random() * 100,
            size: 18 + Math.random() * 30,
            dur: 3 + Math.random() * 3,
            delay: Math.random() * 2,
          }))
        );
        setTimeout(() => setCats(null), 6000);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!cats) return null;
  return (
    <div className="fixed inset-0 z-110 overflow-hidden">
      {cats.map((c, n) => (
        <span
          key={n}
          className="cat-fall"
          style={{
            left: `${c.left}%`,
            fontSize: `${c.size}px`,
            animationDuration: `${c.dur}s`,
            animationDelay: `${c.delay}s`,
          }}
        >
          {c.emoji}
        </span>
      ))}
    </div>
  );
}
