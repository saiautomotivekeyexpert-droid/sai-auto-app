import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId || spreadsheetId === "your_spreadsheet_id_here") {
      return NextResponse.json({ success: true, data: [] });
    }

    if (action === 'fetch') {
      const allRows = await GoogleService.getJobs(spreadsheetId);
      if (!allRows) return NextResponse.json({ success: true, data: [] });
      
      // ABSOLUTE FILTER: Remove any system rows or settings rows
      // And ignore the header row if it's there
      const filteredData = allRows.filter((row: any[]) => {
        const id = row[10]?.toString().trim().toUpperCase(); // Index 10 is ESTIMATE MEMO NO (Job ID)
        if (!id || id === "ESTIMATE MEMO NO.") return false;
        return id !== "APP_SETTINGS" && (id.startsWith("JOB-") || id.startsWith("QS-"));
      });
      
      return NextResponse.json({ success: true, data: filteredData });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error("Error in sync-jobs GET route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, job, jobs } = body;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId || spreadsheetId === "your_spreadsheet_id_here") {
      return NextResponse.json({ success: true, message: 'Google Spreadsheet ID is missing - sync bypassed.' }, { status: 200 });
    }

    /**
     * Maps a Job object to the 20-column array structure (A-T)
     */
    const mapJobToRow = (j: any) => {
      const d = j.details || {};
      
      // Format Particulars as comma-separated string (Column Q)
      const particulars = (d.selectedItems || [])
        .map((item: any) => item.name)
        .join(',');

      // Format Documents as =HYPERLINK("url", "name") (Column R)
      // We use the 'documents' array if available, otherwise fallback to docsFolderLink
      let docDetail = '';
      if (d.documents && Array.isArray(d.documents)) {
        docDetail = d.documents
          .map((doc: any) => {
            const url = doc.cloudUrl || doc.preview;
            if (url && (url.startsWith('http') || url.includes('drive.google.com'))) {
              return `=HYPERLINK("${url}", "${doc.name || 'Document'}")`;
            }
            return doc.name || '';
          })
          .filter(Boolean)
          .join(', ');
      } else if (d.docsFolderLink) {
        docDetail = d.docsFolderLink;
      }

      return [
        j.customerName || d.fullName || '',   // A: NAME
        d.address || d.customerAddress || '', // B: ADDRESS
        d.phone || d.customerPhone || '',      // C: MOBILE NO.
        d.referenceName || '',               // D: REFERENCE NAME
        d.complaintHistory || '',            // E: COMPLAINT HISTORY
        j.vehicleNumber || d.regNumber || '', // F: VEHICLE NO.
        d.brand || d.vehicleBrand || '',     // G: VEHICLE BRAND
        d.model || d.vehicleModel || '',     // H: VEHICLE MODEL
        d.year || d.manufactureYear || '',    // I: MANUFACTURE YEAR
        d.category || d.vehicleType || '',    // J: VEHICLE TYPE
        j.id || '',                          // K: ESTIMATE MEMO NO.
        d.totalCharge || 0,                  // L: VEHICLE ESTIMATE
        j.status || '',                      // M: STATUS
        j.serviceType || '',                 // N: E-KYC SERVICE
        d.consentType || '',                 // O: CONSENT TYPE
        (d.selectedSubCategories || []).join(', '), // P: SUB-CATEGORIES
        particulars,                         // Q: JOB PARTICULARS (CSV)
        docDetail,                           // R: DOCUMENT DETAIL (Hyperlinks)
        d.afterSales || d.afterSalesComplaint || '', // S: AFTER SALES SERVICE
        JSON.stringify(j.timeline || {})      // T: JOB TIMELINE
      ];
    };

    if (action === 'append' || action === 'sync') {
      if (job) {
        await GoogleService.addJob(spreadsheetId, mapJobToRow(job));
        return NextResponse.json({ success: true, message: 'Job synced successfully.' });
      }
      
      if (jobs && Array.isArray(jobs)) {
        for (const j of jobs) {
           await GoogleService.addJob(spreadsheetId, mapJobToRow(j));
        }
        return NextResponse.json({ success: true, message: `${jobs.length} jobs synced successfully.` });
      }
    }

    if (action === 'clear') {
       await GoogleService.clearJobs(spreadsheetId);
       await GoogleService.clearSettings(spreadsheetId);
       return NextResponse.json({ success: true, message: 'All job data and system settings cleared.' });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error("Error in sync-jobs POST route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
