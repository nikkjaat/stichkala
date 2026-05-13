import { NextRequest, NextResponse } from "next/server";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";
import ChatMessage from "@/models/ChatMessage";
import mongoose from "mongoose";

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const threadId = params.id;
    const body = await request.json();
    const clientId = String(body.clientId ?? "").trim();
    const asAdmin = Boolean(body.asAdmin);

    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(threadId)) {
      return NextResponse.json(
        { success: false, error: "Invalid thread" },
        { status: 400 }
      );
    }

    const thread = await ChatThread.findById(threadId);
    if (!thread) {
      return NextResponse.json(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    const unreadClause = {
      $or: [{ readAt: { $exists: false } }, { readAt: null }],
    };

    if (asAdmin) {
      await ChatMessage.updateMany(
        {
          $and: [
            { threadId: thread._id },
            { sender: "user" },
            unreadClause,
          ],
        },
        { $set: { readAt: new Date() } }
      );
    } else {
      if (!clientId || thread.clientId !== clientId) {
        return NextResponse.json(
          { success: false, error: "Not found" },
          { status: 404 }
        );
      }
      await ChatMessage.updateMany(
        {
          $and: [
            { threadId: thread._id },
            { sender: "admin" },
            unreadClause,
          ],
        },
        { $set: { readAt: new Date() } }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { success: false, error: "Failed to mark read" },
      { status: 500 }
    );
  }
}
