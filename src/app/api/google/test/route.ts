import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  const diagnostics = {
    env: {
      SPREADSHEET_ID: spreadsheetId ? `Present (${spreadsheetId.slice(-4)})` : 'MISSING',
      CLIENT_EMAIL: clientEmail ? `Present (${clientEmail.slice(0, 5)}...)` : 'MISSING',
      PRIVATE_KEY: privateKey ? 'Present (Hidden)' : 'MISSING'
    },
    googleApi: 'Checking...'
  };

  if (!spreadsheetId || !clientEmail || !privateKey) {
    return NextResponse.json({ 
      success: false, 
      message: "Required environment variables are missing. Please check Vercel Environment Variables.",
      diagnostics 
    });
  }

  try {
    await GoogleService.init();
    const allRows = await GoogleService.getJobs(spreadsheetId);
    return NextResponse.json({ 
      success: true, 
      message: "Connection to Google Sheets is WORKING!",
      rowCount: allRows?.length || 0,
      diagnostics: { ...diagnostics, googleApi: 'Connected' }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      message: "Failed to connect to Google Sheets: " + error.message,
      diagnostics: { ...diagnostics, googleApi: 'Failed' }
    });
  }
}
