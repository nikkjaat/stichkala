import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";
import { syncVisitorPublicIdForClient } from "@/lib/chatVisitorSync";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";

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

    return NextResponse.json({
      success: true,
      messages: messages.map((m) =>
        serializeChatMessage(m as Parameters<typeof serializeChatMessage>[0])
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to load messages" },
      { status: 500 }
    );
  }
}

/** POST — user sends text */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();
    const text = String(body.text ?? "").trim();

    if (!clientId || !text) {
      return NextResponse.json(
        { success: false, error: "clientId and text required" },
        { status: 400 }
      );
    }
    if (text.length > 4000) {
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

    const msg = await ChatMessage.create({
      threadId: thread._id,
      sender: "user",
      kind: "text",
      body: text,
    });
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
