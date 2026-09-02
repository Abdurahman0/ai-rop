import { NextRequest } from "next/server";

/** Headers that belong to this hop only and must not be forwarded. */
const HOP_BY_HOP = ["host", "connection", "keep-alive", "transfer-encoding", "upgrade", "content-length"];

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.AI_ROP_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ detail: "AI_ROP_BACKEND_URL is not configured." }, { status: 500 });
  }

  let origin: string;
  try {
    // Only the origin matters: any path on the configured URL (/docs/, /api/) is ignored.
    origin = new URL(backendUrl).origin;
  } catch {
    return Response.json({ detail: `AI_ROP_BACKEND_URL is not a valid URL: ${backendUrl}` }, { status: 500 });
  }

  const { path } = await params;
  // Django requires the trailing slash; without it APPEND_SLASH answers a redirect.
  const target = new URL(`/${path.join("/")}/`, origin);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers(request.headers);
  HOP_BY_HOP.forEach((header) => headers.delete(header));

  let response: Response;
  try {
    response = await fetch(target, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
      redirect: "manual",
    });
  } catch (error) {
    return Response.json(
      { detail: `Unable to reach the backend at ${origin}. ${error instanceof Error ? error.message : ""}`.trim() },
      { status: 502 },
    );
  }

  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-encoding");
  responseHeaders.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
