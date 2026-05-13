import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";

/** Unread admin → user messages across all threads for this visitor */
export async function GET(request: NextRequest) {
  try {
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim();
    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId required" },
        { status: 400 }
      );
    }
    await connectDB();
    const threads = await ChatThread.find({ clientId }).select("_id").lean();
    const ids = threads.map((t) => t._id);
    if (ids.length === 0) {
      return NextResponse.json({ success: true, unread: 0 });
    }
    const unread = await ChatMessage.countDocuments({
      threadId: { $in: ids },
      sender: "admin",
      $or: [{ readAt: { $exists: false } }, { readAt: null }],
    });
    return NextResponse.json({ success: true, unread });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
