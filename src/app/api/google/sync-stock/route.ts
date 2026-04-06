import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const spreadsheetId = searchParams.get('spreadsheetId') || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    }

    const rows = await GoogleService.getStock(spreadsheetId);
    return NextResponse.json({ success: true, data: rows || [] });
  } catch (error: any) {
    console.error('Fetch stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { spreadsheetId: sid, rows } = await request.json();
    const spreadsheetId = sid || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId || !rows) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await GoogleService.syncStock(spreadsheetId, rows);
    return NextResponse.json({ success: true, message: 'Stock synced successfully' });
  } catch (error: any) {
    console.error('Sync stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
