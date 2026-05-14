import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import { formatChatMessageNotificationBody } from "@/lib/chatPushNotification";

export const dynamic = "force-dynamic";

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

    let notifyTitle: string | undefined;
    let notifyBody: string | undefined;
    let notifyThreadId: string | undefined;
    if (unread > 0) {
      const latestUnread = await ChatMessage.findOne({
        threadId: { $in: ids },
        sender: "admin",
        $or: [{ readAt: { $exists: false } }, { readAt: null }],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (latestUnread) {
        if (latestUnread.threadId) {
          notifyThreadId = String(latestUnread.threadId);
        }
        const th = await ChatThread.findById(latestUnread.threadId)
          .select("productName lastEnquiredProductName")
          .lean();
        const chatName =
          (th as { lastEnquiredProductName?: string } | null)
            ?.lastEnquiredProductName ||
          (th as { productName?: string } | null)?.productName ||
          "StichKalaa";
        notifyTitle = `StichKalaa · ${chatName}`;
        notifyBody = formatChatMessageNotificationBody(
          latestUnread as Parameters<
            typeof formatChatMessageNotificationBody
          >[0]
        );
      }
    }

    return NextResponse.json({
      success: true,
      unread,
      ...(notifyThreadId ? { notifyThreadId } : {}),
      ...(notifyTitle && notifyBody ? { notifyTitle, notifyBody } : {}),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed" },
      { status: 500 }
    );
  }
}
