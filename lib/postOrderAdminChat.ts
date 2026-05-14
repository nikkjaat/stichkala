import mongoose from "mongoose";
import ChatMessage from "@/models/ChatMessage";
import ChatThread from "@/models/ChatThread";
import { fireWebPushAfterAdminMessage } from "@/lib/sendChatWebPush";
import { resolvePrimaryThread } from "@/lib/chatPrimaryThread";
import {
  orderReceivedChatBodyAgreed,
  orderReceivedChatBodyStandard,
} from "@/lib/orderChatMessages";

export type OrderChatVariant = "agreed" | "standard";

export async function appendOrderReceivedAdminChat(
  threadId: mongoose.Types.ObjectId,
  orderNumber: string,
  variant: OrderChatVariant
): Promise<void> {
  const body =
    variant === "agreed"
      ? orderReceivedChatBodyAgreed(orderNumber)
      : orderReceivedChatBodyStandard(orderNumber);
  await ChatMessage.create({
    threadId,
    sender: "admin",
    kind: "text",
    body,
  });
  await ChatThread.findByIdAndUpdate(threadId, { lastMessageAt: new Date() });
  const th = await ChatThread.findById(threadId).select("clientId").lean();
  const cid = String((th as { clientId?: string } | null)?.clientId ?? "").trim();
  if (cid) {
    fireWebPushAfterAdminMessage(String(threadId), cid, { kind: "text", body });
  }
}

/** Primary thread for this visitor (same device / chat client id). */
export async function appendOrderReceivedAdminChatForClient(
  clientId: string,
  orderNumber: string,
  variant: OrderChatVariant
): Promise<void> {
  const cid = String(clientId ?? "").trim();
  if (!cid) return;
  const thread = await resolvePrimaryThread(cid);
  await appendOrderReceivedAdminChat(thread._id, orderNumber, variant);
}

/** Any admin → visitor text on their primary chat thread (e.g. payment review, status). */
export async function appendAdminTextChatForVisitor(
  visitorChatClientId: string | undefined | null,
  body: string
): Promise<void> {
  const cid = String(visitorChatClientId ?? "").trim();
  const text = String(body ?? "").trim();
  if (!cid || !text) return;
  const thread = await resolvePrimaryThread(cid);
  const msg = await ChatMessage.create({
    threadId: thread._id,
    sender: "admin",
    kind: "text",
    body: text,
  });
  await ChatThread.findByIdAndUpdate(thread._id, { lastMessageAt: new Date() });
  fireWebPushAfterAdminMessage(String(thread._id), cid, msg.toObject());
}

/** Admin → visitor: status text plus Track Order button (no URL in body). */
export async function appendAdminTrackOrderChatForVisitor(
  visitorChatClientId: string | undefined | null,
  body: string,
  orderNumber: string
): Promise<void> {
  const cid = String(visitorChatClientId ?? "").trim();
  const text = String(body ?? "").trim();
  const on = String(orderNumber ?? "").trim();
  if (!cid || !text || !on) return;
  const thread = await resolvePrimaryThread(cid);
  const msg = await ChatMessage.create({
    threadId: thread._id,
    sender: "admin",
    kind: "track_order",
    body: text,
    orderNumber: on,
  });
  await ChatThread.findByIdAndUpdate(thread._id, { lastMessageAt: new Date() });
  fireWebPushAfterAdminMessage(String(thread._id), cid, msg.toObject());
}
