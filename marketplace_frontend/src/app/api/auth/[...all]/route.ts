import { auth, pool } from "@/lib/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export async function POST(req: NextRequest) {
  const url = req.nextUrl.pathname;
  if (url.endsWith("/sign-up/email")) {
    try {
      const cloned = req.clone();
      const body = await cloned.json();
      if (body?.email) {
        const existing = await pool.query(
          `SELECT id FROM "user" WHERE LOWER(email) = LOWER($1)`,
          [String(body.email).trim()],
        );
        if (existing.rows.length > 0) {
          return NextResponse.json(
            {
              message:
                "Email này đã được sử dụng. Vui lòng đăng nhập hoặc chọn email khác!",
            },
            { status: 400 },
          );
        }
      }
    } catch {
      // ignore json parse error and let better-auth handle
    }
  }

  return handlers.POST(req);
}
