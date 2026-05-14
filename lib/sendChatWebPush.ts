import connectDB from "@/lib/mongodb";
import ChatPushSubscription from "@/models/ChatPushSubscription";
import ChatThread from "@/models/ChatThread";
import { formatChatMessageNotificationBody } from "@/lib/chatPushNotification";
import { configureWebPushIfPossible, webpush } from "@/lib/webPushServer";
import { getPublicSiteOrigin } from "@/lib/siteUrl";

type PushKeys = { p256dh: string; auth: string };

function visitorChatUrls(threadId: string) {
  const origin = getPublicSiteOrigin();
  const click = `${origin}/?sk_chat_thread=${encodeURIComponent(threadId)}`;
  const reply = `${click}&sk_notif_reply=1`;
  return { click, reply };
}

function adminChatUrls(threadId: string) {
  const origin = getPublicSiteOrigin();
  const click = `${origin}/secure/admin/vishakha?tab=chats&thread=${encodeURIComponent(threadId)}`;
  const reply = `${click}&sk_notif_reply=1`;
  return { click, reply };
}

function payloadForVisitor(
  threadId: string,
  clientId: string,
  title: string,
  body: string
) {
  const { click, reply } = visitorChatUrls(threadId);
  return JSON.stringify({
    title: title.slice(0, 80),
    body: body.slice(0, 240),
    url: click,
    replyUrl: reply,
    readThreadId: threadId,
    readClientId: clientId,
    readAsAdmin: "0",
  });
}

function payloadForAdmin(threadId: string, title: string, body: string) {
  const { click, reply } = adminChatUrls(threadId);
  return JSON.stringify({
    title: title.slice(0, 80),
    body: body.slice(0, 240),
    url: click,
    replyUrl: reply,
    readThreadId: threadId,
    readClientId: "",
    readAsAdmin: "1",
  });
}

async function removeDeadSubscription(endpoint: string) {
  await ChatPushSubscription.deleteOne({ endpoint }).catch(() => undefined);
}

async function sendToSubscription(
  endpoint: string,
  keys: PushKeys,
  payload: string
): Promise<void> {
  await webpush.sendNotification(
    { endpoint, keys: { p256dh: keys.p256dh, auth: keys.auth } },
    payload,
    { TTL: 60 * 60 * 12 }
  );
}

/** Best-effort: notify all registered admin devices of activity in a thread. */
export async function notifyAdminsWebPushForThread(
  threadId: string,
  preview: Parameters<typeof formatChatMessageNotificationBody>[0]
): Promise<void> {
  try {
    if (!configureWebPushIfPossible()) return;
    await connectDB();
    const subs = await ChatPushSubscription.find({ adminDevice: true }).lean();
    if (!subs.length) return;

    let chatName = "StichKalaa";
    const th = await ChatThread.findById(threadId)
      .select("productName lastEnquiredProductName")
      .lean();
    if (th) {
      chatName =
        String(
          (th as { lastEnquiredProductName?: string })
            .lastEnquiredProductName ||
            (th as { productName?: string }).productName ||
            ""
        ).trim() || "Chat";
    }
    const title = `Visitor · ${chatName}`.slice(0, 80);
    const body = formatChatMessageNotificationBody(preview);
    const payload = payloadForAdmin(threadId, title, body);

    for (const s of subs) {
      const ep = String(s.endpoint ?? "").trim();
      const k = s.keys as PushKeys | undefined;
      if (!ep || !k?.p256dh || !k?.auth) continue;
      try {
        await sendToSubscription(ep, k, payload);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await removeDeadSubscription(ep);
        else console.error("notifyAdminsWebPushForThread push failed", ep, err);
      }
    }
  } catch (e) {
    console.error("notifyAdminsWebPushForThread:", e);
  }
}

/** Best-effort: notify visitor devices for this clientId. */
export async function notifyVisitorWebPushForClient(
  clientId: string,
  threadId: string,
  preview: Parameters<typeof formatChatMessageNotificationBody>[0]
): Promise<void> {
  const cid = String(clientId ?? "").trim();
  if (!cid) return;
  try {
    if (!configureWebPushIfPossible()) return;
    await connectDB();
    const subs = await ChatPushSubscription.find({
      visitorClientId: cid,
    }).lean();
    if (!subs.length) return;

    let chatName = "StichKalaa";
    const th = await ChatThread.findById(threadId)
      .select("productName lastEnquiredProductName")
      .lean();
    if (th) {
      chatName =
        String(
          (th as { lastEnquiredProductName?: string })
            .lastEnquiredProductName ||
            (th as { productName?: string }).productName ||
            ""
        ).trim() || "Chat";
    }
    const title = `StichKalaa · ${chatName}`.slice(0, 80);
    const body = formatChatMessageNotificationBody(preview);
    const payload = payloadForVisitor(threadId, cid, title, body);

    for (const s of subs) {
      const ep = String(s.endpoint ?? "").trim();
      const k = s.keys as PushKeys | undefined;
      if (!ep || !k?.p256dh || !k?.auth) continue;
      try {
        await sendToSubscription(ep, k, payload);
      } catch (err: unknown) {
        const status = (err as { statusCode?: number })?.statusCode;
        if (status === 404 || status === 410) await removeDeadSubscription(ep);
        else
          console.error("notifyVisitorWebPushForClient push failed", ep, err);
      }
    }
  } catch (e) {
    console.error("notifyVisitorWebPushForClient:", e);
  }
}

function msgToPreview(m: {
  kind?: string;
  body?: string;
  fileName?: string;
  offerProductName?: string;
  orderNumber?: string;
}): Parameters<typeof formatChatMessageNotificationBody>[0] {
  return {
    kind: String(m.kind ?? "text"),
    body: m.body,
    fileName: m.fileName,
    offerProductName: m.offerProductName,
    orderNumber: m.orderNumber,
  };
}

/** Fire-and-forget from route handlers. */
export function fireWebPushAfterVisitorMessage(
  threadId: string,
  message: { kind?: string; body?: string; fileName?: string }
): void {
  void notifyAdminsWebPushForThread(threadId, msgToPreview(message));
}

export function fireWebPushAfterAdminMessage(
  threadId: string,
  clientId: string,
  message: {
    kind?: string;
    body?: string;
    fileName?: string;
    offerProductName?: string;
    orderNumber?: string;
  }
): void {
  void notifyVisitorWebPushForClient(clientId, threadId, msgToPreview(message));
}
