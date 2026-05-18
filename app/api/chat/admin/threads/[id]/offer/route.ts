import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import Product from "@/models/Product";
import mongoose from "mongoose";
import crypto from "crypto";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";
import { fireWebPushAfterAdminMessage } from "@/lib/sendChatWebPush";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

function makeToken() {
  return crypto.randomBytes(18).toString("hex");
}

/** POST — admin sends negotiated UPI price offer (copy ID in chat, no payment link) */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const threadId = params.id;
    const body = await request.json();
    const amountRupees = Number(body.amountRupees);
    const productId = String(body.productId ?? "").trim();
    const expiresInMinutes = Math.min(
      24 * 60,
      Math.max(15, Number(body.expiresInMinutes ?? 120))
    );

    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(amountRupees) || amountRupees < 1 || amountRupees > 500000) {
      return NextResponse.json(
        { success: false, error: "Invalid amount" },
        { status: 400 }
      );
    }
    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return NextResponse.json(
        { success: false, error: "Valid productId required" },
        { status: 400 }
      );
    }

    await connectDB();
    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Thread not found" },
        { status: 404 }
      );
    }

    const product = await Product.findById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: "Product not found" },
        { status: 400 }
      );
    }

    const listPriceRupees =
      Math.round(Number(product.basePrice) * 100) / 100;
    const revisedRounded =
      Math.round(amountRupees * 100) / 100;
    const productName = String(product.name ?? "Product");

    const token = makeToken();
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

    thread.payOfferToken = token;
    thread.payOfferRazorpayOrderId = undefined;
    thread.payOfferAmountRupees = revisedRounded;
    thread.payOfferListPriceRupees = listPriceRupees;
    thread.payOfferExpiresAt = expiresAt;
    thread.payOfferProductId = new mongoose.Types.ObjectId(productId);
    thread.payOfferUsedAt = undefined;
    thread.lastMessageAt = new Date();
    await thread.save();

    const label = `Revise price — ${productName}: list ₹${listPriceRupees} → pay ₹${revisedRounded} via UPI. Copy the UPI ID below and confirm payment. Expires ${expiresAt.toLocaleString("en-IN")}.`;
    const msg = await ChatMessage.create({
      threadId: thread._id,
      sender: "admin",
      kind: "payment_cta",
      body: label,
      payToken: token,
      offerProductName: productName,
      offerListPriceRupees: listPriceRupees,
      offerRevisedPriceRupees: revisedRounded,
      offerProductId: new mongoose.Types.ObjectId(productId),
    });

    fireWebPushAfterAdminMessage(threadId, thread.clientId, msg.toObject());

    await ChatMessage.updateMany(
      {
        threadId: thread._id,
        kind: "payment_cta",
        offerProductId: new mongoose.Types.ObjectId(productId),
        payToken: { $ne: token },
      },
      { $set: { offerVoidedAt: new Date() } }
    );

    return NextResponse.json({
      success: true,
      payToken: token,
      message: serializeChatMessage(
        msg.toObject() as unknown as Parameters<typeof serializeChatMessage>[0]
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to create offer" },
      { status: 500 }
    );
  }
}
