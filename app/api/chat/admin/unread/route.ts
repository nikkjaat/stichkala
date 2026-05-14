import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import ChatThread from "@/models/ChatThread";
import { formatChatMessageNotificationBody } from "@/lib/chatPushNotification";

export const dynamic = "force-dynamic";

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

    let notifyTitle: string | undefined;
    let notifyBody: string | undefined;
    let notifyThreadId: string | undefined;
    if (unread > 0) {
      const latestUnread = await ChatMessage.findOne({
        sender: "user",
        $or: [{ readAt: { $exists: false } }, { readAt: null }],
      })
        .sort({ createdAt: -1 })
        .lean();

      if (latestUnread?.threadId) {
        notifyThreadId = String(latestUnread.threadId);
        const th = await ChatThread.findById(latestUnread.threadId)
          .select("visitorPublicId clientId lastEnquiredProductName productName")
          .lean();
        const vid = String(
          (th as { visitorPublicId?: string } | null)?.visitorPublicId ?? ""
        ).trim();
        const cid = String((th as { clientId?: string } | null)?.clientId ?? "");
        const visitorLabel =
          vid || (cid ? `Guest ${cid.slice(0, 6)}…` : "Visitor");
        const topic =
          (th as { lastEnquiredProductName?: string } | null)
            ?.lastEnquiredProductName ||
          (th as { productName?: string } | null)?.productName ||
          "Chat";
        notifyTitle = `${visitorLabel} · ${topic}`;
        notifyBody = formatChatMessageNotificationBody(
          latestUnread as Parameters<typeof formatChatMessageNotificationBody>[0]
        );
      }
    }

    return NextResponse.json({
      success: true,
      unread,
      latestAt: latest?.createdAt ?? null,
      latestThreadId: latest?.threadId ? String(latest.threadId) : null,
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
