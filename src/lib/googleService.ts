import { google } from 'googleapis';

/**
 * GoogleService: Handles interactions with Google Sheets (Database) and Google Drive (Storage).
 * Requires credentials.json in the root directory.
 */
export class GoogleService {
  private static auth: any;
  private static sheets: any;
  private static drive: any;

  public static async init() {
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

  static async getSettingsAndCatalog(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");
    let settingsVal = [];
    let catalogVal = [];
    try {
      const s = await this.sheets.spreadsheets.values.get({ spreadsheetId, range: 'Settings!A:Z' });
      settingsVal = s.data.values || [];
    } catch (e) {
      // Ignore if sheet doesn't exist
    }
    try {
      const c = await this.sheets.spreadsheets.values.get({ spreadsheetId, range: 'Catalog!A:Z' });
      catalogVal = c.data.values || [];
    } catch (e) {
      // Ignore if sheet doesn't exist
    }
    return [...settingsVal, ...catalogVal];
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

    const jobId = rowData[10];
    
    // 1. Check if job exists to update it (Check Column K: ESTIMATE MEMO NO.)
    const existing = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Jobs!K:K',
    });
    
    const rows = existing.data.values || [];
    const rowIndex = rows.findIndex((row: any[]) => row[0]?.toString().trim().toUpperCase() === jobId?.toString().trim().toUpperCase());

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
      range: 'Jobs!A:U',
    });
    return response.data.values;
  }

  /**
   * Clears all job data from the sheet (except header).
   */
  static async clearJobs(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    // 1. Ensure Stock and Ledger sheets exist
    const spreadsheet = await this.sheets.spreadsheets.get({ spreadsheetId });
    const sheetNames = spreadsheet.data.sheets?.map((s: any) => s.properties.title) || [];
    
    const requests = [];
    if (!sheetNames.includes('Stock')) {
      requests.push({ addSheet: { properties: { title: 'Stock' } } });
    }
    if (!sheetNames.includes('Ledger')) {
      requests.push({ addSheet: { properties: { title: 'Ledger' } } });
    }

    if (requests.length > 0) {
      await this.sheets.spreadsheets.batchUpdate({
        spreadsheetId,
        requestBody: { requests },
      });
    }

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Jobs!A1:Z5000',
    });

    // Initialize with NEW headers (A-T)
    const headers = [
      ["NAME", "ADDRESS", "MOBILE NO.", "REFERENCE NAME", "COMPLAINT HISTORY",
      "VEHICLE NO.", "VEHICLE BRAND", "VEHICLE MODEL", "MANUFACTURE YEAR", "VEHICLE TYPE",
      "ESTIMATE MEMO NO.", "VEHICLE ESTIMATE", "STATUS", "E-KYC SERVICE", "CONSENT TYPE",
      "SUB-CATEGORIES", "JOB PARTICULARS", "DOCUMENT DETAIL", "AFTER SALES SERVICE", "JOB TIMELINE"]
    ];

    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Jobs!A1:U1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [[
        "NAME", "ADDRESS", "MOBILE NO.", "REFERENCE NAME", "COMPLAINT HISTORY",
        "VEHICLE NO.", "VEHICLE BRAND", "VEHICLE MODEL", "MANUFACTURE YEAR", "VEHICLE TYPE",
        "ESTIMATE MEMO NO.", "VEHICLE ESTIMATE", "STATUS", "E-KYC SERVICE", "CONSENT TYPE",
        "SUB-CATEGORIES", "JOB PARTICULARS", "DOCUMENT DETAIL", "AFTER SALES SERVICE", "JOB TIMELINE",
        "INVOICE SNAPSHOT"
      ]] },
    });

    // Initialize Stock Sheet
    await this.sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Stock!A1:Z5000' });
    const stockHeaders = [
      ["SERIES ID", "PRODUCT NAME", "VENDOR", "RATE", "DATE", "ITEM ID", "MARK", "RAW ID", "STATUS", "JOB ID", "USED AT"]
    ];
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Stock!A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: stockHeaders },
    });

    // Initialize Ledger Sheet
    await this.sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Ledger!A1:Z5000' });
    const ledgerHeaders = [
      ["DATE", "JOB ID", "CUSTOMER", "VEHICLE", "REVENUE", "EXPENSE", "PROFIT", "TYPE"]
    ];
    await this.sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'Ledger!A1:H1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: ledgerHeaders },
    });

    return { success: true };
  }

  /**
   * Fetches all stock items from the Spreadsheet.
   */
  static async getStock(spreadsheetId: string) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    const response = await this.sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Stock!A2:K5000',
    });
    return response.data.values;
  }

  /**
   * Clears and overwrites the Stock sheet.
   */
  static async syncStock(spreadsheetId: string, rows: any[][]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: 'Stock!A2:K5000',
    });

    if (rows.length > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Stock!A2:K' + (rows.length + 1),
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: rows },
      });
    }
    return { success: true };
  }

  /**
   * Appends an entry to the Ledger sheet.
   */
  static async addLedgerEntry(spreadsheetId: string, row: any[]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Ledger!A2:H2',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
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

  /**
   * Overwrites the Settings & Catalog sheets with flat data
   */
  static async syncSettingsAndCatalogBulk(spreadsheetId: string, settingsRows: any[][], catalogRows: any[][]) {
    await this.init();
    if (!this.sheets) throw new Error("Sheets API not initialized");

    await this.ensureSheetExists(spreadsheetId, 'Settings');
    await this.ensureSheetExists(spreadsheetId, 'Catalog');

    await this.sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Settings!A1:Z5000' });
    await this.sheets.spreadsheets.values.clear({ spreadsheetId, range: 'Catalog!A1:Z5000' });

    const settingsHeaders = [["TYPE", "KEY / NAME", "VALUE 1", "VALUE 2", "VALUE 3", "VALUE 4", "VALUE 5", "ID"]];
    const catalogHeaders = [["TYPE", "KEY / NAME", "COST / VAL 1", "PARTNER PRICE / VAL 2", "EXPENSE / VAL 3", "QS? / VAL 4", "CATEGORY / VAL 5", "ID"]];

    const allSettings = [...settingsHeaders, ...settingsRows];
    const allCatalog = [...catalogHeaders, ...catalogRows];

    if (allSettings.length > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Settings!A1:Z' + allSettings.length,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allSettings },
      });
    }
    if (allCatalog.length > 0) {
      await this.sheets.spreadsheets.values.update({
        spreadsheetId,
        range: 'Catalog!A1:Z' + allCatalog.length,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: allCatalog },
      });
    }
    
    return { success: true };
  }
}
