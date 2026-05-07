// Health check endpoint — Faz 5 deploy için kritik.
// Fly.io / load balancer / uptime monitor bu URL'i probe eder.

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const startedAt = Date.now();
  let dbOk = false;
  try {
    await db.$queryRaw`SELECT 1`;
    dbOk = true;
  } catch {
    dbOk = false;
  }

  const status = dbOk ? "ok" : "degraded";
  const code = dbOk ? 200 : 503;
  return NextResponse.json(
    {
      status,
      uptime: process.uptime(),
      db: dbOk ? "ok" : "down",
      version: process.env.npm_package_version ?? "0.0.0",
      checkedInMs: Date.now() - startedAt,
    },
    { status: code }
  );
}
