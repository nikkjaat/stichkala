import { NextResponse } from "next/server";
import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import { resolvePrimaryThread } from "@/lib/chatPrimaryThread";

function previewLine(doc: {
  body: string;
  kind: string;
  sender: string;
}): string {
  let inner: string;
  if (doc.kind === "product_link") inner = "Sent a product link";
  else if (doc.kind === "payment_cta") inner = "Revised price / pay offer";
  else if (doc.kind === "track_order") inner = "Order update — Track Order";
  else {
    const t = String(doc.body ?? "")
      .replace(/\s+/g, " ")
      .trim();
    inner = t.length > 70 ? `${t.slice(0, 70)}…` : t;
  }
  return doc.sender === "admin" ? `You: ${inner}` : inner;
}

/** One row per visitor — subject = latest product enquiry, count on primary thread. */
export async function GET() {
  try {
    await connectDB();
    const recent = await ChatThread.find()
      .sort({ lastMessageAt: -1 })
      .limit(200)
      .lean();

    const seen = new Set<string>();
    const clientOrder: string[] = [];
    for (const t of recent) {
      const cid = t.clientId as string;
      if (seen.has(cid)) continue;
      seen.add(cid);
      clientOrder.push(cid);
    }

    const conversations: Array<{
      threadId: string;
      clientId: string;
      visitorPublicId?: string;
      subject: string;
      productEnquiryCount: number;
      lastMessageAt: Date;
    }> = [];

    for (const clientId of clientOrder.slice(0, 80)) {
      const primary = await resolvePrimaryThread(clientId);
      const lean = await ChatThread.findById(primary._id).lean();
      if (!lean) continue;
      const le = (lean as { lastEnquiredProductName?: string })
        .lastEnquiredProductName;
      const pn = lean.productName;
      conversations.push({
        threadId: String(primary._id),
        clientId,
        visitorPublicId: (lean as { visitorPublicId?: string }).visitorPublicId,
        subject: le || pn || "Chat",
        productEnquiryCount:
          (lean as { productEnquiryCount?: number }).productEnquiryCount ?? 0,
        lastMessageAt: lean.lastMessageAt as Date,
      });
    }

    const clientIds = conversations.map((c) => c.clientId);
    if (clientIds.length === 0) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const threadsAll = await ChatThread.find({
      clientId: { $in: clientIds },
    })
      .select("_id clientId")
      .lean();

    const threadIds = threadsAll
      .map((t) => t._id)
      .filter(Boolean) as mongoose.Types.ObjectId[];

    const threadToClient = new Map<string, string>();
    const threadsByClient = new Map<string, mongoose.Types.ObjectId[]>();
    for (const t of threadsAll) {
      const tid = String(t._id);
      const cid = String(t.clientId);
      threadToClient.set(tid, cid);
      if (!threadsByClient.has(cid)) threadsByClient.set(cid, []);
      threadsByClient.get(cid)!.push(t._id as mongoose.Types.ObjectId);
    }

    type LatestRow = {
      _id: mongoose.Types.ObjectId;
      body: string;
      kind: string;
      sender: string;
      createdAt: Date;
    };

    let latestPerThread: LatestRow[] = [];
    let unreadPerThread: Array<{ _id: mongoose.Types.ObjectId; unread: number }> =
      [];

    if (threadIds.length > 0) {
      latestPerThread = (await ChatMessage.aggregate([
        { $match: { threadId: { $in: threadIds } } },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: "$threadId",
            body: { $first: "$body" },
            kind: { $first: "$kind" },
            sender: { $first: "$sender" },
            createdAt: { $first: "$createdAt" },
          },
        },
      ])) as LatestRow[];

      unreadPerThread = (await ChatMessage.aggregate([
        {
          $match: {
            threadId: { $in: threadIds },
            sender: "user",
            $or: [{ readAt: null }, { readAt: { $exists: false } }],
          },
        },
        { $group: { _id: "$threadId", unread: { $sum: 1 } } },
      ])) as Array<{ _id: mongoose.Types.ObjectId; unread: number }>;
    }

    const unreadByClient = new Map<string, number>();
    for (const row of unreadPerThread) {
      const cid = threadToClient.get(String(row._id));
      if (cid)
        unreadByClient.set(cid, (unreadByClient.get(cid) ?? 0) + row.unread);
    }

    const latestByThread = new Map(
      latestPerThread.map((x) => [String(x._id), x])
    );

    const enriched = conversations.map((c) => {
      const tids = threadsByClient.get(c.clientId) ?? [];
      let best: LatestRow | null = null;
      for (const tid of tids) {
        const L = latestByThread.get(String(tid));
        if (!L?.createdAt) continue;
        if (
          !best ||
          new Date(L.createdAt).getTime() > new Date(best.createdAt).getTime()
        ) {
          best = L;
        }
      }
      const unreadUserMessages = unreadByClient.get(c.clientId) ?? 0;
      const lastActivityAt = best?.createdAt
        ? new Date(best.createdAt)
        : new Date(c.lastMessageAt);
      const lastMessagePreview = best
        ? previewLine({
            body: best.body,
            kind: String(best.kind),
            sender: String(best.sender),
          })
        : "";
      return {
        ...c,
        lastMessageAt: lastActivityAt,
        lastMessagePreview,
        unreadUserMessages,
      };
    });

    enriched.sort((a, b) => {
      const tb = new Date(b.lastMessageAt).getTime();
      const ta = new Date(a.lastMessageAt).getTime();
      if (tb !== ta) return tb - ta;
      return (b.unreadUserMessages ?? 0) - (a.unreadUserMessages ?? 0);
    });

    return NextResponse.json({ success: true, conversations: enriched });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to list conversations" },
      { status: 500 }
    );
  }
}
