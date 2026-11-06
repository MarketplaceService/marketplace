import { getPublicApiV1Base } from "@/lib/api/api-url";
import { auth } from "@/lib/auth/auth";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const FORWARDED_HEADERS = ["content-type", "accept", "accept-language"];

async function getSessionToken(request: NextRequest): Promise<string> {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.session?.token) {
      return session.session.token;
    }
  } catch {
    // ignore
  }

  // Fallback: extract directly from better-auth.session_token cookie
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(
    /(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/,
  );
  if (match && match[1]) {
    const rawVal = decodeURIComponent(match[1].trim());
    const dotIdx = rawVal.lastIndexOf(".");
    return dotIdx !== -1 ? rawVal.slice(0, dotIdx) : rawVal;
  }

  return "";
}

function buildNestUrl(path: string[], request: NextRequest): URL {
  const base = getPublicApiV1Base();
  const nestPath = path.join("/");
  const url = new URL(`${base}/${nestPath}`);

  request.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });
  return url;
}

async function proxyToNest(request: NextRequest, path: string[]) {
  const sessionToken = await getSessionToken(request);
  const nestUrl = buildNestUrl(path, request);

  const proxyHeaders: Record<string, string> = {};
  FORWARDED_HEADERS.forEach((header) => {
    const value = request.headers.get(header);
    if (value) proxyHeaders[header] = value;
  });

  // Always forward cookie header so NestJS can inspect better-auth cookies directly
  const cookie = request.headers.get("cookie");
  if (cookie) {
    proxyHeaders.cookie = cookie;
  }

  if (sessionToken) {
    proxyHeaders.Authorization = `Bearer ${sessionToken}`;
  }

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  const body = hasBody ? await request.text() : undefined;

  const nestResponse = await fetch(nestUrl.toString(), {
    method: request.method,
    headers: proxyHeaders,
    body,
  });

  const responseBody = await nestResponse.text();

  return new NextResponse(responseBody, {
    status: nestResponse.status,
    headers: {
      "content-type": nestResponse.headers.get(`content-type`) ?? "application/json",
    },
  });
}

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;

  return proxyToNest(request, path);
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;

  return proxyToNest(request, path);
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;

  return proxyToNest(request, path);
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;

  return proxyToNest(request, path);
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;

  return proxyToNest(request, path);
}
