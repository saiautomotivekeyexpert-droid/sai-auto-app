import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json();

    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || 'admin786';

    if (username === adminUser && password === adminPass) {
      // In a real app, you'd set a secure HTTP-only cookie here.
      // For this specific e-KYC requirement, we'll return a success token.
      return NextResponse.json({ 
        success: true, 
        message: 'Authenticated successfully',
        token: 'sai-auto-session-' + Date.now()
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        message: 'Invalid Username or Password' 
      }, { status: 401 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
