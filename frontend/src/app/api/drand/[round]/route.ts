import { NextRequest, NextResponse } from 'next/server';

const DRAND_URL = 'https://api.drand.sh/52db9ba70e0cc0f6eaf7803dd07447a1f5477735fd3f661792ba94600c84e971';

export async function GET(
  request: NextRequest,
  { params }: { params: { round: string } }
) {
  try {
    const { round } = params;
    const endpoint = round === 'latest'
      ? `${DRAND_URL}/public/latest`
      : `${DRAND_URL}/public/${round}`;

    const response = await fetch(endpoint, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch from DRAND: ${response.statusText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=59',
      },
    });
  } catch (error) {
    console.error('DRAND proxy error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch DRAND beacon' },
      { status: 500 }
    );
  }
}