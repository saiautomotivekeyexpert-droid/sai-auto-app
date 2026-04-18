import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = body.data;
    const spreadsheetId = body.spreadsheetId || process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) return NextResponse.json({ error: 'spreadsheetId is required' }, { status: 400 });

    const settingsRows: any[][] = [];
    const catalogRows: any[][] = [];
    
    // Type | Name/Key | Val1 | Val2 | Val3 | Val4 | Val5 | ID (Val6)
    
    // 1. Strings
    if (data.estimateTerms) settingsRows.push(['Terms', 'Estimate Terms', data.estimateTerms]);
    if (data.invoiceTerms) settingsRows.push(['Terms', 'Invoice Terms', data.invoiceTerms]);
    if (data.partnerPin) settingsRows.push(['Pin', 'Partner Pin', data.partnerPin]);

    // 2. Shop Profile
    if (data.shopProfile) {
      Object.entries(data.shopProfile).forEach(([k, v]) => settingsRows.push(['Profile', k, v]));
    }

    // 3. Simple Arrays
    if (data.consentTypes) data.consentTypes.forEach((t: string) => settingsRows.push(['ConsentType', 'Types', t]));

    // 4. Object Arrays
    if (data.partners) data.partners.forEach((p: any) => settingsRows.push(['Partner', p.name, p.id]));

    // ---------- CATALOG ROWS ----------
    if (data.serviceTypes) data.serviceTypes.forEach((t: string) => catalogRows.push(['ServiceType', 'Types', t]));
    if (data.subCategories) data.subCategories.forEach((sc: any) => catalogRows.push(['SubCategory', sc.name, sc.id]));
    if (data.catalogCategories) {
      data.catalogCategories.forEach((cc: any) => {
        catalogRows.push(['CatalogCategory', cc.name, cc.showInPOS ? 'TRUE' : 'FALSE']);
      });
    }

    // 5. Particulars
    if (data.particulars) {
      data.particulars.forEach((p: any) => {
        catalogRows.push([
          'Catalog Product', p.name, p.cost, p.partnerPrice, p.expense, 
          p.isQuickService ? 'TRUE' : 'FALSE', p.category || '', p.id
        ]);
      });
    }

    await GoogleService.syncSettingsAndCatalogBulk(spreadsheetId, settingsRows, catalogRows);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Settings Sync Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const spreadsheetId = searchParams.get('spreadsheetId') || process.env.GOOGLE_SPREADSHEET_ID;
    
    if (!spreadsheetId) return NextResponse.json({ error: 'spreadsheetId required' }, { status: 400 });

    const rows = await GoogleService.getSettingsAndCatalog(spreadsheetId);
    
    const data: any = {
      serviceTypes: [], consentTypes: [], particulars: [], subCategories: [], 
      partners: [], catalogCategories: [], shopProfile: {}
    };

    if (!rows || rows.length === 0) return NextResponse.json({ data: null });

    // Backwards compatibility layer: check for legacy JSON string
    const legacyRow = rows.find((r: any) => r[0] === 'APP_SETTINGS');
    if (legacyRow) {
       try { return NextResponse.json({ data: JSON.parse(legacyRow[1]) }); } catch(e) {}
    }

    // Parse modern flat rows
    rows.forEach((row: any[]) => {
      const [type, key, v1, v2, v3, v4, v5, v6] = row;

      if (type === 'Terms') {
        if (key === 'Estimate Terms') data.estimateTerms = v1;
        if (key === 'Invoice Terms') data.invoiceTerms = v1;
      }
      else if (type === 'Pin' && key === 'Partner Pin') data.partnerPin = v1;
      else if (type === 'Profile') data.shopProfile[key] = v1;
      else if (type === 'ServiceType') data.serviceTypes.push(v1);
      else if (type === 'ConsentType') data.consentTypes.push(v1);
      else if (type === 'Partner') data.partners.push({ name: key, id: v1 || Date.now().toString() });
      else if (type === 'SubCategory') data.subCategories.push({ name: key, id: v1 || Date.now().toString() });
      else if (type === 'CatalogCategory') data.catalogCategories.push({ name: key, showInPOS: v1 === 'TRUE' });
      else if (type === 'Catalog Product') {
        data.particulars.push({
          name: key,
          cost: Number(v1) || 0,
          partnerPrice: Number(v2) || 0,
          expense: Number(v3) || 0,
          isQuickService: v4 === 'TRUE',
          category: v5 || '',
          id: v6 || Date.now().toString() + Math.random().toString()
        });
      }
    });

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
