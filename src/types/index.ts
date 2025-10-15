// 搜索类型枚举
export enum SearchType {
  USERNAME = 'username',
  EMAIL = 'email'
}

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
  category?: string;
  metadata?: MetadataItem[];
}

// 应用状态接口
export interface AppState {
  isFirstLaunch: boolean;
  disclaimerAccepted: boolean;
  isSearching: boolean;
  searchType: SearchType;
  query: string;  // 用户名或邮箱
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
  searchType: SearchType;
  onSubmit: (query: string, searchType: SearchType) => void;
  onStopSearch?: () => void;
  searchHistory?: string[];
  onAddToHistory?: (query: string) => void;
  onRemoveFromHistory?: (query: string) => void;
  onClearHistory?: () => void;
  onError?: (message: string) => void;
  onWarning?: (message: string) => void;
}

export interface ResultsDisplayProps {
  results: SearchResult[];
  progress: SearchProgress;
  isSearching: boolean;
  query: string;  // 用户名或邮箱
  onExportSuccess?: (message: string) => void;
  onExportError?: (message: string) => void;
  onClearResults?: () => void;
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

// 应用信息接口
export interface AppInfo {
  name: string;
  version: string;
  identifier: string;
  description: string;
  long_description?: string;
  copyright?: string;
  category?: string;
  authors: string;
  build_date: string;
  tauri_version: string;
  build_profile: string;
}

// 导出格式枚举
export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  TXT = 'txt'
}

// 导出选项接口
export interface ExportOptions {
  format: ExportFormat;
  username: string;  // 保持向后兼容，实际可以是用户名或邮箱
  results: SearchResult[];
  timestamp?: string;
}

// 导出按钮Props
export interface ExportButtonProps {
  results: SearchResult[];
  username: string;  // 保持向后兼容，实际可以是用户名或邮箱
  disabled?: boolean;
  onExportSuccess?: (message: string) => void;
  onExportError?: (message: string) => void;
}