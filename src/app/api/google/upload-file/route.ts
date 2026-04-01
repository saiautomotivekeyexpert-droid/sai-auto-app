import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

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

    const result = await GoogleService.uploadImage(folderId, fileName, mimeType, buffer);

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    console.error("Error in upload-file route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
