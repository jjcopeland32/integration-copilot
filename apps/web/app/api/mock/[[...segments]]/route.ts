import { NextRequest, NextResponse } from 'next/server';
import { getMockEntry } from '@/lib/mock-registry';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD';

async function handle(
  request: NextRequest,
  method: Method,
  segments: string[] | undefined
) {
  const normalizedSegments = (segments || []).filter((segment) => segment.length > 0);
  const path = `/${normalizedSegments.join('/')}` || '/';
  const lookup = getMockEntry(method === 'HEAD' ? 'GET' : method, path || '/');

  if (!lookup) {
    return NextResponse.json(
      {
        error: 'Mock route not found',
        message: `${method} ${path || '/'}`,
      },
      { status: 404 }
    );
  }

  const { entry, route } = lookup;
  if (entry.latencyMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, entry.latencyMs));
  }

  return NextResponse.json(route.response, {
    status: route.statusCode,
    headers: {
      'x-mock-route': `${route.method.toUpperCase()} ${route.path}`,
    },
  });
}

export function GET(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'GET', context.params.segments);
}

export function POST(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'POST', context.params.segments);
}

export function PUT(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'PUT', context.params.segments);
}

export function PATCH(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'PATCH', context.params.segments);
}

export function DELETE(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'DELETE', context.params.segments);
}

export function HEAD(
  request: NextRequest,
  context: { params: { segments?: string[] } }
) {
  return handle(request, 'HEAD', context.params.segments);
}
