// 搜索结果状态枚举
export enum SearchResultStatus {
  FOUND = 'Found',
  NOT_FOUND = 'NotFound',
  ERROR = 'Error',
  PENDING = 'Pending'
}

// 单个搜索结果接口
export interface SearchResult {
  site: string;
  status: SearchResultStatus;
  url: string | null;
  error?: string;
}

// 搜索进度信息
export interface SearchProgress {
  total_sites: number;
  checked_sites: number;
  found_count: number;
  error_count: number;
}

// 搜索完成信息
export interface SearchFinished {
  total_sites: number;
  found_count: number;
  duration_ms: number;
}

// Tauri事件载荷类型
export interface SearchUpdatePayload {
  site: string;
  status: SearchResultStatus;
  url: string | null;
  error?: string;
}

// 应用状态接口
export interface AppState {
  isFirstLaunch: boolean;
  disclaimerAccepted: boolean;
  isSearching: boolean;
  username: string;
  results: SearchResult[];
  progress: SearchProgress;
}

// 组件Props类型
export interface DisclaimerModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export interface SearchFormProps {
  isSearching: boolean;
  onSubmit: (username: string) => void;
}

export interface ResultsDisplayProps {
  results: SearchResult[];
  progress: SearchProgress;
  isSearching: boolean;
}

export interface ResultItemProps {
  result: SearchResult;
}

export interface ProgressIndicatorProps {
  progress: SearchProgress;
  isSearching: boolean;
}