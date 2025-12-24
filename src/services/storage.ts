import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleDriveService } from './googleDrive';
import { AppSettings, MonthlyEntries } from '../types';

class StorageService {
  private isOnline: boolean = false;
  private accessToken: string | null = null;

  setOnlineMode(token: string | null) {
    this.accessToken = token;
    this.isOnline = !!token;
    googleDriveService.setAccessToken(token);
  }

  // Settings
  async saveSettings(settings: AppSettings): Promise<void> {
    // Always save locally
    await AsyncStorage.setItem('app_settings', JSON.stringify(settings));

    // Sync to Drive if online
    if (this.isOnline) {
      try {
        await googleDriveService.saveSettings(settings);
      } catch (error) {
        console.error('Failed to sync settings to Drive:', error);
      }
    }
  }

  async loadSettings(): Promise<AppSettings | null> {
    // Try to load from Drive first if online
    if (this.isOnline) {
      try {
        const driveSettings = await googleDriveService.loadSettings();
        if (driveSettings) {
          // Update local cache
          await AsyncStorage.setItem('app_settings', JSON.stringify(driveSettings));
          return driveSettings;
        }
      } catch (error) {
        console.error('Failed to load settings from Drive:', error);
      }
    }

    // Fall back to local storage
    const local = await AsyncStorage.getItem('app_settings');
    return local ? JSON.parse(local) : null;
  }

  // Entries
  async saveMonthlyEntries(data: MonthlyEntries): Promise<void> {
    const key = `entries_${data.month}`;

    // Always save locally
    await AsyncStorage.setItem(key, JSON.stringify(data));

    // Sync to Drive if online
    if (this.isOnline) {
      try {
        await googleDriveService.saveMonthlyEntries(data);
      } catch (error) {
        console.error('Failed to sync entries to Drive:', error);
      }
    }
  }

  async loadMonthlyEntries(month: string): Promise<MonthlyEntries | null> {
    const key = `entries_${month}`;

    // Try to load from Drive first if online
    if (this.isOnline) {
      try {
        const driveData = await googleDriveService.loadMonthlyEntries(month);
        if (driveData) {
          // Update local cache
          await AsyncStorage.setItem(key, JSON.stringify(driveData));
          return driveData;
        }
      } catch (error) {
        console.error('Failed to load entries from Drive:', error);
      }
    }

    // Fall back to local storage
    const local = await AsyncStorage.getItem(key);
    return local ? JSON.parse(local) : null;
  }

  // Sync all local data to Drive (call after login)
  async syncToCloud(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Sync settings
      const settingsJson = await AsyncStorage.getItem('app_settings');
      if (settingsJson) {
        const settings: AppSettings = JSON.parse(settingsJson);
        await googleDriveService.saveSettings(settings);
      }

      // Find and sync all entry months
      const keys = await AsyncStorage.getAllKeys();
      const entryKeys = keys.filter((k) => k.startsWith('entries_'));

      for (const key of entryKeys) {
        const dataJson = await AsyncStorage.getItem(key);
        if (dataJson) {
          const data: MonthlyEntries = JSON.parse(dataJson);
          await googleDriveService.saveMonthlyEntries(data);
        }
      }
    } catch (error) {
      console.error('Sync to cloud failed:', error);
      throw error;
    }
  }

  // Sync all cloud data to local (call after login)
  async syncFromCloud(): Promise<void> {
    if (!this.isOnline) return;

    try {
      // Sync settings
      const driveSettings = await googleDriveService.loadSettings();
      if (driveSettings) {
        await AsyncStorage.setItem('app_settings', JSON.stringify(driveSettings));
      }

      // Get list of entry files from Drive
      const months = await googleDriveService.listMonthlyEntryFiles();
      for (const month of months) {
        const data = await googleDriveService.loadMonthlyEntries(month);
        if (data) {
          await AsyncStorage.setItem(`entries_${month}`, JSON.stringify(data));
        }
      }
    } catch (error) {
      console.error('Sync from cloud failed:', error);
      throw error;
    }
  }
}

export const storageService = new StorageService();
