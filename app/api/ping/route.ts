import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";

/** Avoid static optimization so each request runs on the server / hits DB. */
export const dynamic = "force-dynamic";

async function runPing() {
  await connectDB();
  const db = mongoose.connection.db;
  if (db) {
    await db.admin().command({ ping: 1 });
  }
  return {
    ok: true as const,
    ts: new Date().toISOString(),
    mongo:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  };
}

/** Lightweight keep-warm + DB ping for external cron (UptimeRobot, cron-job.org, etc.). */
export async function GET() {
  try {
    const body = await runPing();
    return NextResponse.json(body, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("[ping]", e);
    return NextResponse.json(
      { ok: false, error: "ping_failed" },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}

export async function HEAD() {
  try {
    await runPing();
    return new NextResponse(null, { status: 204 });
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
