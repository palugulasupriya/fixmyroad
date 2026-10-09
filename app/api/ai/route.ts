import { NextResponse } from 'next/server';

const monsoonMonths = new Set([5, 6, 7, 8, 9]);

function getMonsoonPriority(location: string, month: number) {
  const monsoonCities = ['Bengaluru', 'Mumbai', 'Chennai', 'Kochi', 'Hyderabad', 'Pune'];
  const normalized = location.toLowerCase();
  const isMonsoonRegion = monsoonCities.some((city) => normalized.includes(city.toLowerCase()));
  return isMonsoonRegion && monsoonMonths.has(month);
}

export async function POST(request: Request) {
  const body = await request.json();

  const location = body.location || 'Unknown location';
  const month = new Date().getMonth();
  const isMonsoon = getMonsoonPriority(location, month);

  let severity = (body.severity || 'medium').toLowerCase();
  if (isMonsoon && severity === 'medium') severity = 'high';
  if (isMonsoon && severity === 'low') severity = 'medium';

  const isPothole = body.photoUrl ? true : false;

  return NextResponse.json({
    isPothole,
    severity,
    monsoonPriority: isMonsoon,
    location,
  });
}
