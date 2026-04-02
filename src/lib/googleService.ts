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
      const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
      const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');

      if (clientEmail && privateKey) {
        // PROD: Use environment variables (Vercel compatible)
        this.auth = new google.auth.GoogleAuth({
          credentials: {
            client_email: clientEmail,
            private_key: privateKey,
          },
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ],
        });
      } else {
        // DEV: Fallback to local file
        this.auth = new google.auth.GoogleAuth({
          keyFile: 'credentials.json',
          scopes: [
            'https://www.googleapis.com/auth/spreadsheets',
            'https://www.googleapis.com/auth/drive.file',
          ],
        });
      }

      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
      this.drive = google.drive({ version: 'v3', auth: this.auth });
    } catch (error) {
      console.warn("Google API Auth failed. Ensure credentials are set.", error);
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

    const { Readable } = require('stream');

    const response = await this.drive.files.create({
      requestBody: {
        name: fileName,
        parents: [folderId],
      },
      media: {
        mimeType,
        body: Readable.from(body), // Must be a stream for the googleapis SDK
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
