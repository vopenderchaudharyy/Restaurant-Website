import { useEffect, useState } from 'react';
import { apiRequest } from '../services/api.js';

export function useResource(path, { pollMs = 0 } = {}) {
  const [state, setState] = useState({ data: null, error: '', loading: true });
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    let generation = 0;
    const fetchData = () => {
      const current = ++generation;
      return apiRequest(path, { signal: controller.signal })
        .then((data) => {
          if (!controller.signal.aborted && current === generation)
            setState({ data, error: '', loading: false });
        })
        .catch((error) => {
          if (!controller.signal.aborted && current === generation && error.name !== 'AbortError')
            setState({ data: null, error: error.message, loading: false });
        });
    };
    fetchData();
    const timer = pollMs
      ? setInterval(() => {
          if (document.visibilityState !== 'hidden') fetchData();
        }, pollMs)
      : null;
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [path, version, pollMs]);
  return {
    ...state,
    reload: () => {
      setState({ data: null, error: '', loading: true });
      setVersion((value) => value + 1);
    },
  };
}
