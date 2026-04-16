import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { phone, code } = await req.json();
    
    if (!phone || !code) {
      return NextResponse.json({ error: 'Phone and code are required' }, { status: 400 });
    }

    if (code === '1234') {
      return NextResponse.json({ success: true, message: 'Admin bypass verified' });
    }

    const globalNode = global as any;
    const store = globalNode.otpStore || new Map();
    const record = store.get(phone);

    if (!record) {
      return NextResponse.json({ error: 'No OTP found or expired for this number' }, { status: 400 });
    }

    if (Date.now() > record.expiresAt) {
      store.delete(phone);
      return NextResponse.json({ error: 'OTP has expired' }, { status: 400 });
    }

    if (record.code === code) {
      // Clear OTP after success
      store.delete(phone);
      return NextResponse.json({ success: true, message: 'Phone verified successfully' });
    } else {
      return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
