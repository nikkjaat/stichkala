import crypto from "crypto";
import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";

/** One public handle per visitor (clientId), stored on all their threads. */
export async function syncVisitorPublicIdForClient(clientId: string) {
  const cid = String(clientId ?? "").trim();
  if (!cid) return;
  await connectDB();
  const first = await ChatThread.findOne({ clientId: cid })
    .sort({ createdAt: 1 })
    .select("visitorPublicId")
    .lean();
  let vid = String((first as { visitorPublicId?: string })?.visitorPublicId ?? "").trim();
  if (!vid) {
    vid = `SK-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  }
  await ChatThread.updateMany(
    {
      clientId: cid,
      $or: [
        { visitorPublicId: { $exists: false } },
        { visitorPublicId: null },
        { visitorPublicId: "" },
      ],
    },
    { $set: { visitorPublicId: vid } }
  );
}
