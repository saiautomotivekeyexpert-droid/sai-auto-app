import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export async function POST(req: Request) {
  try {
    const { data, spreadsheetId } = await req.json();
    
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'spreadsheetId is required' }, { status: 400 });
    }

    // We store the entire settings object as a JSON string in a single cell for simplicity,
    // or we could map it to a 'Settings' sheet.
    // Let's use a 'Settings' sheet and column A for the key, column B for the JSON value.
    
    const settingsJson = JSON.stringify(data);
    await GoogleService.addJob(spreadsheetId, ['APP_SETTINGS', settingsJson, new Date().toISOString()]);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('spreadsheetId');
    
    if (!spreadsheetId) {
      return NextResponse.json({ error: 'spreadsheetId is required' }, { status: 400 });
    }

    const rows = await GoogleService.getJobs(spreadsheetId);
    if (!rows || rows.length === 0) return NextResponse.json({ data: null });

    // Find the latest 'APP_SETTINGS' row
    const settingsRows = rows.filter((r: any) => r[0] === 'APP_SETTINGS');
    if (settingsRows.length === 0) return NextResponse.json({ data: null });

    const latest = settingsRows[settingsRows.length - 1];
    const data = JSON.parse(latest[1]);

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
