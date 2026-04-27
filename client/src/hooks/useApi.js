import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

export function useApi(url) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const urlRef = useRef(url);
  urlRef.current = url;

  const fetch = useCallback(async (fetchUrl) => {
    if (!fetchUrl) return;
    setLoading(true);
    try {
      const res = await axios.get(fetchUrl);
      setData(res.data);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch(url);
  }, [url, fetch]);

  const refetch = useCallback(() => fetch(urlRef.current), [fetch]);

  return { data, loading, error, refetch };
}
