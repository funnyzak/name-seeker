// Search type enumeration
export enum SearchType {
  USERNAME = 'username',
  EMAIL = 'email'
}

// Search result status enumeration
export enum SearchResultStatus {
  FOUND = 'Found',
  NOT_FOUND = 'NotFound',
  ERROR = 'Error',
  PENDING = 'Pending'
}

// Single search result interface
export interface SearchResult {
  site: string;
  status: SearchResultStatus;
  url: string | null;
  error?: string;
  category?: string;
  metadata?: MetadataItem[];
}

// Metadata item interface
export interface MetadataItem {
  name: string;
  value: any;
  data_type: string;
}

// Search progress information
export interface SearchProgress {
  total_sites: number;
  checked_sites: number;
  found_count: number;
  error_count: number;
  current_site?: string;
}

// Search progress payload (sent from backend)
export interface SearchProgressPayload {
  total_sites: number;
  checked_sites: number;
  found_count: number;
  error_count: number;
  percentage: number;
  current_site?: string;
}

// Search completion information
export interface SearchFinished {
  total_sites: number;
  found_count: number;
  duration_ms: number;
}

// Tauri event payload types
export interface SearchUpdatePayload {
  site: string;
  status: SearchResultStatus;
  url: string | null;
  error?: string;
  category?: string;
  metadata?: MetadataItem[];
}

// Application state interface
export interface AppState {
  isFirstLaunch: boolean;
  disclaimerAccepted: boolean;
  isSearching: boolean;
  searchType: SearchType;
  query: string;  // username or email
  results: SearchResult[];
  progress: SearchProgress;
}

// Component Props types
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
  query: string;  // username or email
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

// Application information interface
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

// Export format enumeration
export enum ExportFormat {
  PDF = 'pdf',
  CSV = 'csv',
  JSON = 'json',
  TXT = 'txt'
}

// Export options interface
export interface ExportOptions {
  format: ExportFormat;
  username: string;  // username or email
  results: SearchResult[];
  timestamp?: string;
}

// Export button Props
export interface ExportButtonProps {
  results: SearchResult[];
  username: string;  // username or email
  disabled?: boolean;
  onExportSuccess?: (message: string) => void;
  onExportError?: (message: string) => void;
}