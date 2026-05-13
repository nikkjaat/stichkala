import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";

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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    if (!text) {
      return NextResponse.json(
        { success: false, error: "text required" },
        { status: 400 }
      );
    }
    if (text.length > 4000) {
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
    const msg = await ChatMessage.create({
      threadId: thread._id,
      sender: "admin",
      kind: "text",
      body: text,
    });
    thread.lastMessageAt = new Date();
    await thread.save();
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
