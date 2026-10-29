import { useMemo } from "react";
import { useLocation } from "react-router-dom";

// Build a path with query params, dropping empty values.
export function buildLink(path, params = {}) {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v != null && v !== "") q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}

// Reactive snapshot of the current URL query params.
export function useDeeplink() {
  const { search } = useLocation();
  return useMemo(() => {
    const p = new URLSearchParams(search);
    const o = {};
    for (const [k, v] of p.entries()) o[k] = v;
    return o;
  }, [search]);
}