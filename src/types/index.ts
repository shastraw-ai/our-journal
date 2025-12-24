// Family member configuration
export interface FamilyMember {
  id: string;
  name: string;
  color: string; // hex color for UI theming
  sections: Section[];
}

// Section within a family member's journal
export interface Section {
  id: string;
  name: string;
  tasks: Task[];
}

// Task types for daily tracking
export type TaskType = 'checkbox' | 'text' | 'numeric';

export interface Task {
  id: string;
  name: string;
  type: TaskType;
  unit?: string; // for numeric tasks (e.g., "minutes", "glasses", "pages")
}

// Daily entry for a family member
export interface DailyEntry {
  date: string; // ISO date format "2025-12-24"
  memberId: string;
  sectionEntries: SectionEntry[];
  lastModified: string; // ISO timestamp
}

// Entry for a single section
export interface SectionEntry {
  sectionId: string;
  taskResponses: TaskResponse[];
  notes: string; // free-form text for the section
}

// Individual task response
export interface TaskResponse {
  taskId: string;
  value: boolean | string | number; // type depends on Task.type
}

// App settings stored in Google Drive
export interface AppSettings {
  members: FamilyMember[];
  lastModified: string;
}

// Monthly entries file structure
export interface MonthlyEntries {
  month: string; // "2025-12"
  entries: DailyEntry[];
  lastModified: string;
}

// Auth state
export interface AuthState {
  isAuthenticated: boolean;
  isGuest: boolean;
  accessToken: string | null;
  refreshToken: string | null;
  userEmail: string | null;
  userName: string | null;
}

// Sync state
export interface SyncState {
  lastSyncTime: string | null;
  isSyncing: boolean;
  syncError: string | null;
}
