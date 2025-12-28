import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { FamilyMember, Section, Task, TaskType, AppSettings, TaskSchedule, TaskReminder } from '../types';
import { notificationService } from '../services/notificationService';

const generateId = () => Crypto.randomUUID();

interface SettingsStore {
  members: FamilyMember[];
  isLoading: boolean;
  lastModified: string | null;

  // Member operations
  addMember: (name: string, color: string) => void;
  updateMember: (id: string, updates: Partial<Pick<FamilyMember, 'name' | 'color'>>) => void;
  deleteMember: (id: string) => void;

  // Section operations
  addSection: (memberId: string, name: string) => void;
  updateSection: (memberId: string, sectionId: string, name: string) => void;
  deleteSection: (memberId: string, sectionId: string) => void;

  // Task operations
  addTask: (memberId: string, sectionId: string, name: string, type: TaskType, unit?: string, schedule?: TaskSchedule, reminder?: TaskReminder) => void;
  updateTask: (memberId: string, sectionId: string, taskId: string, updates: Partial<Pick<Task, 'name' | 'type' | 'unit' | 'schedule' | 'reminder'>>) => void;
  deleteTask: (memberId: string, sectionId: string, taskId: string) => void;

  // Notification sync
  syncNotifications: () => Promise<void>;

  // Persistence
  loadSettings: () => Promise<void>;
  saveSettings: () => Promise<void>;
  importSettings: (settings: AppSettings) => void;
  exportSettings: () => AppSettings;

  // Reset
  resetStore: () => void;
}

const STORAGE_KEY = 'app_settings';

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  members: [],
  isLoading: true,
  lastModified: null,

  addMember: (name, color) => {
    const newMember: FamilyMember = {
      id: generateId(),
      name,
      color,
      sections: [],
    };
    set((state) => ({
      members: [...state.members, newMember],
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  updateMember: (id, updates) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === id ? { ...m, ...updates } : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  deleteMember: (id) => {
    set((state) => ({
      members: state.members.filter((m) => m.id !== id),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  addSection: (memberId, name) => {
    const newSection: Section = {
      id: generateId(),
      name,
      tasks: [],
    };
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? { ...m, sections: [...m.sections, newSection] }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  updateSection: (memberId, sectionId, name) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              sections: m.sections.map((s) =>
                s.id === sectionId ? { ...s, name } : s
              ),
            }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  deleteSection: (memberId, sectionId) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? { ...m, sections: m.sections.filter((s) => s.id !== sectionId) }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  addTask: (memberId, sectionId, name, type, unit, schedule, reminder) => {
    const newTask: Task = {
      id: generateId(),
      name,
      type,
      unit,
      schedule,
      reminder,
    };
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              sections: m.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, tasks: [...s.tasks, newTask] }
                  : s
              ),
            }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
    get().syncNotifications();
  },

  updateTask: (memberId, sectionId, taskId, updates) => {
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              sections: m.sections.map((s) =>
                s.id === sectionId
                  ? {
                      ...s,
                      tasks: s.tasks.map((t) =>
                        t.id === taskId ? { ...t, ...updates } : t
                      ),
                    }
                  : s
              ),
            }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
    get().syncNotifications();
  },

  deleteTask: (memberId, sectionId, taskId) => {
    // Cancel notifications for this task before deleting
    notificationService.cancelTaskReminders(memberId, sectionId, taskId);
    set((state) => ({
      members: state.members.map((m) =>
        m.id === memberId
          ? {
              ...m,
              sections: m.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, tasks: s.tasks.filter((t) => t.id !== taskId) }
                  : s
              ),
            }
          : m
      ),
      lastModified: new Date().toISOString(),
    }));
    get().saveSettings();
  },

  syncNotifications: async () => {
    const { members } = get();
    await notificationService.rescheduleAllReminders(members);
  },

  loadSettings: async () => {
    try {
      set({ isLoading: true });
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) {
        const settings: AppSettings = JSON.parse(stored);
        set({
          members: settings.members,
          lastModified: settings.lastModified,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      set({ isLoading: false });
    }
  },

  saveSettings: async () => {
    try {
      const state = get();
      const settings: AppSettings = {
        members: state.members,
        lastModified: state.lastModified || new Date().toISOString(),
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  importSettings: (settings) => {
    set({
      members: settings.members,
      lastModified: settings.lastModified,
    });
    get().saveSettings();
    get().syncNotifications();
  },

  exportSettings: () => {
    const state = get();
    return {
      members: state.members,
      lastModified: state.lastModified || new Date().toISOString(),
    };
  },

  resetStore: () => {
    set({
      members: [],
      isLoading: false,
      lastModified: null,
    });
  },
}));
