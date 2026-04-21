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
    const uniqueCategories = new Set<string>();
    const uniqueServiceTypes = new Set<string>();
    const uniqueSubCategories = new Set<string>();

    // 2. Parse Rows (Skip header at Index 0)
    allRows.slice(1).forEach((row: any[]) => {
      // E-KYC SERVICE at Index 13
      const serviceType = row[13];
      if (serviceType && typeof serviceType === 'string' && serviceType.trim()) {
        serviceType.split(',').forEach(s => {
          const st = s.trim().toUpperCase();
          if (st && st !== 'E-KYC SERVICE' && st !== 'SERVICE TYPE') {
             uniqueServiceTypes.add(st);
          }
        });
      }

      // SUB-CATEGORIES at Index 15
      const subCat = row[15];
      if (subCat && typeof subCat === 'string' && subCat.trim()) {
        subCat.split(',').forEach(s => {
          const sc = s.trim();
          if (sc && sc !== 'SUB-CATEGORIES' && sc !== 'SUB-CATEGORY') {
            uniqueSubCategories.add(sc);
          }
        });
      }

      // Consent Type at Index 14
      const consent = row[14];
      if (consent && typeof consent === 'string' && consent.trim()) {
        const ct = consent.trim().toUpperCase();
        if (ct && ct !== 'CONSENT TYPE') uniqueConsents.add(ct);
      }

      // Catalog items in index 16
      const particularsJson = row[16];
      if (!particularsJson) return;

      try {
        const items = JSON.parse(particularsJson);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = typeof item === 'string' ? item : item.name;
            if (!name || name === 'NAME' || name === 'JOB PARTICULARS') return;

            const nameKey = name.trim().toUpperCase();
            if (item.category && item.category !== 'CATEGORY') uniqueCategories.add(item.category);
            
            if (!uniqueProducts[nameKey]) {
              uniqueProducts[nameKey] = {
                id: item.id || `rec_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                name: name.trim(),
                cost: Number(item.cost) || 0,
                partnerPrice: Number(item.partnerPrice) || 0,
                expense: Number(item.expense) || 0,
                isQuickService: item.isQuickService || false,
                category: item.category || (item.isQuickService ? 'SERVICES' : 'RECOVERED')
              };
              if (uniqueProducts[nameKey].category) uniqueCategories.add(uniqueProducts[nameKey].category);
            }
          });
        }
      } catch (e) {
        // Skip malformed JSON
      }
    });

    const recoveredList = Object.values(uniqueProducts);
    const recoveredConsents = Array.from(uniqueConsents);
    const recoveredCategories = Array.from(uniqueCategories).map(cat => ({ name: cat, showInPOS: true }));
    const recoveredServiceTypes = Array.from(uniqueServiceTypes);
    const recoveredSubCategories = Array.from(uniqueSubCategories).map(sc => ({ id: `sc_${Math.random()}`, name: sc }));

    return NextResponse.json({ 
      success: true, 
      recovered: recoveredList,
      recoveredConsents,
      recoveredCategories,
      recoveredServiceTypes,
      recoveredSubCategories,
      message: `Recovered ${recoveredList.length} products.`
    });
  } catch (err: any) {
    console.error("Catalog Recovery Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
