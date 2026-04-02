import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, job, jobs } = body;
    const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;

    if (!spreadsheetId || spreadsheetId === "your_spreadsheet_id_here") {
      // Fail gracefully so the frontend component doesn't get a 500 crash/loop
      return NextResponse.json({ success: true, message: 'Google Spreadsheet ID is missing - sync bypassed.' }, { status: 200 });
    }

    const sanitizeDetails = (details: any) => {
      if (!details) return {};
      try {
        const cleaned = JSON.parse(JSON.stringify(details));
        if (cleaned.documents && Array.isArray(cleaned.documents)) {
          cleaned.documents = cleaned.documents.map((doc: any) => ({
            ...doc,
            preview: doc.preview?.startsWith('data:') ? '[IMAGE_DATA_STRIPPED_FOR_SHEET]' : doc.preview
          }));
        }
        return cleaned;
      } catch (e) {
        return { error: 'Failed to serialize details' };
      }
    };

    if (action === 'sync') {
      // For a single job sync
      if (job) {
        const rowData = [
          job.id,
          job.date,
          job.status,
          job.customerName,
          job.vehicleNumber,
          job.serviceType,
          job.details?.totalCharge || 0,
          JSON.stringify(sanitizeDetails(job.details))
        ];
        
        await GoogleService.addJob(spreadsheetId, rowData);
        return NextResponse.json({ success: true, message: 'Job synced successfully to Google Sheets.' });
      }
      
      // For bulk sync
      if (jobs && Array.isArray(jobs)) {
        for (const j of jobs) {
           const rowData = [
             j.id, j.date, j.status, j.customerName, j.vehicleNumber, 
             j.serviceType, j.details?.totalCharge || 0, JSON.stringify(sanitizeDetails(j.details))
           ];
           await GoogleService.addJob(spreadsheetId, rowData);
        }
        return NextResponse.json({ success: true, message: `${jobs.length} jobs synced successfully.` });
      }
    }

    if (action === 'fetch') {
       const existingData = await GoogleService.getJobs(spreadsheetId);
       return NextResponse.json({ success: true, data: existingData });
    }

    return NextResponse.json({ error: 'Invalid action provided.' }, { status: 400 });
  } catch (error: any) {
    console.error("Error in sync-jobs route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
