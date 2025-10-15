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

// Tauri API 服务类
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
   * 检查是否为首次启动
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
   * 设置用户已接受免责声明
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
   * 开始搜索
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
   * 停止当前搜索
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
   * 获取搜索统计信息
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
   * 获取可用网站类别
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
   * 验证用户名格式
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
   * 验证邮箱格式
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
   * 获取应用信息
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
   * 监听搜索更新事件
   */
  onSearchUpdate(callback: (payload: SearchUpdatePayload) => void): Promise<() => void> {
    return listen('search-update', (event) => {
      callback(event.payload as SearchUpdatePayload);
    });
  }

  /**
   * 监听搜索完成事件
   */
  onSearchFinished(callback: (payload: SearchFinished) => void): Promise<() => void> {
    return listen('search-finished', (event) => {
      callback(event.payload as SearchFinished);
    });
  }

  /**
   * 监听搜索进度事件
   */
  onSearchProgress(callback: (payload: SearchProgressPayload) => void): Promise<() => void> {
    return listen('search-progress', (event) => {
      callback(event.payload as SearchProgressPayload);
    });
  }

  /**
   * 监听搜索错误事件
   */
  onSearchError(callback: (error: string) => void): Promise<() => void> {
    return listen('search-error', (event) => {
      callback(event.payload as string);
    });
  }

  /**
   * 监听搜索停止事件
   */
  onSearchStopped(callback: () => void): Promise<() => void> {
    return listen('search-stopped', () => {
      callback();
    });
  }

  /**
   * 打开外部链接
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
   * 打开文件所在目录
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
   * 导出搜索结果
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
   * 复制文本到剪贴板
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

// 导出单例实例
export const tauriApi = TauriApiService.getInstance();

// 导出便捷函数
export const exportResults = (options: ExportOptions) => tauriApi.exportResults(options);