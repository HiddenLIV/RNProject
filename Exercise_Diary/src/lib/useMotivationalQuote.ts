import { useEffect, useState } from 'react';

// active 동안 3초마다 문구를 랜덤 교체한다(직전 문구는 반복하지 않음)
export function useMotivationalQuote(active: boolean, quotes: string[]) {
  const [quote, setQuote] = useState('');

  useEffect(() => {
    if (!active) return;
    const pickNext = (prev: string) => {
      if (quotes.length < 2) return quotes[0] ?? '';
      let next = prev;
      while (next === prev) {
        next = quotes[Math.floor(Math.random() * quotes.length)];
      }
      return next;
    };
    setQuote((prev) => pickNext(prev));
    const id = setInterval(() => setQuote((prev) => pickNext(prev)), 3000);
    return () => clearInterval(id);
  }, [active]);

  return quote;
}
