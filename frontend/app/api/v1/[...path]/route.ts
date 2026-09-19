// frontend/app/api/v1/[...path]/route.ts
// Proxy dinámico para todas las peticiones a la API v1 del backend Express

import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000/api/v1';

async function proxyRequest(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  try {
    const resolvedParams = await params;
    const pathSegments = resolvedParams.path || [];
    const targetPath = pathSegments.join('/');
    const targetUrl = `${BACKEND_URL}/${targetPath}${request.nextUrl.search}`;

    // Extraer token de autorización (cookie o header Bearer)
    let token = request.cookies.get('auth_token')?.value;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const clientIp =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      '';
    if (clientIp) headers['x-forwarded-for'] = clientIp;

    const userAgent = request.headers.get('user-agent') || '';
    if (userAgent) headers['user-agent'] = userAgent;

    const contentType = request.headers.get('content-type');
    if (contentType) headers['Content-Type'] = contentType;

    let body: any = null;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      body = await request.text();
    }

    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const data = await backendRes.text();
    let jsonOrText: any;
    try {
      jsonOrText = JSON.parse(data);
    } catch {
      jsonOrText = data;
    }

    if (typeof jsonOrText === 'string') {
      return new NextResponse(jsonOrText, {
        status: backendRes.status,
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    return NextResponse.json(jsonOrText, { status: backendRes.status });
  } catch (err: any) {
    console.error('Error en proxy API v1:', err);
    return NextResponse.json(
      { error: 'Backend Connection Error', message: err.message },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function POST(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function PUT(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return proxyRequest(req, ctx);
}
