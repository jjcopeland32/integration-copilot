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

type RouteContext = { params: { segments: string[] } };

export async function GET(request: NextRequest, context: RouteContext) {
  return handle(request, 'GET', context.params?.segments);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handle(request, 'POST', context.params?.segments);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return handle(request, 'PUT', context.params?.segments);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handle(request, 'PATCH', context.params?.segments);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return handle(request, 'DELETE', context.params?.segments);
}

export async function HEAD(request: NextRequest, context: RouteContext) {
  return handle(request, 'HEAD', context.params?.segments);
}
