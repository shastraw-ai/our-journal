import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { format, parseISO } from 'date-fns';
import { DailyEntry, SectionEntry, TaskResponse, MonthlyEntries } from '../types';

interface EntriesStore {
  entries: Map<string, DailyEntry>; // key: "memberId_date"
  isLoading: boolean;
  currentDate: string; // ISO date string

  // Navigation
  setCurrentDate: (date: string) => void;

  // Entry operations
  getEntry: (memberId: string, date: string) => DailyEntry | undefined;
  setEntry: (entry: DailyEntry) => void;
  updateTaskResponse: (
    memberId: string,
    date: string,
    sectionId: string,
    taskId: string,
    value: boolean | string | number
  ) => void;
  updateSectionNotes: (
    memberId: string,
    date: string,
    sectionId: string,
    notes: string
  ) => void;

  // Persistence
  loadEntriesForMonth: (month: string) => Promise<void>;
  saveEntriesToStorage: () => Promise<void>;

  // For dashboard - get entries for date range
  getEntriesForRange: (memberId: string, startDate: string, endDate: string) => DailyEntry[];

  // Reset
  resetStore: () => void;
}

const getMonthKey = (date: string) => format(parseISO(date), 'yyyy-MM');
const getEntryKey = (memberId: string, date: string) => `${memberId}_${date}`;

