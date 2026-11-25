import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = process.env.API_INTERNAL_URL || "http://127.0.0.1:4000";
const API_KEY = process.env.API_KEY || "docintel-test-api-key-2026-secure-token";

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const targetPath = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${API_BASE_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ""}`;

  const headers = new Headers();
  // Pass along existing headers
  request.headers.forEach((value, key) => {
    // Skip host header to allow target resolution
    if (!["host", "origin"].includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  // Inject server-only API Key (browser never sees this)
  headers.set("X-API-Key", API_KEY);

  const reqInit: RequestInit = {
    method: request.method,
    headers,
  };

  if (["POST", "PATCH", "PUT"].includes(request.method)) {
    // For streaming or multipart uploads, pass raw body
    reqInit.body = request.body;
    // @ts-ignore - duplex is needed for streaming body in fetch
    reqInit.duplex = "half";
  }

  try {
    const upstreamRes = await fetch(targetUrl, reqInit);
    const resHeaders = new Headers();
    upstreamRes.headers.forEach((val, key) => {
      resHeaders.set(key, val);
    });

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Proxy upstream request failed", details: err.message },
      { status: 502 }
    );
  }
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, { path });
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, { path });
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, { path });
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return proxyRequest(request, { path });
}
