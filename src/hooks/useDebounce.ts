import { useEffect, useRef } from 'react';

/**
 * Debounces a callback function.
 * Used for auto-save: fires `callback` only after `delay` ms of inactivity.
 */
export function useDebounce(callback: () => void, delay: number, deps: unknown[]): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(callback, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
