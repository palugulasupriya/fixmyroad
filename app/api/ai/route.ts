import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const body = await request.json();
  const severity = body.severity || 'medium';
  const isPothole = body.photoUrl ? true : false;

  return NextResponse.json({
    isPothole,
    severity,
  });
}
