import { useCallback, useState } from 'react';

export function useCheckedIngredients(): [ReadonlySet<string>, (id: string) => void] {
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());
  const toggle = useCallback(
    (id: string) =>
      setChecked((current) => {
        const next = new Set(current);
        if (!next.delete(id)) next.add(id);
        return next;
      }),
    [],
  );
  return [checked, toggle];
}
