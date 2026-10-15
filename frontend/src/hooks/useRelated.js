import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";

export function useRelated(question) {
  const [items, setItems] = useState([]);
  const [state, setState] = useState({ page: 0, variant: 0, hasMore: true });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const busy = useRef(false);

  const loadMore = useCallback(async () => {
    if (!question || busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const wrap = !state.hasMore && state.page > 0;
      const page = wrap ? 1 : state.page + 1;
      const variant = wrap ? state.variant + 1 : state.variant;
      const data = await api.related(question, page, { variant });
      setItems((prev) => [
        ...prev,
        ...(data?.items || []).filter(
          (i) => !prev.some((p) => p.url === i.url),
        ),
      ]);
      setState({ page, variant, hasMore: !!data?.hasMore });
    } catch (e) {
      setError(e.message || "Couldn't load sources.");
    } finally {
      busy.current = false;
      setLoading(false);
    }
  }, [question, state]);

  // new question -> start over
  useEffect(() => {
    setItems([]);
    setState({ page: 0, variant: 0, hasMore: true });
    setError("");
  }, [question]);

  useEffect(() => {
    if (question && state.page === 0 && !busy.current) loadMore();
  }, [question, state.page, loadMore]);

  return { items, loading, error, loadMore };
}
