import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  SearchUpdatePayload,
  SearchFinished,
  SearchProgressPayload,
  ExportOptions,
  SearchType,
  AppInfo
} from '../types';

// Tauri API service class
export class TauriApiService {
  private static instance: TauriApiService;

  private constructor() {}

  static getInstance(): TauriApiService {
    if (!TauriApiService.instance) {
      TauriApiService.instance = new TauriApiService();
    }
    return TauriApiService.instance;
  }

  /**
   * Check if it's the first launch
   */
  async isFirstLaunch(): Promise<boolean> {
    try {
      return await invoke<boolean>('is_first_launch');
    } catch (error) {
      console.error('Error checking first launch:', error);
      return false;
    }
  }

  /**
   * Set user disclaimer acceptance
   */
  async setDisclaimerAccepted(): Promise<void> {
    try {
      await invoke('set_disclaimer_accepted');
    } catch (error) {
      console.error('Error setting disclaimer accepted:', error);
      throw error;
    }
  }

  /**
   * Start search
   */
  async startSearch(
    query: string,
    searchType: SearchType,
    options?: {
      maxConcurrentRequests?: number;
      timeoutSeconds?: number;
      excludeNsfw?: boolean;
      categoryFilter?: string;
    }
  ): Promise<void> {
    try {
      await invoke('start_search', {
        query,
        searchType,
        maxConcurrentRequests: options?.maxConcurrentRequests,
        timeoutSeconds: options?.timeoutSeconds,
        excludeNsfw: options?.excludeNsfw,
        categoryFilter: options?.categoryFilter
      });
    } catch (error) {
      console.error('Error starting search:', error);
      throw error;
    }
  }

  /**
   * Stop current search
   */
  async stopSearch(): Promise<boolean> {
    try {
      return await invoke<boolean>('stop_search');
    } catch (error) {
      console.error('Error stopping search:', error);
      return false;
    }
  }

  /**
   * Get search statistics
   */
  async getSearchStats(): Promise<any> {
    try {
      return await invoke('get_search_stats');
    } catch (error) {
      console.error('Error getting search stats:', error);
      return null;
    }
  }

  /**
   * Get available website categories
   */
  async getCategories(): Promise<string[]> {
    try {
      return await invoke<string[]>('get_categories');
    } catch (error) {
      console.error('Error getting categories:', error);
      return [];
    }
  }

  /**
   * Validate username format
   */
  async validateUsername(username: string): Promise<boolean> {
    try {
      return await invoke<boolean>('validate_username_format', { username });
    } catch (error) {
      console.error('Error validating username:', error);
      return false;
    }
  }

  /**
   * Validate email format
   */
  async validateEmail(email: string): Promise<boolean> {
    try {
      return await invoke<boolean>('validate_email_format', { email });
    } catch (error) {
      console.error('Error validating email:', error);
      return false;
    }
  }

  /**
   * Get application information
   */
  async getAppInfo(): Promise<AppInfo | null> {
    try {
      return await invoke<AppInfo>('get_app_info');
    } catch (error) {
      console.error('Error getting app info:', error);
      return null;
    }
  }

  /**
   * Listen for search update events
   */
  onSearchUpdate(callback: (payload: SearchUpdatePayload) => void): Promise<() => void> {
    return listen('search-update', (event) => {
      callback(event.payload as SearchUpdatePayload);
    });
  }

  /**
   * Listen for search completion events
   */
  onSearchFinished(callback: (payload: SearchFinished) => void): Promise<() => void> {
    return listen('search-finished', (event) => {
      callback(event.payload as SearchFinished);
    });
  }

  /**
   * Listen for search progress events
   */
  onSearchProgress(callback: (payload: SearchProgressPayload) => void): Promise<() => void> {
    return listen('search-progress', (event) => {
      callback(event.payload as SearchProgressPayload);
    });
  }

  /**
   * Listen for search error events
   */
  onSearchError(callback: (error: string) => void): Promise<() => void> {
    return listen('search-error', (event) => {
      callback(event.payload as string);
    });
  }

  /**
   * Listen for search stop events
   */
  onSearchStopped(callback: () => void): Promise<() => void> {
    return listen('search-stopped', () => {
      callback();
    });
  }

  /**
   * Open external link
   */
  async openUrl(url: string): Promise<void> {
    try {
      await invoke('open_url', { url });
    } catch (error) {
      console.error('Error opening URL:', error);
      throw error;
    }
  }

  /**
   * Open file directory
   */
  async openDirectory(path: string): Promise<void> {
    try {
      await invoke('open_directory', { path });
    } catch (error) {
      console.error('Error opening directory:', error);
      throw error;
    }
  }

  /**
   * Export search results
   */
  async exportResults(options: ExportOptions): Promise<string> {
    try {
      const filePath = await invoke<string>('export_results_cmd', {
        options: {
          format: options.format,
          username: options.username,
          results: options.results,
          timestamp: options.timestamp
        }
      });
      return filePath;
    } catch (error) {
      console.error('Error exporting results:', error);
      throw error;
    }
  }

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string): Promise<void> {
    try {
      await invoke('copy_to_clipboard', { text });
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const tauriApi = TauriApiService.getInstance();

// Export convenience functions
export const exportResults = (options: ExportOptions) => tauriApi.exportResults(options);