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
    const body = await request.json();
    const { spreadsheetId: sid, action, itemId, jobId, rows } = body;
    const spreadsheetId = sid || process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId) {
      return NextResponse.json({ error: 'Spreadsheet ID is required' }, { status: 400 });
    }

    if (action === 'consume') {
      if (!itemId || !jobId) {
        return NextResponse.json({ error: 'itemId and jobId required for consume' }, { status: 400 });
      }
      
      // 1. Fetch current stock
      const currentRows = await GoogleService.getStock(spreadsheetId);
      if (!currentRows) return NextResponse.json({ error: 'Stock not found' }, { status: 404 });

      // 2. Map through and update the specific item
      // Columns: SERIES ID(0), PRODUCT NAME(1), VENDOR(2), RATE(3), DATE(4), ITEM ID(5), MARK(6), RAW ID(7), STATUS(8), JOB ID(9), USED AT(10)
      const updatedRows = currentRows.map((row: any[]) => {
        if (row[5] === itemId) {
          const newRow = [...row];
          newRow[8] = 'Used';
          newRow[9] = jobId;
          newRow[10] = Date.now();
          return newRow;
        }
        return row;
      });

      await GoogleService.syncStock(spreadsheetId, updatedRows);
      return NextResponse.json({ success: true, message: 'Item consumed' });
    }

    if (!rows) {
      return NextResponse.json({ error: 'Missing rows for full sync' }, { status: 400 });
    }

    await GoogleService.syncStock(spreadsheetId, rows);
    return NextResponse.json({ success: true, message: 'Stock synced successfully' });
  } catch (error: any) {
    console.error('Sync stock error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
