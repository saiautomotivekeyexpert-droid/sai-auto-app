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
   * Helper to ensure a specific sheet exists in the spreadsheet.
   */
  private static async ensureSheetExists(spreadsheetId: string, sheetName: string) {
    try {
      await this.sheets.spreadsheets.get({
        spreadsheetId,
        ranges: [sheetName],
      });
    } catch (error: any) {
      if (error.status === 400 || error.message.includes('Unable to parse range')) {
        console.log(`Creating missing sheet: ${sheetName}`);
        try {
          await this.sheets.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
              requests: [{ addSheet: { properties: { title: sheetName } } }],
            },
          });
        } catch (createError) {
          console.error(`Failed to create sheet ${sheetName}:`, createError);
        }
      }
    }
  }

  /**
   * Adds or updates a setting record in a dedicated 'Settings' sheet.
   */
  static async addSetting(spreadsheetId: string, rowData: any[]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.ensureSheetExists(spreadsheetId, 'Settings');

    const settingId = rowData[0];
    
    // 1. Check if setting exists in 'Settings' sheet
    let rowIndex = -1;
    try {
      const existing = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Settings!A:A',
      });
      const rows = existing.data.values || [];
      rowIndex = rows.findIndex((row: any[]) => row[0] === settingId);
    } catch (e) {
      // Sheet might not exist yet, we'll handle it during append
    }

    if (rowIndex !== -1) {
      const actualRowNumber = rowIndex + 1;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Settings!A${actualRowNumber}:Z${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      return { action: 'updated', rowIndex: actualRowNumber };
    } else {
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Settings!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      return { action: 'appended', data: response.data };
    }
  }

  static async getSettings(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId,
        range: 'Settings!A:Z',
      });
      return response.data.values;
    } catch (e) {
      return null;
    }
  }

  /**
   * Fetches all job records from the Google Sheet.
   */
  /**
   * Adds or updates a job record in the Google Sheet.
   * If the Job ID exists, it updates the row; otherwise, it appends.
   */
  static async addJob(spreadsheetId: string, rowData: any[]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.ensureSheetExists(spreadsheetId, 'Jobs');

    const jobId = rowData[0];
    
    // 1. Check if job exists to update it
    const existing = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Jobs!A:A',
    });
    
    const rows = existing.data.values || [];
    const rowIndex = rows.findIndex((row: any[]) => row[0] === jobId);

    if (rowIndex !== -1) {
      // Update existing row (v4 uses 1-based indexing for ranges)
      const actualRowNumber = rowIndex + 1;
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `Jobs!A${actualRowNumber}:Z${actualRowNumber}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      return { action: 'updated', rowIndex: actualRowNumber };
    } else {
      // Append new row
      const response = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: 'Jobs!A:Z',
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
      return { action: 'appended', data: response.data };
    }
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
        body: Readable.from(body),
      },
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = response.data.id;

    // IMPORTANT: Make the file viewable by anyone with the link
    // This ensures clicking the link from the Google Sheet actually works
    try {
      await this.drive.permissions.create({
        fileId: fileId,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
      });
    } catch (permError: any) {
      console.warn("Failed to set public permission on document:", permError.message);
    }

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
      range: 'Jobs!A:T',
    });
    return response.data.values;
  }

  /**
   * Clears all job data from the sheet (except header).
   */
  static async clearJobs(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Jobs!A1:Z5000', // Total wipe - everything including headers
    });

    // Initialize with NEW headers (A-T)
    const headers = [[
      "NAME", "ADDRESS", "MOBILE NO.", "REFERENCE NAME", "COMPLAINT HISTORY",
      "VEHICLE NO.", "VEHICLE BRAND", "VEHICLE MODEL", "MANUFACTURE YEAR", "VEHICLE TYPE",
      "ESTIMATE MEMO NO.", "VEHICLE ESTIMATE", "STATUS", "E-KYC SERVICE", "CONSENT TYPE",
      "SUB-CATEGORIES", "JOB PARTICULARS", "DOCUMENT DETAIL", "AFTER SALES SERVICE", "JOB TIMELINE"
    ]];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Jobs!A1:T1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: headers },
    });

    return { success: true };
  }

  /**
   * Clears all settings data from the sheet (except header).
   */
  static async clearSettings(spreadsheetId: string) {
    try {
      await this.init();
      if (!this.sheets) throw new Error("Sheets API not initialized");

      await this.sheets.spreadsheets.values.clear({
        spreadsheetId,
        range: 'Settings!A2:Z5000',
      });
    } catch (e: any) {
      console.warn("Settings sheet clear skipped (might not exist):", e.message);
    }
    return { success: true };
  }
}