export const useEntriesStore = create<EntriesStore>((set, get) => ({
  entries: new Map(),
  isLoading: false,
  currentDate: format(new Date(), 'yyyy-MM-dd'),

  setCurrentDate: (date) => {
    set({ currentDate: date });
    // Load entries for the new month if needed
    get().loadEntriesForMonth(getMonthKey(date));
  },

  getEntry: (memberId, date) => {
    return get().entries.get(getEntryKey(memberId, date));
  },

  setEntry: (entry) => {
    const key = getEntryKey(entry.memberId, entry.date);
    set((state) => {
      const newEntries = new Map(state.entries);
      newEntries.set(key, { ...entry, lastModified: new Date().toISOString() });
      return { entries: newEntries };
    });
    get().saveEntriesToStorage();
  },

  updateTaskResponse: (memberId, date, sectionId, taskId, value) => {
    const key = getEntryKey(memberId, date);
    const existingEntry = get().entries.get(key);

    if (existingEntry) {
      // Update existing entry
      const updatedSectionEntries = existingEntry.sectionEntries.map((se) => {
        if (se.sectionId === sectionId) {
          const existingTask = se.taskResponses.find((tr) => tr.taskId === taskId);
          if (existingTask) {
            return {
              ...se,
              taskResponses: se.taskResponses.map((tr) =>
                tr.taskId === taskId ? { ...tr, value } : tr
              ),
            };
          } else {
            return {
              ...se,
              taskResponses: [...se.taskResponses, { taskId, value }],
            };
          }
        }
        return se;
      });

      // Check if section exists, if not add it
      const sectionExists = existingEntry.sectionEntries.some(
        (se) => se.sectionId === sectionId
      );
      if (!sectionExists) {
        updatedSectionEntries.push({
          sectionId,
          taskResponses: [{ taskId, value }],
          notes: '',
        });
      }

      const updatedEntry: DailyEntry = {
        ...existingEntry,
        sectionEntries: updatedSectionEntries,
        lastModified: new Date().toISOString(),
      };
      get().setEntry(updatedEntry);
    } else {
      // Create new entry
      const newEntry: DailyEntry = {
        date,
        memberId,
        sectionEntries: [
          {
            sectionId,
            taskResponses: [{ taskId, value }],
            notes: '',
          },
        ],
        lastModified: new Date().toISOString(),
      };
      get().setEntry(newEntry);
    }
  },

  updateSectionNotes: (memberId, date, sectionId, notes) => {
    const key = getEntryKey(memberId, date);
    const existingEntry = get().entries.get(key);

    if (existingEntry) {
      const sectionExists = existingEntry.sectionEntries.some(
        (se) => se.sectionId === sectionId
      );

      let updatedSectionEntries: SectionEntry[];
      if (sectionExists) {
        updatedSectionEntries = existingEntry.sectionEntries.map((se) =>
          se.sectionId === sectionId ? { ...se, notes } : se
        );
      } else {
        updatedSectionEntries = [
          ...existingEntry.sectionEntries,
          { sectionId, taskResponses: [], notes },
        ];
      }

      const updatedEntry: DailyEntry = {
        ...existingEntry,
        sectionEntries: updatedSectionEntries,
        lastModified: new Date().toISOString(),
      };
      get().setEntry(updatedEntry);
    } else {
      const newEntry: DailyEntry = {
        date,
        memberId,
        sectionEntries: [{ sectionId, taskResponses: [], notes }],
        lastModified: new Date().toISOString(),
      };
      get().setEntry(newEntry);
    }
  },

  loadEntriesForMonth: async (month) => {
    try {
      set({ isLoading: true });
      const storageKey = `entries_${month}`;
      const stored = await AsyncStorage.getItem(storageKey);

      if (stored) {
        const monthlyData: MonthlyEntries = JSON.parse(stored);
        set((state) => {
          const newEntries = new Map(state.entries);
          monthlyData.entries.forEach((entry) => {
            newEntries.set(getEntryKey(entry.memberId, entry.date), entry);
          });
          return { entries: newEntries, isLoading: false };
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load entries:', error);
      set({ isLoading: false });
    }
  },

  saveEntriesToStorage: async () => {
    try {
      const entries = get().entries;

      // Group entries by month
      const byMonth = new Map<string, DailyEntry[]>();
      entries.forEach((entry) => {
        const month = getMonthKey(entry.date);
        if (!byMonth.has(month)) {
          byMonth.set(month, []);
        }
        byMonth.get(month)!.push(entry);
      });

      // Save each month's data, merging with existing data to prevent data loss
      const savePromises: Promise<void>[] = [];
      byMonth.forEach((monthEntries, month) => {
        const saveMonth = async () => {
          const storageKey = `entries_${month}`;

          // Load existing data for this month to merge with
          const existingJson = await AsyncStorage.getItem(storageKey);
          let mergedEntries = [...monthEntries];

          if (existingJson) {
            const existingData: MonthlyEntries = JSON.parse(existingJson);
            // Create a map of new entries by key for quick lookup
            const newEntriesMap = new Map<string, DailyEntry>();
            monthEntries.forEach((entry) => {
              newEntriesMap.set(getEntryKey(entry.memberId, entry.date), entry);
            });

            // Add existing entries that aren't being overwritten
            existingData.entries.forEach((existingEntry) => {
              const key = getEntryKey(existingEntry.memberId, existingEntry.date);
              if (!newEntriesMap.has(key)) {
                mergedEntries.push(existingEntry);
              }
            });
          }

          const monthlyData: MonthlyEntries = {
            month,
            entries: mergedEntries,
            lastModified: new Date().toISOString(),
          };
          await AsyncStorage.setItem(storageKey, JSON.stringify(monthlyData));
        };
        savePromises.push(saveMonth());
      });

      await Promise.all(savePromises);
    } catch (error) {
      console.error('Failed to save entries:', error);
    }
  },

  getEntriesForRange: (memberId, startDate, endDate) => {
    const entries = get().entries;
    const result: DailyEntry[] = [];

    entries.forEach((entry) => {
      if (
        entry.memberId === memberId &&
        entry.date >= startDate &&
        entry.date <= endDate
      ) {
        result.push(entry);
      }
    });

    return result.sort((a, b) => a.date.localeCompare(b.date));
  },

  resetStore: () => {
    set({
      entries: new Map(),
      isLoading: false,
      currentDate: format(new Date(), 'yyyy-MM-dd'),
    });
  },
}));
