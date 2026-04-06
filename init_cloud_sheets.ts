import { GoogleService } from './src/lib/googleService';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("GOOGLE_SPREADSHEET_ID not found in .env");
    return;
  }

  console.log("Initializing Stock and Ledger sheets...");
  
  // We use the reset function which is now updated to handle all sheets
  const result = await GoogleService.clearJobs(spreadsheetId);
  
  if (result.success) {
    console.log("✅ Sheets initialized successfully!");
  } else {
    console.error("❌ Initialization failed.");
  }
}

run();
