import { NextRequest } from "next/server";

async function proxy(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const backendUrl = process.env.AI_ROP_BACKEND_URL;
  if (!backendUrl) {
    return Response.json({ detail: "AI_ROP_BACKEND_URL is not configured." }, { status: 500 });
  }

  const { path } = await params;
  const target = new URL(`/${path.join("/")}/`, backendUrl);
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));

  const headers = new Headers(request.headers);
  headers.delete("host");

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: ["GET", "HEAD"].includes(request.method) ? undefined : await request.text(),
    redirect: "manual",
  });

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
