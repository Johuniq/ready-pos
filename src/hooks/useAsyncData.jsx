import { useState, useEffect, useCallback } from "react";

/**
 * Custom hook for handling async data fetching with loading and error states
 *
 * @param {Function} fetchFn - Async function to fetch data
 * @param {Object} options - Configuration options
 * @param {boolean} options.immediate - Whether to fetch immediately on mount (default: true)
 * @param {Array} options.deps - Dependencies array for refetching
 * @param {Function} options.onSuccess - Callback on successful fetch
 * @param {Function} options.onError - Callback on error
 * @param {any} options.initialData - Initial data value
 *
 * @returns {Object} - { data, loading, error, refetch, setData }
 */
export function useAsyncData(fetchFn, options = {}) {
  const {
    immediate = true,
    deps = [],
    onSuccess,
    onError,
    initialData = null,
  } = options;

  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn();
      setData(result);
      onSuccess?.(result);
      return result;
    } catch (err) {
      setError(err);
      onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFn, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    data,
    loading,
    error,
    refetch,
    setData,
  };
}

/**
 * Hook for handling multiple parallel async requests
 *
 * @param {Array<Function>} fetchFns - Array of async functions
 * @param {Object} options - Configuration options
 *
 * @returns {Object} - { data, loading, errors, refetch }
 */
export function useAsyncDataParallel(fetchFns, options = {}) {
  const { immediate = true, deps = [], onSuccess, onError } = options;

  const [data, setData] = useState(fetchFns.map(() => null));
  const [loading, setLoading] = useState(immediate);
  const [errors, setErrors] = useState(fetchFns.map(() => null));

  const execute = useCallback(async () => {
    setLoading(true);
    setErrors(fetchFns.map(() => null));

    try {
      const results = await Promise.allSettled(fetchFns.map((fn) => fn()));

      const newData = [];
      const newErrors = [];

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          newData[index] = result.value;
          newErrors[index] = null;
        } else {
          newData[index] = null;
          newErrors[index] = result.reason;
        }
      });

      setData(newData);
      setErrors(newErrors);
      onSuccess?.(newData, newErrors);
      return newData;
    } catch (err) {
      onError?.(err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [fetchFns, onSuccess, onError]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, deps);

  const refetch = useCallback(() => {
    return execute();
  }, [execute]);

  return {
    data,
    loading,
    errors,
    refetch,
    hasErrors: errors.some((e) => e !== null),
  };
}

/**
 * Hook for paginated data fetching
 *
 * @param {Function} fetchFn - Async function that accepts page number
 * @param {Object} options - Configuration options
 *
 * @returns {Object} - { data, loading, error, page, totalPages, nextPage, prevPage, goToPage, refetch }
 */
export function usePaginatedData(fetchFn, options = {}) {
  const { initialPage = 1, onSuccess, onError } = options;

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);

  const fetchPage = useCallback(
    async (pageNum) => {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchFn(pageNum);
        setData(result.data || result.items || result);
        setTotalPages(result.total_pages || result.totalPages || 1);
        setPage(pageNum);
        onSuccess?.(result);
        return result;
      } catch (err) {
        setError(err);
        onError?.(err);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [fetchFn, onSuccess, onError],
  );

  useEffect(() => {
    fetchPage(page);
  }, []);

  const nextPage = useCallback(() => {
    if (page < totalPages) {
      fetchPage(page + 1);
    }
  }, [page, totalPages, fetchPage]);

  const prevPage = useCallback(() => {
    if (page > 1) {
      fetchPage(page - 1);
    }
  }, [page, fetchPage]);

  const goToPage = useCallback(
    (pageNum) => {
      if (pageNum >= 1 && pageNum <= totalPages) {
        fetchPage(pageNum);
      }
    },
    [totalPages, fetchPage],
  );

  const refetch = useCallback(() => {
    fetchPage(page);
  }, [page, fetchPage]);

  return {
    data,
    loading,
    error,
    page,
    totalPages,
    nextPage,
    prevPage,
    goToPage,
    refetch,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}
