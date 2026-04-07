
import { GoogleService } from './src/lib/googleService';
import * as dotenv from 'dotenv';
dotenv.config();

async function verify() {
  console.log("Initializing Google Service...");
  await GoogleService.init();
  
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  if (!spreadsheetId) {
    console.error("GOOGLE_SPREADSHEET_ID not found in env");
    return;
  }
  
  console.log(`Fetching jobs from spreadsheet: ${spreadsheetId}`);
  try {
    const jobs = await GoogleService.getJobs(spreadsheetId);
    console.log(`Fetched ${jobs?.length || 0} rows (including header).`);
    if (jobs && jobs.length > 0) {
      console.log("Header row:", jobs[0]);
    }
  } catch (e) {
    console.error("Fetch failed:", e);
  }
}

verify();
