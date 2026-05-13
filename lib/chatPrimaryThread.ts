import connectDB from "@/lib/mongodb";
import ChatThread from "@/models/ChatThread";

/** Single ongoing conversation per visitor: one canonical thread per clientId. */
export async function resolvePrimaryThread(clientId: string) {
  const cid = String(clientId ?? "").trim();
  if (!cid) throw new Error("clientId required");
  await connectDB();

  let thread = await ChatThread.findOne({
    clientId: cid,
    $or: [{ productId: null }, { productId: { $exists: false } }],
  }).sort({ lastMessageAt: -1 });

  if (!thread) {
    thread = await ChatThread.findOne({ clientId: cid }).sort({
      lastMessageAt: -1,
    });
    if (thread) {
      thread.set("productId", undefined);
      await thread.save();
    }
  }

  if (!thread) {
    thread = await ChatThread.create({
      clientId: cid,
      productId: null,
      lastMessageAt: new Date(),
      productEnquiryCount: 0,
    });
    return thread;
  }

  if (thread.productId != null) {
    thread.set("productId", undefined);
    await thread.save();
  }

  return thread;
}
