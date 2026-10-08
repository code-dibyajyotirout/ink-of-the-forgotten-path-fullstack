import { useRef, useCallback } from "react";
import { OneEuroFilter, OneEuroFilterConfig } from "../utils/OneEuroFilter";

export function useOneEuroFilter(config?: Partial<OneEuroFilterConfig>) {
  const filterRef = useRef<OneEuroFilter | null>(null);

  if (!filterRef.current) {
    filterRef.current = new OneEuroFilter(config);
  }

  const filter = useCallback((value: number, timestamp?: number): number => {
    return filterRef.current!.filter(value, timestamp);
  }, []);

  const reset = useCallback((): void => {
    filterRef.current?.reset();
  }, []);

  return { filter, reset };
}
