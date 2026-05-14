import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";
import { serializeMessagesWithProductPreviews } from "@/lib/enrichChatMessages";
import { isCloudinaryChatAttachmentUrl } from "@/lib/chatAttachmentUrl";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";
import { fireWebPushAfterAdminMessage } from "@/lib/sendChatWebPush";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread" },
        { status: 400 }
      );
    }
    await connectDB();
    const thread = await ChatThread.findById(threadId);
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

    if (!hasText && !hasAttachment) {
      return NextResponse.json(
        { success: false, error: "text or attachment required" },
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
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread" },
        { status: 400 }
      );
    }
    await connectDB();
    const thread = await ChatThread.findById(threadId);
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
        sender: "admin",
        kind: isImage ? "image" : "file",
        body: url,
        mimeType: mimeType || undefined,
        fileName: fileName || undefined,
      });
    } else {
      msg = await ChatMessage.create({
        threadId: thread._id,
        sender: "admin",
        kind: "text",
        body: text,
      });
    }
    thread.lastMessageAt = new Date();
    await thread.save();

    fireWebPushAfterAdminMessage(threadId, thread.clientId, msg.toObject());

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
