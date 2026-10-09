import { NextResponse } from 'next/server';
import { initialReports } from '@/lib/mockData';
import { Report, Status } from '@/lib/types';

const reports: Report[] = [...initialReports];

export async function GET() {
  return NextResponse.json(reports);
}

export async function POST(request: Request) {
  const body = await request.json();
  const now = new Date().toISOString();

  const report: Report = {
    id: `report-${Date.now()}`,
    location: body.location || 'Unknown location',
    description: body.description || 'No description provided',
    photoUrl: body.photoUrl || 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80',
    severity: body.severity || 'medium',
    status: 'Submitted',
    createdAt: now,
    updatedAt: now,
    aiVerified: Boolean(body.aiVerified),
  };

  reports.unshift(report);
  return NextResponse.json(report);
}

export async function PATCH(request: Request) {
  const body = await request.json();
  const { id, status } = body;

  const index = reports.findIndex((report) => report.id === id);

  if (index === -1) {
    return NextResponse.json({ error: 'Report not found' }, { status: 404 });
  }

  reports[index] = {
    ...reports[index],
    status: status as Status,
    updatedAt: new Date().toISOString(),
  };

  return NextResponse.json(reports[index]);
}
