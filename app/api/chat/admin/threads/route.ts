import { NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import { syncVisitorPublicIdForClient } from "@/lib/chatVisitorSync";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await connectDB();
    let threads = await ChatThread.find()
      .sort({ lastMessageAt: -1 })
      .limit(100)
      .lean();

    const clientsNeeding = new Set<string>();
    for (const t of threads) {
      const vid = String((t as { visitorPublicId?: string }).visitorPublicId ?? "").trim();
      if (!vid && t.clientId) clientsNeeding.add(t.clientId);
    }
    for (const cid of Array.from(clientsNeeding)) {
      await syncVisitorPublicIdForClient(cid);
    }
    if (clientsNeeding.size > 0) {
      threads = await ChatThread.find()
        .sort({ lastMessageAt: -1 })
        .limit(100)
        .lean();
    }

    return NextResponse.json({
      success: true,
      threads: threads.map((t) => ({
        _id: String(t._id),
        clientId: t.clientId,
        visitorPublicId: (t as { visitorPublicId?: string }).visitorPublicId,
        productId: t.productId ? String(t.productId) : null,
        productName: t.productName,
        displayName: t.displayName,
        lastMessageAt: t.lastMessageAt,
        payOfferAmountRupees: t.payOfferAmountRupees,
        payOfferExpiresAt: t.payOfferExpiresAt,
        payOfferUsedAt: t.payOfferUsedAt,
      })),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to list threads" },
      { status: 500 }
    );
  }
}
