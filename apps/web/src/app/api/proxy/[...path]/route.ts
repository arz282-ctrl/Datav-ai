import { NextRequest, NextResponse } from "next/server";

const API_BASE_URL = (process.env.API_INTERNAL_URL || "http://127.0.0.1:4000").replace(/\/+$/, "");
const API_KEY = process.env.API_KEY || "docintel-test-api-key-2026-secure-token";

async function proxyRequest(request: NextRequest, params: { path: string[] }) {
  const targetPath = params.path.join("/");
  const searchParams = request.nextUrl.searchParams.toString();
  const targetUrl = `${API_BASE_URL}/api/${targetPath}${searchParams ? `?${searchParams}` : ""}`;

  const headers = new Headers();
  // Pass along headers, explicitly omitting host, origin, and content-length
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (!["host", "origin", "content-length"].includes(lower)) {
      headers.set(key, value);
    }
  });

  // Inject server-only API Key (browser never sees this)
  headers.set("X-API-Key", API_KEY);

  const reqInit: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(60000), // 60s timeout for cloud serverless cold-starts
  };

  if (["POST", "PATCH", "PUT"].includes(request.method)) {
    // For streaming or multipart uploads, pass raw body
    reqInit.body = request.body;
    // @ts-ignore - duplex is needed for streaming body in fetch
    reqInit.duplex = "half";
  }

  try {
    const upstreamRes = await fetch(targetUrl, reqInit);
    const contentType = upstreamRes.headers.get("content-type") || "";

    // If upstream returned an error status and non-JSON content (e.g. HTML 502/504 proxy page),
    // normalize it to a clean JSON error response so the client never encounters 'Unexpected token <'
    if (!upstreamRes.ok && !contentType.includes("application/json")) {
      const rawText = await upstreamRes.text();
      const sanitized = rawText
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 300);

      return NextResponse.json(
        {
          error: `Upstream service returned HTTP ${upstreamRes.status} (${upstreamRes.statusText})`,
          details: sanitized || "Upstream service cold-start or connection failure",
        },
        { status: upstreamRes.status }
      );
    }

    const resHeaders = new Headers();
    upstreamRes.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (!["content-encoding", "content-length"].includes(lower)) {
        resHeaders.set(key, val);
      }
    });

    return new NextResponse(upstreamRes.body, {
      status: upstreamRes.status,
      statusText: upstreamRes.statusText,
      headers: resHeaders,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "TimeoutError" || err?.message?.toLowerCase().includes("timeout");
    return NextResponse.json(
      {
        error: isTimeout
          ? "Upstream service timeout (backend cold-start took longer than 60s)"
          : "Proxy upstream request failed",
        details: err?.message || String(err),
      },
      { status: isTimeout ? 504 : 502 }
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
