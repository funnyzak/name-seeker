import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import type {
  SearchUpdatePayload,
  SearchFinished,
  SearchProgress
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
   * 开始搜索用户名
   */
  async startSearch(username: string): Promise<void> {
    try {
      await invoke('start_search', { username });
    } catch (error) {
      console.error('Error starting search:', error);
      throw error;
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
  onSearchProgress(callback: (payload: SearchProgress) => void): Promise<() => void> {
    return listen('search-progress', (event) => {
      callback(event.payload as SearchProgress);
    });
  }

  /**
   * 打开外部链接
   */
  async openUrl(url: string): Promise<void> {
    try {
      await invoke('plugin:opener|open', { path: url });
    } catch (error) {
      console.error('Error opening URL:', error);
      throw error;
    }
  }
}

// 导出单例实例
export const tauriApi = TauriApiService.getInstance();