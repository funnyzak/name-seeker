import { useState, useCallback, useEffect } from 'react';
import { tauriApi } from '../services/tauriApi';
import { SearchType } from '../types';
import type {
  SearchResult,
  SearchProgress,
  SearchProgressPayload,
  SearchUpdatePayload,
  SearchFinished,
  SearchResultStatus
} from '../types';

export const useSearch = () => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchType, setSearchType] = useState<SearchType>(SearchType.USERNAME);
  const [query, setQuery] = useState<string>('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [progress, setProgress] = useState<SearchProgress>({
    total_sites: 0,
    checked_sites: 0,
    found_count: 0,
    error_count: 0,
    current_site: undefined
  });

  // Update single search result
  const updateResult = useCallback((payload: SearchUpdatePayload) => {
    setResults(prevResults => {
      const existingIndex = prevResults.findIndex(r => r.site === payload.site);

      const newResult: SearchResult = {
        site: payload.site,
        status: payload.status,
        url: payload.url,
        error: payload.error,
        category: payload.category,
        metadata: payload.metadata
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
    setProgress({
      total_sites: payload.total_sites,
      checked_sites: payload.checked_sites,
      found_count: payload.found_count,
      error_count: payload.error_count,
      current_site: payload.current_site
    });
  }, []);

  const finishSearch = useCallback((payload: SearchFinished) => {
    setIsSearching(false);

    setProgress(prev => ({
      ...prev,
      total_sites: payload.total_sites,
      checked_sites: payload.total_sites, 
      found_count: payload.found_count,
      current_site: undefined
    }));

    // Ensure all remaining Pending statuses are handled correctly
    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'NotFound' as SearchResultStatus,
            error: 'Check completed, user not found'
          };
        }
        return result;
      })
    );
  }, []);

  // Search error handling
  const handleSearchError = useCallback((error: string) => {
    console.error('Search error:', error);
    setIsSearching(false);
    // Error notification logic can be added here
  }, []);

  // Search stop handling
  const handleSearchStopped = useCallback(() => {
    setIsSearching(false);


    setResults(prevResults =>
      prevResults.map(result => {
        if (result.status === 'Pending') {
          return {
            ...result,
            status: 'Error' as SearchResultStatus,
            error: 'Search stopped by user'
          };
        }
        return result;
      })
    );

    // Update progress display to show search has stopped
    setProgress(prev => ({
      ...prev,
      current_site: undefined
    }));
  }, []);

  // Start search
  const startSearch = useCallback(async (
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
      throw new Error(type === SearchType.USERNAME ? 'Username cannot be empty' : 'Email cannot be empty');
    }

    // Validate format based on type
    const isValid = type === SearchType.USERNAME
      ? await tauriApi.validateUsername(searchQuery.trim())
      : await tauriApi.validateEmail(searchQuery.trim());
    
    if (!isValid) {
      throw new Error(type === SearchType.USERNAME ? 'Invalid username format' : 'Invalid email format');
    }

    // Reset state
    setSearchType(type);
    setQuery(searchQuery.trim());
    setResults([]);
    setProgress({
      total_sites: 0,
      checked_sites: 0,
      found_count: 0,
      error_count: 0,
      current_site: undefined
    });
    setIsSearching(true);

    try {
      await tauriApi.startSearch(searchQuery.trim(), type, options);
    } catch (error) {
      console.error('Failed to start search:', error);
      setIsSearching(false);
      throw error;
    }
  }, []);

  // Stop search
  const stopSearch = useCallback(async () => {
    try {
      const stopped = await tauriApi.stopSearch();
      return stopped;
    } catch (error) {
      console.error('Failed to stop search:', error);
      return false;
    }
  }, []);

  // Setup event listeners
  useEffect(() => {
    let unsubscribers: (() => void)[] = [];

    const setupListeners = async () => {
      try {
        const unsubUpdate = await tauriApi.onSearchUpdate(updateResult);
        const unsubProgress = await tauriApi.onSearchProgress(updateProgress);
        const unsubFinished = await tauriApi.onSearchFinished(finishSearch);
        const unsubError = await tauriApi.onSearchError(handleSearchError);
        const unsubStopped = await tauriApi.onSearchStopped(handleSearchStopped);

        unsubscribers = [unsubUpdate, unsubProgress, unsubFinished, unsubError, unsubStopped];
      } catch (error) {
        console.error('Failed to setup search listeners:', error);
      }
    };

    setupListeners();

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [updateResult, updateProgress, finishSearch, handleSearchError, handleSearchStopped]);

  // Filter results by status
  const getResultsByStatus = useCallback((status: SearchResultStatus) => {
    return results.filter(result => result.status === status);
  }, [results]);

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
      current_site: undefined
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
    clearResults,
    getResultsByStatus,
    getStats
  };
};