import { useEffect, useRef } from 'react';

/**
 * A single reusable timeout for "show this briefly, then reset" UI - a
 * "Copied" label, a saved toast. Scheduling again cancels the previous
 * timer, so copying link A then link B doesn't let A's timer clear B's
 * label early, and the timer is cleared if the component unmounts.
 */
export function useResetTimer() {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  return (reset: () => void, delayMs: number) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(reset, delayMs);
  };
}
