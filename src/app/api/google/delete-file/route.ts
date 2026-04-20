import { NextResponse } from 'next/server';
import { GoogleService } from '@/lib/googleService';

export async function POST(req: Request) {
  try {
    const { fileId } = await req.json();

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    await GoogleService.deleteFile(fileId);
    return NextResponse.json({ success: true, message: 'File deleted from Drive' });
  } catch (error: any) {
    console.error("Error in delete-file route:", error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
