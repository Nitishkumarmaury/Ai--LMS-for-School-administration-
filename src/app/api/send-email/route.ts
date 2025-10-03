import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend('re_KxmeM6ie_CrXUDAWqrnJ4aRePKPN4TBzM');

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, subject, html } = body;

    console.log('=== EMAIL API CALLED ===');
    console.log('To:', to);
    console.log('Subject:', subject);

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    const { data, error } = await resend.emails.send({
      from: 'School Attendance <onboarding@resend.dev>',
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('❌ Resend error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('✅ Email sent successfully:', data);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    console.error('❌ Email sending error:', error);
    return NextResponse.json(
      { error: 'Failed to send email', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
