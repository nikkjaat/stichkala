import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";
import { syncVisitorPublicIdForClient } from "@/lib/chatVisitorSync";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";
import { serializeMessagesWithProductPreviews } from "@/lib/enrichChatMessages";
import { isCloudinaryChatAttachmentUrl } from "@/lib/chatAttachmentUrl";

export const dynamic = "force-dynamic";

async function assertUserThread(threadId: string, clientId: string | null) {
  if (!mongoose.Types.ObjectId.isValid(threadId)) return null;
  const thread = await ChatThread.findById(threadId);
  if (!thread || !clientId || thread.clientId !== clientId) return null;
  return thread;
}

/** GET /api/chat/threads/[id]/messages?clientId= */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const clientId = request.nextUrl.searchParams.get("clientId")?.trim();

    await connectDB();
    const thread = await assertUserThread(threadId, clientId ?? null);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const messages = await ChatMessage.find({ threadId: thread._id })
      .sort({ createdAt: 1 })
      .limit(200)
      .lean();

    const payload = await serializeMessagesWithProductPreviews(
      messages as unknown as Record<string, unknown>[]
    );

    return NextResponse.json({
      success: true,
      messages: payload,
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

/** POST — user sends text or a chat attachment (URL from POST /api/chat/upload) */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();
    const text = String(body.text ?? "").trim();
    const attachment = body.attachment as
      | { url?: string; mimeType?: string; fileName?: string }
      | undefined;

    const hasText = Boolean(text);
    const hasAttachment =
      attachment &&
      typeof attachment === "object" &&
      typeof attachment.url === "string" &&
      attachment.url.trim().length > 0;

    if (!clientId || (!hasText && !hasAttachment)) {
      return NextResponse.json(
        { success: false, error: "clientId and text or attachment required" },
        { status: 400 }
      );
    }
    if (hasText && hasAttachment) {
      return NextResponse.json(
        { success: false, error: "Send either text or an attachment, not both" },
        { status: 400 }
      );
    }

    if (hasText && text.length > 4000) {
      return NextResponse.json(
        { success: false, error: "Message too long" },
        { status: 400 }
      );
    }

    await connectDB();
    const thread = await assertUserThread(threadId, clientId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    let msg;
    if (hasAttachment) {
      const url = String(attachment!.url).trim();
      if (!isCloudinaryChatAttachmentUrl(url)) {
        return NextResponse.json(
          { success: false, error: "Invalid attachment URL" },
          { status: 400 }
        );
      }
      const mimeType = String(attachment!.mimeType ?? "").slice(0, 200);
      const fileName = String(attachment!.fileName ?? "file").slice(0, 240);
      const isImage = mimeType.startsWith("image/");
      msg = await ChatMessage.create({
        threadId: thread._id,
        sender: "user",
        kind: isImage ? "image" : "file",
        body: url,
        mimeType: mimeType || undefined,
        fileName: fileName || undefined,
      });
    } else {
      msg = await ChatMessage.create({
        threadId: thread._id,
        sender: "user",
        kind: "text",
        body: text,
      });
    }
    thread.lastMessageAt = new Date();
    await thread.save();
    await syncVisitorPublicIdForClient(clientId);

    return NextResponse.json({
      success: true,
      message: serializeChatMessage(
        msg.toObject() as Parameters<typeof serializeChatMessage>[0]
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to send" },
      { status: 500 }
    );
  }
}
