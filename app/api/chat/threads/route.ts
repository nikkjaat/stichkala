import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";
import { buildProductPublicUrl } from "@/lib/chatProductUrl";
import { syncVisitorPublicIdForClient } from "@/lib/chatVisitorSync";
import { resolvePrimaryThread } from "@/lib/chatPrimaryThread";

export const dynamic = "force-dynamic";

function isOid(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

function serializeThread(t: {
  _id: unknown;
  clientId: string;
  visitorPublicId?: string;
  productId?: unknown;
  productName?: string;
  displayName?: string;
  lastMessageAt: Date;
  createdAt?: Date;
  lastEnquiredProductName?: string;
  productEnquiryCount?: number;
}) {
  return {
    _id: String(t._id),
    clientId: t.clientId,
    visitorPublicId: t.visitorPublicId,
    productId: t.productId ? String(t.productId) : null,
    productName: t.productName,
    displayName: t.displayName,
    lastMessageAt: t.lastMessageAt,
    createdAt: t.createdAt,
    lastEnquiredProductName: t.lastEnquiredProductName,
    productEnquiryCount: t.productEnquiryCount ?? 0,
  };
}

/** GET — single primary conversation for this visitor */
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
    const primary = await resolvePrimaryThread(clientId);
    await syncVisitorPublicIdForClient(clientId);
    const doc = await ChatThread.findById(primary._id).lean();
    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      threads: [serializeThread(doc as Parameters<typeof serializeThread>[0])],
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to list threads" },
      { status: 500 }
    );
  }
}

/** POST — open primary thread; optional product link updates subject + enquiry count */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();
    const productId = body.productId ? String(body.productId).trim() : null;
    const productName = body.productName
      ? String(body.productName).trim()
      : undefined;
    const displayName = body.displayName
      ? String(body.displayName).trim()
      : undefined;
    const sendProductLink = Boolean(body.sendProductLink);

    if (!clientId) {
      return NextResponse.json(
        { success: false, error: "clientId required" },
        { status: 400 }
      );
    }

    await connectDB();
    const thread = await resolvePrimaryThread(clientId);
    let dirty = false;

    if (displayName && !thread.displayName) {
      thread.displayName = displayName;
      dirty = true;
    }

    if (sendProductLink && productId && isOid(productId)) {
      const url = buildProductPublicUrl(productId);
      await ChatMessage.create({
        threadId: thread._id,
        sender: "user",
        kind: "product_link",
        body: url,
      });
      thread.lastMessageAt = new Date();
      thread.lastEnquiredProductId = new mongoose.Types.ObjectId(productId);
      thread.lastEnquiredProductName =
        productName || thread.lastEnquiredProductName || "Product";
      thread.productEnquiryCount = (thread.productEnquiryCount ?? 0) + 1;
      dirty = true;
    }

    if (dirty) {
      await thread.save();
    }

    await syncVisitorPublicIdForClient(clientId);

    const refreshed = await ChatThread.findById(thread._id).lean();

    return NextResponse.json({
      success: true,
      thread: serializeThread(
        refreshed as Parameters<typeof serializeThread>[0]
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to open chat" },
      { status: 500 }
    );
  }
}
