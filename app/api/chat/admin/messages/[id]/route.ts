import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import connectDB from "@/lib/mongodb";
import ChatMessage from "@/models/ChatMessage";
import ChatThread from "@/models/ChatThread";
import mongoose from "mongoose";
import {
  ADMIN_SESSION_COOKIE,
  verifySessionCookieValue,
} from "@/lib/adminSession";
import { serializeChatMessage } from "@/lib/chatMessageSerialize";

export const dynamic = "force-dynamic";

async function requireAdmin(): Promise<boolean> {
  const token = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  return verifySessionCookieValue(token);
}

/** PATCH — admin edits their own plain text message */
export async function PATCH(
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
    const messageId = params.id;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const text = String(body.text ?? "").trim();
    if (!text || text.length > 4000) {
      return NextResponse.json(
        { success: false, error: "text required (max 4000 chars)" },
        { status: 400 }
      );
    }

    await connectDB();
    const msg = await ChatMessage.findById(messageId);
    if (!msg || msg.sender !== "admin" || msg.kind !== "text") {
      return NextResponse.json(
        { success: false, error: "Not found or cannot edit" },
        { status: 404 }
      );
    }

    msg.body = text;
    msg.editedAt = new Date();
    await msg.save();

    return NextResponse.json({
      success: true,
      message: serializeChatMessage(
        msg.toObject() as Parameters<typeof serializeChatMessage>[0]
      ),
    });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to update message" },
      { status: 500 }
    );
  }
}

/** DELETE — admin removes their own message (gone for visitor too) */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }
    const messageId = params.id;
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return NextResponse.json(
        { success: false, error: "Invalid message" },
        { status: 400 }
      );
    }

    await connectDB();
    const msg = await ChatMessage.findById(messageId);
    if (!msg || msg.sender !== "admin") {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const threadId = msg.threadId;
    await ChatMessage.deleteOne({ _id: msg._id });

    const latest = await ChatMessage.findOne({ threadId })
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();
    await ChatThread.findByIdAndUpdate(threadId, {
      lastMessageAt: latest?.createdAt ?? new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to delete message" },
      { status: 500 }
    );
  }
}
