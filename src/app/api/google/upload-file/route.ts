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
      // Use Google Apps Script Webhook bypass
      const base64Data = buffer.toString('base64');
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          fileName,
          mimeType,
          fileData: base64Data,
          folderId: folderId // Allows the script to know where to save
        })
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
