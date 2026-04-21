import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
    
    console.log(`[SYNC-JOBS] GET action=${action} SPREADSHEET_ID=${spreadsheetId ? 'Present' : 'MISSING'}`);

    if (!spreadsheetId || spreadsheetId === "your_spreadsheet_id_here") {
      console.error("[SYNC-JOBS] GOOGLE_SPREADSHEET_ID is missing or not configured");
      return NextResponse.json({ 
        error: 'GOOGLE_SPREADSHEET_ID is missing or not configured correctly. Check your environment variables.',
        success: false 
      }, { status: 500 });
    }

    if (action === 'fetch') {
      console.log(`[SYNC-JOBS] Fetching data from GoogleService.getJobs...`);
      const allRows = await GoogleService.getJobs(spreadsheetId);
      if (!allRows || !Array.isArray(allRows)) {
        console.warn("[SYNC-JOBS] No data returned from GoogleService.getJobs");
        return NextResponse.json({ success: true, data: [] });
      }
      
      console.log(`[SYNC-JOBS] Successfully fetched ${allRows.length} rows. Filtering...`);
      // ABSOLUTE FILTER: Remove any system rows or settings rows
      // And ignore the header row if it's there
      const filteredData = allRows.filter((row: any[]) => {
        try {
          if (!row || row.length < 11) return false;
          
          const id = row[10]?.toString().trim().toUpperCase();
          if (!id || id === "" || id === "ESTIMATE MEMO NO.") return false;
          
          // Match standard ID patterns (JOB-xxxx or QS-xxxx)
          const isJobOrQs = (id.startsWith("JOB-") || id.startsWith("QS-"));
          return isJobOrQs && id !== "APP_SETTINGS";
        } catch (filterError) {
          console.error("[SYNC-JOBS] Filter error on row:", row, filterError);
          return false;
        }
      });
      
      console.log(`[SYNC-JOBS] Returning ${filteredData.length} filtered jobs.`);
      return NextResponse.json({ success: true, data: filteredData });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error("[SYNC-JOBS] Error in sync-jobs GET route:", error);
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
      
      // Group items by name to format like "Product= #mark1, #mark2; Next= #mark3"
      const groupedItems: Record<string, string[]> = {};
      const items = (d.selectedItems || d.particulars || []);
      
      items.forEach((item: any) => {
        if (!groupedItems[item.name]) {
          groupedItems[item.name] = [];
        }
        
        // Handle both single mark and array of marks
        const marks = Array.isArray(item.selectedMarks) 
          ? item.selectedMarks 
          : (item.stockMark || item.mark ? [item.stockMark || item.mark] : []);
        
        marks.forEach((m: any) => {
          const cleanMark = m.toString().trim();
          if (cleanMark) {
            groupedItems[item.name].push(`#${cleanMark.replace(/^#/, '')}`);
          }
        });
      });

      const particularsJson = JSON.stringify(items);

      // Format Documents as =HYPERLINK("url", "name") (Column R)
      let docDetail = '';
      if (d.documents && Array.isArray(d.documents) && d.documents.length > 0) {
        const validDocs = d.documents.filter((doc: any) => {
          const url = doc.cloudUrl || doc.preview;
          return url && (url.startsWith('http') || url.includes('drive.google.com'));
        });

        if (validDocs.length > 0) {
          docDetail = validDocs.map((doc: any) => {
            return doc.cloudUrl || doc.preview;
          }).join(", ");
        } else {
          docDetail = d.documents.map((doc: any) => doc.name || 'Doc').join(", ");
        }
      } else if (d.docsFolderLink) {
        docDetail = d.docsFolderLink;
      }

      console.log(`[CLOUD SYNC] Job ${j.id}: docDetail constructed as: ${docDetail}`);

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
        particularsJson,                     // Q: JOB PARTICULARS (JSON)
        docDetail,                           // R: DOCUMENT DETAIL (Hyperlinks)
        d.afterSales || d.afterSalesComplaint || '', // S: AFTER SALES SERVICE
        JSON.stringify(j.timeline || {}),     // T: JOB TIMELINE
        d.invoiceSnapshot || d.estimateSnapshot ? JSON.stringify({ e: d.estimateSnapshot || null, i: d.invoiceSnapshot || null }) : '', // U: SNAPSHOTS
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
