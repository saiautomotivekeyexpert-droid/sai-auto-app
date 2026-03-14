import { google } from 'googleapis';

/**
 * GoogleService: Handles interactions with Google Sheets (Database) and Google Drive (Storage).
 * Requires credentials.json in the root directory.
 */
export class GoogleService {
  private static auth: any;
  private static sheets: any;
  private static drive: any;

  private static async init() {
    if (this.sheets) return;

    try {
      // In a real environment, you'd provide the key file path or environment variables.
      // We use service account auth.
      this.auth = new google.auth.GoogleAuth({
        keyFile: 'credentials.json',
        scopes: [
          'https://www.googleapis.com/auth/spreadsheets',
          'https://www.googleapis.com/auth/drive.file',
        ],
      });

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.warn("Google API Auth failed. Ensure credentials.json is present.", error);
    }
  }

  /**
   * Appends a new job record to the Google Sheet.
   */
  static async addJob(spreadsheetId: string, rowData: any[]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    const response = await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Jobs!A:Z',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [rowData],
      },
    });
    return response.data;
  }

  /**
   * Uploads an image to a specific Google Drive folder.
   */
  static async uploadImage(folderId: string, fileName: string, mimeType: string, body: Buffer) {
    await this.init();
    if (!this.drive) throw new Error("Drive API not initialized");

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body,
      },
      fields: 'id, webViewLink',
    });
    return response.data;
  }

  /**
   * Fetches all jobs from the Spreadsheet.
   */
  static async getJobs(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Jobs!A:Z',
    });
    return response.data.values;
  }
}
