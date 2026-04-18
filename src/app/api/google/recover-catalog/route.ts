import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('spreadsheetId') || process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) return NextResponse.json({ error: 'spreadsheetId required' }, { status: 400 });

    // 1. Fetch all jobs
    const allRows = await GoogleService.getJobs(spreadsheetId);
    if (!allRows || allRows.length === 0) {
      return NextResponse.json({ success: true, recovered: [], message: 'No job history found to recover from.' });
    }

    const uniqueProducts: Record<string, any> = {};
    const uniqueConsents = new Set<string>();

    // 2. Parse Rows
    allRows.forEach((row: any[]) => {
      // Consent Type at Index 14
      const consent = row[14];
      if (consent && typeof consent === 'string' && consent.trim()) {
        uniqueConsents.add(consent.trim().toUpperCase());
      }

      // Catalog items in index 16
      const particularsJson = row[16];
      if (!particularsJson) return;

      try {
        const items = JSON.parse(particularsJson);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = typeof item === 'string' ? item : item.name;
            if (!name) return;

            const nameKey = name.trim().toUpperCase();
            if (!uniqueProducts[nameKey]) {
              uniqueProducts[nameKey] = {
                id: item.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: name.trim(),
                cost: Number(item.cost) || 0,
                partnerPrice: Number(item.partnerPrice) || 0,
                expense: Number(item.expense) || 0,
                isQuickService: item.isQuickService || false,
                category: item.category || 'RECOVERED'
              };
            }
          });
        }
      } catch (e) {
        // Skip malformed JSON
      }
    });

    const recoveredList = Object.values(uniqueProducts);
    const recoveredConsents = Array.from(uniqueConsents);

    return NextResponse.json({ 
      success: true, 
      recovered: recoveredList,
      recoveredConsents,
      message: `Identified ${recoveredList.length} products and ${recoveredConsents.length} consent types from job history.`
    });
  } catch (err: any) {
    console.error("Catalog Recovery Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
