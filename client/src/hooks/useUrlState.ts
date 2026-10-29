import { useCallback, useMemo, useRef } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

type Primitive = string | number | undefined;

/**
 * Syncs a flat filter/sort/page object with the URL query string.
 * Any change except a plain `page` change resets page to 1 (unless `keepPage` is passed).
 * `set` and `reset` keep a stable identity even if `defaults` is an inline object.
 */
export function useUrlState<T extends Record<string, Primitive>>(defaults: T) {
  const raw = useSearch({ strict: false }) as Record<string, unknown>;
  const navigate = useNavigate();

  const defaultsRef = useRef(defaults);
  defaultsRef.current = defaults;
  const rawRef = useRef(raw);
  rawRef.current = raw;
  const rawKey = JSON.stringify(raw);

  const state = useMemo(() => {
    const d = defaultsRef.current;
    const out: Record<string, Primitive> = { ...d };
    for (const k of Object.keys(d)) {
      const v = rawRef.current[k];
      if (v === undefined || v === null || v === "") continue;
      const def = d[k];
      if (typeof def === "number") {
        const n = Number(v);
        out[k] = Number.isFinite(n) ? n : def;
      } else {
        out[k] = String(v);
      }
    }
    return out as T;
  }, [rawKey]);

  const set = useCallback(
    (patch: Partial<T>, opts?: { keepPage?: boolean }) => {
      const d = defaultsRef.current as Record<string, Primitive>;
      const keys = Object.keys(patch);
      const resetPage = !opts?.keepPage && keys.some((k) => k !== "page") && "page" in d && !("page" in patch);
      const next: Record<string, unknown> = { ...rawRef.current, ...patch };
      if (resetPage) next.page = undefined;
      for (const [k, v] of Object.entries(next)) {
        if (v === "" || v === undefined || v === d[k]) delete next[k];
      }
      navigate({ to: ".", search: next as never, replace: true });
    },
    [navigate],
  );

  const reset = useCallback(() => {
    navigate({ to: ".", search: {} as never, replace: true });
  }, [navigate]);

  return [state, set, reset] as const;
}