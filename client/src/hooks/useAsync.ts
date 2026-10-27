import { useCallback, useEffect, useState } from "react";

interface State<T> {
  data: T | undefined;
  error: unknown;
  loading: boolean;
}

/**
 * Runs `load` when `deps` change and keeps the latest result. A slow earlier request can't
 * overwrite a newer one. `reload()` runs it again (after saving something, say).
 */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<State<T>>({ data: undefined, error: undefined, loading: true });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    load().then(
      (data) => {
        if (!cancelled) setState({ data, error: undefined, loading: false });
      },
      (error: unknown) => {
        if (!cancelled) setState({ data: undefined, error, loading: false });
      }
    );
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}
