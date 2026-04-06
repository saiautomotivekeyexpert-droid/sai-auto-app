import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId') || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    }

    await GoogleService.init();
    const response = await (GoogleService as any).sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Ledger!A2:H5000',
    });

    return NextResponse.json({ success: true, data: response.data.values || [] });
  } catch (error: any) {
    console.error('Fetch ledger error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId: sid, row } = await request.json();
    const spreadsheetId = sid || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId || !row) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await GoogleService.addLedgerEntry(spreadsheetId, row);
    return NextResponse.json({ success: true, message: 'Ledger entry added' });
  } catch (error: any) {
    console.error('Add ledger entry error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
