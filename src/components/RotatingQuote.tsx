import { useEffect, useState } from "react";
import { quoteOfTheMoment, QUOTES } from "@/lib/quotes";

export const RotatingQuote = () => {
  const [q, setQ] = useState(quoteOfTheMoment());

  useEffect(() => {
    const id = window.setInterval(() => {
      const next = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      setQ(next);
    }, 20000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="italic">
      “{q.text}” <span className="not-italic">— {q.author}</span>
    </span>
  );
};
