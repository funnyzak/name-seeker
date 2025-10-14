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
  category?: string;
  metadata?: MetadataItem[];
}

// 元数据项接口
export interface MetadataItem {
  name: string;
  value: any;
  data_type: string;
}

// 搜索进度信息
export interface SearchProgress {
  total_sites: number;
  checked_sites: number;
  found_count: number;
  error_count: number;
  current_site?: string;
}

// 搜索进度载荷（从后端发送）
export interface SearchProgressPayload {
  total_sites: number;
  checked_sites: number;
  found_count: number;
  error_count: number;
  percentage: number;
  current_site?: string;
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
  onStopSearch?: () => void;
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

export interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}