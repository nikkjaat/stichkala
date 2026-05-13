import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";

/** Unread user → admin messages (admin dashboard) */
export async function GET() {
  try {
    await connectDB();
    const unread = await ChatMessage.countDocuments({
      sender: "user",
      $or: [{ readAt: { $exists: false } }, { readAt: null }],
    });
    const latest = await ChatMessage.findOne({ sender: "user" })
      .sort({ createdAt: -1 })
      .select("createdAt threadId")
      .lean();

    return NextResponse.json({
      success: true,
      unread,
      latestAt: latest?.createdAt ?? null,
      latestThreadId: latest?.threadId ? String(latest.threadId) : null,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
