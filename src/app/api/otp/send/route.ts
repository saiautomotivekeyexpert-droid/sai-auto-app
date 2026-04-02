import { NextResponse } from 'next/server';
import twilio from 'twilio';

const globalNode = global as any;
if (!globalNode.otpStore) {
  globalNode.otpStore = new Map<string, { code: string, expiresAt: number }>();
}
const otpStore = globalNode.otpStore;

export async function POST(req: Request) {
  try {
    const { phone } = await req.json();
    if (!phone) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const code = Math.floor(1000 + Math.random() * 9000).toString();
    otpStore.set(phone, {
      code,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    const apiKey = process.env.FAST2SMS_API_KEY;
    
    if (apiKey) {
      // PROD: Real SMS via Fast2SMS
      const response = await fetch("https://www.fast2sms.com/dev/bulkV2", {
        method: 'POST',
        headers: {
          "authorization": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          "route": "q",
          "message": `Your verification code for Sai Auto Key Works is: ${code}`,
          "numbers": phone
        })
      });

      const data = await response.json();
      console.log("Fast2SMS Response:", JSON.stringify(data, null, 2));

      if (data.return) {
        return NextResponse.json({ 
          success: true, 
          message: 'OTP sent successfully via Fast2SMS'
        });
      } else {
        throw new Error(data.message || "Fast2SMS API failed");
      }
    } else {
      // DEV: Fallback mockup
      console.log(`\n==============\n📲 DEV MOCK SMS\nTo: ${phone}\nCode: ${code}\n==============\n`);
      return NextResponse.json({ 
        success: true, 
        message: 'Mock OTP sent (API key missing in .env)',
        devCode: code
      });
    }

  } catch (err: any) {
    console.error("OTP API Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Helper to access memory in verify route
export const getOtpStore = () => otpStore;
