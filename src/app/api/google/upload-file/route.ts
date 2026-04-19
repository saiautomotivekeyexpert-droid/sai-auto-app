import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export const maxDuration = 60; // Allow 60 seconds for larger uploads from mobile

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;
    
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    if (!folderId) {
       return NextResponse.json({ error: 'Google Drive Folder ID is not configured in environment variables.' }, { status: 500 });
    }

    if (!file || !fileName) {
      return NextResponse.json({ error: 'File or file name is missing.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mimeType = file.type;

    const webhookUrl = process.env.GOOGLE_DRIVE_WEBHOOK_URL;
    
    if (webhookUrl) {
      // Use Google Apps Script Webhook bypass with BINARY data to minimize size
      // We pass metadata in query params and the file buffer in the POST body
      const params = new URLSearchParams({
        fileName,
        mimeType,
        folderId
      });

      const response = await fetch(`${webhookUrl}?${params.toString()}`, {
        method: 'POST',
        headers: { 'Content-Type': mimeType },
        body: buffer
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error(`Webhook returned invalid response: ${text.substring(0, 100)}`);
      }
      
      if (data.error) throw new Error(data.error);
      return NextResponse.json({ success: true, webViewLink: data.url });
    } else {
      // Legacy Service Account approach
      const result = await GoogleService.uploadImage(folderId, fileName, mimeType, buffer);
      return NextResponse.json({ success: true, ...result });
    }
  } catch (error: any) {
    console.error("Error in upload-file route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
