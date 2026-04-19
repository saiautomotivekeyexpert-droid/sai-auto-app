import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    webhookUrl: process.env.GOOGLE_DRIVE_WEBHOOK_URL || '',
    spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    folderId: process.env.GOOGLE_DRIVE_FOLDER_ID || ''
  });
}
