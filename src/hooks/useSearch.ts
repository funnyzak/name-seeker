import { useState, useCallback, useEffect, useRef } from 'react';
import { tauriApi } from '../services/tauriApi';
import { SearchType } from '../types';
import type {
  SearchResult,
  SearchProgress,
  SearchProgressPayload,
  SearchUpdatePayload,
  SearchFinished,
  SearchResultStatus,
} from '../types';

export const useSearch = (callbacks?: {
  onError?: (message: string) => void;
  onStopped?: () => void;
}) => {
  const listening = useRef<Promise<boolean> | null>(null);
  const active = useRef(false);
  const callbackRef = useRef(callbacks);
  useEffect(() => {
    callbackRef.current = callbacks;
  }, [callbacks]);
  const [outcome, setOutcome] = useState<'complete' | 'stopped' | 'failed'>(
    'complete'
  );
  const [searchNumber, setSearchNumber] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>(SearchType.USERNAME);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [progress, setProgress] = useState<SearchProgress>({
    total_sites: 0,
    checked_sites: 0,
    found_count: 0,
    error_count: 0,
    current_site: undefined,
  });

  // Update single search result
  const updateResult = useCallback((payload: SearchUpdatePayload) => {
    if (!active.current) return;
    setResults(prevResults => {
      const existingIndex = prevResults.findIndex(r => r.site === payload.site);

      const newResult: SearchResult = {
        site: payload.site,
        status: payload.status,
        url: payload.url,
        error: payload.error,
        category: payload.category,
        metadata: payload.metadata,
      };

      if (existingIndex >= 0) {
        const updatedResults = [...prevResults];
        updatedResults[existingIndex] = newResult;
        return updatedResults;
      } else {
        return [...prevResults, newResult];
      }
    });
  }, []);

  // Update search progress
  const updateProgress = useCallback((payload: SearchProgressPayload) => {
    if (!active.current) return;
    setProgress({
      total_sites: payload.total_sites,
      checked_sites: payload.checked_sites,
      found_count: payload.found_count,
      error_count: payload.error_count,
      current_site: payload.current_site,
    });
  }, []);

  const finishSearch = useCallback((payload: SearchFinished) => {
    if (!active.current) return;
    active.current = false;
    setIsSearching(false);

    setProgress(prev => ({
      ...prev,
      total_sites: payload.total_sites,
      checked_sites: payload.total_sites,
      found_count: payload.found_count,
      current_site: undefined,
    }));

    // A missing site response cannot establish that the account does not exist.
    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'Error' as SearchResultStatus,
            error: 'No site response',
          };
        }
        return result;
      })
    );
  }, []);

  // Search error handling
  const handleSearchError = useCallback((error: string) => {
    if (!active.current) return;
    active.current = false;
    setIsSearching(false);
    setProgress(prev => ({ ...prev, current_site: undefined }));
    setOutcome('failed');
    if (callbackRef.current?.onError) {
      callbackRef.current.onError(error);
    }
  }, []);

  // Search stop handling
  const handleSearchStopped = useCallback(() => {
    if (!active.current) return;
    active.current = false;
    setIsSearching(false);

    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'Error' as SearchResultStatus,
            error: 'Search stopped by user',
          };
        }
        return result;
      })
    );

    // Update progress display to show search has stopped
    setProgress(prev => ({
      ...prev,
      current_site: undefined,
    }));

    setOutcome('stopped');
    if (callbackRef.current?.onStopped) {
      callbackRef.current.onStopped();
    }
  }, []);

  // Start search
  const startSearch = useCallback(
    async (
      searchQuery: string,
      type: SearchType,
      options?: {
        maxConcurrentRequests?: number;
        timeoutSeconds?: number;
        excludeNsfw?: boolean;
        categoryFilter?: string;
      }
    ) => {
      if (!searchQuery.trim()) {
        throw new Error(
          type === SearchType.USERNAME
            ? 'Username cannot be empty'
            : 'Email cannot be empty'
        );
      }

      // Validate format based on type
      const isValid =
        type === SearchType.USERNAME
          ? await tauriApi.validateUsername(searchQuery.trim())
          : await tauriApi.validateEmail(searchQuery.trim());

      if (!isValid) {
        throw new Error(
          type === SearchType.USERNAME
            ? 'Invalid username format'
            : 'Invalid email format'
        );
      }

      if (!(await listening.current))
        throw new Error('Search events unavailable');
      active.current = true;
      // Reset state
      setSearchNumber(n => n + 1);
      setOutcome('complete');
      setSearchType(type);
      setQuery(searchQuery.trim());
      setResults([]);
      setProgress({
        total_sites: 0,
        checked_sites: 0,
        found_count: 0,
        error_count: 0,
        current_site: undefined,
      });
      setIsSearching(true);

      try {
        await tauriApi.startSearch(searchQuery.trim(), type, options);
      } catch (err) {
        active.current = false;
        setIsSearching(false);
        setOutcome('failed');
        throw err;
      }
    },
    []
  );

  // Stop search
  const stopSearch = useCallback(async () => {
    try {
      const stopped = await tauriApi.stopSearch();
      return stopped || !active.current;
    } catch {
      return false;
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    let disposed = false;
    const unsubscribers: (() => void)[] = [];
    async function subscribe(subscription: Promise<() => void>) {
      const unsubscribe = await subscription;
      if (disposed) unsubscribe();
      else unsubscribers.push(unsubscribe);
    }
    listening.current = Promise.all([
      subscribe(tauriApi.onSearchUpdate(updateResult)),
      subscribe(tauriApi.onSearchProgress(updateProgress)),
      subscribe(tauriApi.onSearchFinished(finishSearch)),
      subscribe(tauriApi.onSearchError(handleSearchError)),
      subscribe(tauriApi.onSearchStopped(handleSearchStopped)),
    ])
      .then(() => !disposed)
      .catch(() => {
        if (!disposed)
          callbackRef.current?.onError?.('Failed to setup search listeners');
        return false;
      });
    return () => {
      disposed = true;
      unsubscribers.forEach(unsub => unsub());
    };
  }, [
    updateResult,
    updateProgress,
    finishSearch,
    handleSearchError,
    handleSearchStopped,
  ]);

  // Filter results by status
  const getResultsByStatus = useCallback(
    (status: SearchResultStatus) => {
      return results.filter(result => result.status === status);
    },
    [results]
  );

  // Get statistics
  const getStats = useCallback(() => {
    const found = results.filter(r => r.status === 'Found').length;
    const notFound = results.filter(r => r.status === 'NotFound').length;
    const errors = results.filter(r => r.status === 'Error').length;
    const pending = results.filter(r => r.status === 'Pending').length;

    return { found, notFound, errors, pending, total: results.length };
  }, [results]);

  // Clear search results
  const clearResults = useCallback(() => {
    setResults([]);
    setProgress({
      total_sites: 0,
      checked_sites: 0,
      found_count: 0,
      error_count: 0,
      current_site: undefined,
    });
    setQuery('');
  }, []);

  return {
    isSearching,
    searchType,
    query,
    results,
    progress,
    startSearch,
    stopSearch,
    searchNumber,
    outcome,
    clearResults,
    getResultsByStatus,
    getStats,
  };
};
