import { useState, useEffect } from 'react';
import api from './services/api';

export function useApiWithLogging(endpoint) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get(endpoint);
        setData(response.data);
        setLoading(false);
      } catch (err) {
        setError(err);
        setLoading(false);
      }
    };

    fetchData();
  }, [endpoint]);

  const refetch = async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoint);
      setData(response.data);
      setLoading(false);
      return response.data;
    } catch (err) {
      setError(err);
      setLoading(false);
      throw err;
    }
  };

  return { data, loading, error, refetch };
}

export default useApiWithLogging;
