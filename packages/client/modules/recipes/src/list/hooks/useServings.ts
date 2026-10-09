import { useState } from 'react';

export function useServings(id: string | undefined, fallback: number): [number, (next: number) => void] {
  const [chosen, setChosen] = useState<{ id: string | undefined; value: number } | null>(null);
  const value = chosen !== null && chosen.id === id ? chosen.value : fallback;
  return [value, (next) => setChosen({ id, value: next })];
}
