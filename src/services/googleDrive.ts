import { AppSettings, MonthlyEntries } from '../types';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API_BASE = 'https://www.googleapis.com/upload/drive/v3';
const APP_FOLDER_NAME = 'OurJournal';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

class GoogleDriveService {
  private accessToken: string | null = null;
  private appFolderId: string | null = null;
  private entriesFolderId: string | null = null;

  setAccessToken(token: string | null) {
    this.accessToken = token;
    // Reset folder IDs when token changes
    this.appFolderId = null;
    this.entriesFolderId = null;
  }

  private async request(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.accessToken) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `HTTP ${response.status}`);
    }

    return response;
  }

  private async findOrCreateFolder(name: string, parentId?: string): Promise<string> {
    // Search for existing folder
    let query = `name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`;
    if (parentId) {
      query += ` and '${parentId}' in parents`;
    }

    const searchResponse = await this.request(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id,name)`
    );
    const searchResult = await searchResponse.json();

    if (searchResult.files && searchResult.files.length > 0) {
      return searchResult.files[0].id;
    }

    // Create folder if it doesn't exist
    const metadata: Record<string, any> = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (parentId) {
      metadata.parents = [parentId];
    }

    const createResponse = await this.request(`${DRIVE_API_BASE}/files`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });
    const created = await createResponse.json();
    return created.id;
  }

  private async ensureAppFolder(): Promise<string> {
    if (this.appFolderId) {
      return this.appFolderId;
    }
    this.appFolderId = await this.findOrCreateFolder(APP_FOLDER_NAME);
    return this.appFolderId;
  }

  private async ensureEntriesFolder(): Promise<string> {
    if (this.entriesFolderId) {
      return this.entriesFolderId;
    }
    const appFolderId = await this.ensureAppFolder();
    this.entriesFolderId = await this.findOrCreateFolder('entries', appFolderId);
    return this.entriesFolderId;
  }

  private async findFile(name: string, parentId: string): Promise<string | null> {
    const query = `name='${name}' and '${parentId}' in parents and trashed=false`;
    const response = await this.request(
      `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(id)`
    );
    const result = await response.json();
    return result.files?.[0]?.id || null;
  }

  private async uploadFile(
    name: string,
    content: string,
    parentId: string,
    existingFileId?: string | null
  ): Promise<string> {
    const metadata = {
      name,
      mimeType: 'application/json',
      ...(existingFileId ? {} : { parents: [parentId] }),
    };

    const boundary = '-------314159265358979323846';
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const body =
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      content +
      closeDelimiter;

    const url = existingFileId
      ? `${UPLOAD_API_BASE}/files/${existingFileId}?uploadType=multipart`
      : `${UPLOAD_API_BASE}/files?uploadType=multipart`;

    const response = await this.request(url, {
      method: existingFileId ? 'PATCH' : 'POST',
      headers: {
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    const result = await response.json();
    return result.id;
  }

  private async downloadFile(fileId: string): Promise<string> {
    const response = await this.request(
      `${DRIVE_API_BASE}/files/${fileId}?alt=media`
    );
    return await response.text();
  }

  // Public API

  async saveSettings(settings: AppSettings): Promise<void> {
    const appFolderId = await this.ensureAppFolder();
    const existingId = await this.findFile('settings.json', appFolderId);
    await this.uploadFile('settings.json', JSON.stringify(settings), appFolderId, existingId);
  }

  async loadSettings(): Promise<AppSettings | null> {
    try {
      const appFolderId = await this.ensureAppFolder();
      const fileId = await this.findFile('settings.json', appFolderId);
      if (!fileId) {
        return null;
      }
      const content = await this.downloadFile(fileId);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load settings from Drive:', error);
      return null;
    }
  }

  async saveMonthlyEntries(data: MonthlyEntries): Promise<void> {
    const entriesFolderId = await this.ensureEntriesFolder();
    const fileName = `${data.month}.json`;
    const existingId = await this.findFile(fileName, entriesFolderId);
    await this.uploadFile(fileName, JSON.stringify(data), entriesFolderId, existingId);
  }

  async loadMonthlyEntries(month: string): Promise<MonthlyEntries | null> {
    try {
      const entriesFolderId = await this.ensureEntriesFolder();
      const fileName = `${month}.json`;
      const fileId = await this.findFile(fileName, entriesFolderId);
      if (!fileId) {
        return null;
      }
      const content = await this.downloadFile(fileId);
      return JSON.parse(content);
    } catch (error) {
      console.error('Failed to load monthly entries from Drive:', error);
      return null;
    }
  }

  async listMonthlyEntryFiles(): Promise<string[]> {
    try {
      const entriesFolderId = await this.ensureEntriesFolder();
      const query = `'${entriesFolderId}' in parents and trashed=false`;
      const response = await this.request(
        `${DRIVE_API_BASE}/files?q=${encodeURIComponent(query)}&fields=files(name)`
      );
      const result = await response.json();
      return (result.files || [])
        .map((f: DriveFile) => f.name.replace('.json', ''))
        .filter((name: string) => /^\d{4}-\d{2}$/.test(name));
    } catch (error) {
      console.error('Failed to list monthly entries:', error);
      return [];
    }
  }
}

export const googleDriveService = new GoogleDriveService();
