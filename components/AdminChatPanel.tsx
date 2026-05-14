"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Image from "next/image";
import {
  Send,
  Loader2,
  Check,
  CheckCheck,
  Paperclip,
  Pencil,
  Trash2,
  FileText,
} from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { extractProductIdFromChatUrl } from "@/lib/chatProductUrl";
import ChatProductDetailModal from "@/components/ChatProductDetailModal";
import ChatAttachmentLightbox from "@/components/ChatAttachmentLightbox";
import { chatFetch } from "@/lib/chatFetch";
import {
  shouldNotifyAdminChat,
  showChatBrowserNotification,
  ensureChatNotifyServiceWorker,
  shouldMarkChatReadInClient,
} from "@/lib/chatPushNotification";
import ChatNotifToggle from "@/components/ChatNotifToggle";

type ProductMini = { _id: string; name: string; basePrice: number };

type ConversationRow = {
  threadId: string;
  clientId: string;
  visitorPublicId?: string;
  subject: string;
  productEnquiryCount: number;
  lastMessageAt: string;
  lastMessagePreview?: string;
  unreadUserMessages?: number;
};

type MessageRow = {
  _id: string;
  sender: "user" | "admin";
  kind: string;
  body: string;
  orderNumber?: string;
  payToken?: string;
  offerProductId?: string;
  offerProductName?: string;
  offerListPriceRupees?: number;
  offerRevisedPriceRupees?: number;
  offerVoidedAt?: string | null;
  mimeType?: string;
  fileName?: string;
  editedAt?: string | null;
  readAt: string | null;
  createdAt: string | null;
  productPreview?: {
    name: string;
    image?: string;
    basePrice: number;
  };
};

export default function AdminChatPanel({
  products,
  active,
  onUnread,
}: {
  products: ProductMini[];
  active: boolean;
  onUnread?: (n: number) => void;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [revisePrices, setRevisePrices] = useState<Record<string, string>>({});
  const [offerBusyKey, setOfferBusyKey] = useState<string | null>(null);
  const [productModalId, setProductModalId] = useState<string | null>(null);
  const [conversationsHydrated, setConversationsHydrated] = useState(false);
  const [attachmentLightbox, setAttachmentLightbox] = useState<{
    url: string;
    fileName?: string | null;
    isImage: boolean;
  } | null>(null);
  const [pendingAdminAttachment, setPendingAdminAttachment] = useState<{
    file: File;
    previewUrl: string | null;
    isImage: boolean;
  } | null>(null);
  const [adminMessageMenu, setAdminMessageMenu] = useState<{
    x: number;
    y: number;
    message: MessageRow;
  } | null>(null);
  const [editMessage, setEditMessage] = useState<{
    id: string;
    text: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const adminDraftInputRef = useRef<HTMLInputElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [showAdminNotifNudge, setShowAdminNotifNudge] = useState(false);
  const prevUnreadCountRef = useRef(0);
  const adminUnreadBaselineDoneRef = useRef(false);
  const adminMessagesScrollRef = useRef<HTMLDivElement | null>(null);
  const adminBootThreadRef = useRef<string | null>(null);
  const adminPrevLastMessageIdRef = useRef<string | null>(null);
  const activeRef = useRef(active);
  const onUnreadRef = useRef(onUnread);
  const selectedIdRef = useRef(selectedId);
  const consumedUrlThreadRef = useRef<string | null>(null);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);
  useEffect(() => {
    onUnreadRef.current = onUnread;
  }, [onUnread]);
  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    if (!active) {
      setShowAdminNotifNudge(false);
      return;
    }
    const tick = () => {
      if (typeof window !== "undefined" && "Notification" in window) {
        setShowAdminNotifNudge(Notification.permission === "default");
      } else {
        setShowAdminNotifNudge(false);
      }
    };
    tick();
    window.addEventListener("sk-permission-change", tick);
    return () => window.removeEventListener("sk-permission-change", tick);
  }, [active]);

  useEffect(() => {
    return () => {
      if (pendingAdminAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAdminAttachment.previewUrl);
      }
    };
  }, [pendingAdminAttachment?.previewUrl]);

  const loadConversations = useCallback(async () => {
    try {
      const r = await chatFetch("/api/chat/admin/conversations");
      const j = await r.json();
      if (j.success && Array.isArray(j.conversations)) {
        setConversations(j.conversations);
      }
    } catch {
      /* ignore */
    } finally {
      setConversationsHydrated(true);
    }
  }, []);

  const refreshAdminUnread = useCallback(async () => {
    try {
      const r = await chatFetch("/api/chat/admin/unread");
      const j = (await r.json()) as {
        success?: boolean;
        unread?: number;
        notifyTitle?: string;
        notifyBody?: string;
        notifyThreadId?: string;
      };
      if (!j.success) return;
      const n = Number(j.unread) || 0;
      const title =
        typeof j.notifyTitle === "string" ? j.notifyTitle : "StichKala admin";
      const body =
        typeof j.notifyBody === "string"
          ? j.notifyBody
          : "New customer message";
      if (!adminUnreadBaselineDoneRef.current) {
        adminUnreadBaselineDoneRef.current = true;
        prevUnreadCountRef.current = n;
        onUnreadRef.current?.(n);
        return;
      }
      if (
        n > prevUnreadCountRef.current &&
        shouldNotifyAdminChat({ chatsTabActive: activeRef.current })
      ) {
        showChatBrowserNotification({
          title,
          body,
          tag: `sk-admin-panel-${n}`,
          openAdminThreadId: j.notifyThreadId,
        });
      }
      prevUnreadCountRef.current = n;
      onUnreadRef.current?.(n);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const fn = () => void refreshAdminUnread();
    window.addEventListener("sk-notification-read-finished", fn);
    return () =>
      window.removeEventListener("sk-notification-read-finished", fn);
  }, [refreshAdminUnread]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      try {
        const r = await chatFetch(
          `/api/chat/admin/threads/${threadId}/messages`
        );
        const j = await r.json();
        if (j.success && Array.isArray(j.messages)) {
          const list = j.messages as MessageRow[];
          setMessages(list);
          if (threadId === selectedIdRef.current) {
            if (shouldMarkChatReadInClient()) {
              await chatFetch(`/api/chat/threads/${threadId}/read`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ asAdmin: true }),
              });
            }
            void loadConversations();
          }
          void refreshAdminUnread();
        }
      } catch {
        /* ignore */
      }
    },
    [refreshAdminUnread, loadConversations]
  );

  useEffect(() => {
    const onChatSent = (ev: Event) => {
      const t = (ev as CustomEvent<{ threadId?: string }>).detail?.threadId;
      void refreshAdminUnread();
      void loadConversations();
      if (t && selectedId === t) void loadMessages(t);
    };
    window.addEventListener("sk-notification-chat-sent", onChatSent);
    return () =>
      window.removeEventListener("sk-notification-chat-sent", onChatSent);
  }, [refreshAdminUnread, loadConversations, loadMessages, selectedId]);

  useEffect(() => {
    if (!active) {
      setSelectedId(null);
      setSelectedClientId(null);
      setProductModalId(null);
    }
  }, [active]);

  useEffect(() => {
    void refreshAdminUnread();
    const u = window.setInterval(() => void refreshAdminUnread(), 6000);
    return () => window.clearInterval(u);
  }, [refreshAdminUnread]);

  useEffect(() => {
    if (!active) return;
    void loadConversations();
    const t = window.setInterval(() => void loadConversations(), 5000);
    return () => window.clearInterval(t);
  }, [active, loadConversations]);

  /** Mobile / browser back closes the full-screen chat instead of leaving the admin site. */
  useEffect(() => {
    const onPop = () => {
      setSelectedId(null);
      setSelectedClientId(null);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!active || !selectedId) return;
    void loadMessages(selectedId);
    const t = window.setInterval(() => void loadMessages(selectedId), 2500);
    return () => window.clearInterval(t);
  }, [active, selectedId, loadMessages]);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) return;
      if (!active || !selectedId) return;
      void loadMessages(selectedId);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [active, selectedId, loadMessages]);

  useEffect(() => {
    setAdminMessageMenu(null);
  }, [selectedId]);

  useEffect(() => {
    if (!adminMessageMenu) return;
    const close = () => setAdminMessageMenu(null);
    const id = window.setTimeout(() => {
      window.addEventListener("click", close);
    }, 0);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("click", close);
    };
  }, [adminMessageMenu]);

  useEffect(() => {
    if (!active || !selectedId) {
      adminBootThreadRef.current = null;
      adminPrevLastMessageIdRef.current = null;
      return;
    }
    const el = adminMessagesScrollRef.current;
    if (!el) return;

    if (adminBootThreadRef.current !== selectedId) {
      if (messages.length === 0) return;
      adminBootThreadRef.current = selectedId;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      adminPrevLastMessageIdRef.current = messages.at(-1)?._id ?? null;
      return;
    }

    const last = messages[messages.length - 1];
    if (!last) return;
    if (last._id === adminPrevLastMessageIdRef.current) return;

    adminPrevLastMessageIdRef.current = last._id;
    if (last.sender === "admin") {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [active, selectedId, messages]);

  const openConversation = useCallback((c: ConversationRow) => {
    if (typeof window !== "undefined" && !selectedId) {
      window.history.pushState(
        { adminChat: true },
        "",
        window.location.href
      );
    }
    adminBootThreadRef.current = null;
    adminPrevLastMessageIdRef.current = null;
    setMessages([]);
    setSelectedId(c.threadId);
    setSelectedClientId(c.clientId);
  }, [selectedId]);

  const threadFromUrl = searchParams.get("thread")?.trim() ?? "";
  const notifReplyFromUrl = searchParams.get("sk_notif_reply") === "1";

  useEffect(() => {
    if (!active) return;
    if (!threadFromUrl) {
      consumedUrlThreadRef.current = null;
      return;
    }
    if (!conversationsHydrated) return;
    if (consumedUrlThreadRef.current === threadFromUrl) return;
    const row = conversations.find((c) => c.threadId === threadFromUrl);
    if (!row) return;
    consumedUrlThreadRef.current = threadFromUrl;
    openConversation(row);
    try {
      const u = new URL(window.location.href);
      u.searchParams.delete("thread");
      if (notifReplyFromUrl) u.searchParams.delete("sk_notif_reply");
      router.replace(u.pathname + u.search, { scroll: false });
    } catch {
      /* ignore */
    }
    if (notifReplyFromUrl) {
      window.setTimeout(() => {
        adminDraftInputRef.current?.focus();
      }, 280);
    }
  }, [
    active,
    threadFromUrl,
    notifReplyFromUrl,
    conversationsHydrated,
    conversations,
    router,
    openConversation,
  ]);

  const closeChatFullScreen = () => {
    const st = window.history.state as { adminChat?: boolean } | null;
    if (typeof window !== "undefined" && st?.adminChat) {
      window.history.back();
      return;
    }
    setSelectedId(null);
    setSelectedClientId(null);
  };

  const openProductFromLink = (url: string) => {
    const pid = extractProductIdFromChatUrl(url);
    if (!pid) {
      alert("Could not read product id from this link.");
      return;
    }
    setProductModalId(pid);
  };

  const sendAdmin = async () => {
    const text = draft.trim();
    if (!text || !selectedId || sending) return;
    setSending(true);
    try {
      const r = await chatFetch(`/api/chat/admin/threads/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (j.success && j.message) {
        setDraft("");
        setMessages((prev) => [...prev, j.message]);
        void loadConversations();
      } else if (r.status === 401) {
        alert("Session expired. Log in to the admin panel again.");
      }
    } finally {
      setSending(false);
    }
  };

  const onPickAdminFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !selectedId) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose a file under 2 MB.");
      return;
    }
    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : null;
    setPendingAdminAttachment({ file, previewUrl, isImage });
  };

  const cancelPendingAdminAttachment = () => {
    setPendingAdminAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  };

  const confirmPendingAdminAttachment = async () => {
    if (!pendingAdminAttachment || !selectedId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingAdminAttachment.file);
      const up = await fetch("/api/chat/upload", {
        method: "POST",
        body: fd,
        cache: "no-store",
      });
      const uj = await up.json();
      if (!uj.success || !uj.url) {
        alert(uj.error || "Upload failed");
        return;
      }
      const r = await chatFetch(`/api/chat/admin/threads/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          attachment: {
            url: uj.url,
            mimeType: String(uj.mimeType ?? ""),
            fileName: String(uj.fileName ?? pendingAdminAttachment.file.name),
          },
        }),
      });
      const j = await r.json();
      if (j.success && j.message) {
        setMessages((prev) => [...prev, j.message]);
        void loadConversations();
        if (pendingAdminAttachment.previewUrl) {
          URL.revokeObjectURL(pendingAdminAttachment.previewUrl);
        }
        setPendingAdminAttachment(null);
      } else if (r.status === 401) {
        alert("Session expired. Log in to the admin panel again.");
      } else {
        alert(j.error || "Could not send file");
      }
    } catch {
      alert("Upload failed. Try again.");
    } finally {
      setSending(false);
    }
  };

  const deleteAdminMessage = async (id: string) => {
    if (!confirm("Delete this message for you and the customer?")) return;
    try {
      const r = await chatFetch(`/api/chat/admin/messages/${id}`, {
        method: "DELETE",
      });
      const j = await r.json();
      if (j.success) {
        setMessages((prev) => prev.filter((x) => x._id !== id));
        setAdminMessageMenu(null);
        void loadConversations();
      } else if (r.status === 401) {
        alert("Session expired. Log in again.");
      } else {
        alert(j.error || "Could not delete");
      }
    } catch {
      alert("Network error");
    }
  };

  const saveEditedAdminMessage = async () => {
    if (!editMessage?.id || !editMessage.text.trim()) return;
    try {
      const r = await chatFetch(`/api/chat/admin/messages/${editMessage.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: editMessage.text.trim() }),
      });
      const j = await r.json();
      if (j.success && j.message) {
        setMessages((prev) =>
          prev.map((x) => (x._id === editMessage.id ? (j.message as MessageRow) : x))
        );
        setEditMessage(null);
        setAdminMessageMenu(null);
      } else if (r.status === 401) {
        alert("Session expired. Log in again.");
      } else {
        alert(j.error || "Could not save");
      }
    } catch {
      alert("Network error");
    }
  };

  const sendOfferForProduct = async (productId: string, rowKey: string) => {
    if (!selectedId) return;
    const amount = Number(String(revisePrices[rowKey] ?? "").trim());
    if (!Number.isFinite(amount) || amount < 1) {
      alert("Enter a valid revised price in rupees.");
      return;
    }
    const prod = products.find((p) => p._id === productId);
    if (
      !confirm(
        `Send Pay link for ${prod?.name ?? "product"} at ₹${amount}?`
      )
    ) {
      return;
    }
    setOfferBusyKey(rowKey);
    try {
      const r = await chatFetch(`/api/chat/admin/threads/${selectedId}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountRupees: amount,
          productId,
          expiresInMinutes: 180,
        }),
      });
      const j = await r.json();
      if (!j.success) {
        alert(j.error || "Could not create offer");
        return;
      }
      setRevisePrices((prev) => {
        const next = { ...prev };
        delete next[rowKey];
        return next;
      });
      if (j.message) setMessages((prev) => [...prev, j.message]);
      void loadConversations();
      void loadMessages(selectedId);
    } finally {
      setOfferBusyKey(null);
    }
  };

  const visitorLabel = (c: ConversationRow) =>
    c.visitorPublicId?.trim() ||
    `Guest ${c.clientId.slice(0, 6)}…`;

  const chatPanel = selectedId ? (
    <div className="flex flex-col flex-1 min-h-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="p-2 border-b border-gray-100 shrink-0 flex items-center justify-between gap-2">
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-rose font-medium px-2 py-1.5 rounded-lg hover:bg-rose/10"
          onClick={() => closeChatFullScreen()}
        >
          <FiArrowLeft />
          All conversations
        </button>
        <ChatNotifToggle />
      </div>

      <div className="p-3 border-b border-gray-100 shrink-0">
        <p className="text-xs text-text-light leading-relaxed">
          Under each <strong className="text-text-dark">product link</strong>,
          enter a <strong className="text-text-dark">revised price</strong> and
          send — the customer sees the product name, list vs revised amount, and
          <strong className="text-text-dark"> Pay now</strong>. Paid orders store
          both prices on the line item.
        </p>
      </div>

      <div
        ref={adminMessagesScrollRef}
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/80 min-h-0"
      >
        {messages.map((m) => {
          const linkPid =
            m.kind === "product_link"
              ? extractProductIdFromChatUrl(m.body)
              : null;
          const linkedProduct = linkPid
            ? products.find((p) => p._id === linkPid)
            : null;
          const busyHere = offerBusyKey === m._id;

          return (
            <div key={m._id} className="space-y-1.5">
              <div
                className={`flex ${m.sender === "admin" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm select-none ${
                    m.sender === "admin"
                      ? "bg-rose text-white rounded-br-md"
                      : "bg-white border border-gray-100 text-text-dark rounded-bl-md"
                  }`}
                  onPointerDown={(e) => {
                    if (m.sender !== "admin") return;
                    longPressTimerRef.current = window.setTimeout(() => {
                      longPressTimerRef.current = null;
                      setAdminMessageMenu({
                        x: e.clientX,
                        y: e.clientY,
                        message: m,
                      });
                    }, 550);
                  }}
                  onPointerUp={() => {
                    if (longPressTimerRef.current != null) {
                      window.clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onPointerLeave={() => {
                    if (longPressTimerRef.current != null) {
                      window.clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onPointerCancel={() => {
                    if (longPressTimerRef.current != null) {
                      window.clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  }}
                  onContextMenu={(e) => {
                    if (m.sender !== "admin") return;
                    e.preventDefault();
                    setAdminMessageMenu({
                      x: e.clientX,
                      y: e.clientY,
                      message: m,
                    });
                  }}
                >
                  {m.kind === "product_link" ? (
                    <div className="space-y-2">
                      {m.productPreview ? (
                        <button
                          type="button"
                          className={`w-full text-left rounded-xl overflow-hidden border transition-colors ${
                            m.sender === "admin"
                              ? "border-white/40 bg-white/10 hover:bg-white/15"
                              : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                          }`}
                          onClick={() => openProductFromLink(m.body)}
                        >
                          <div className="flex gap-2 p-2">
                            {m.productPreview.image ? (
                              <Image
                                src={m.productPreview.image}
                                alt=""
                                width={56}
                                height={56}
                                className="rounded-md object-cover shrink-0"
                              />
                            ) : (
                              <div
                                className={`w-14 h-14 rounded-md shrink-0 ${
                                  m.sender === "admin"
                                    ? "bg-white/20"
                                    : "bg-gray-200"
                                }`}
                              />
                            )}
                            <div className="min-w-0">
                              <p
                                className={`font-medium text-sm truncate ${
                                  m.sender === "admin"
                                    ? "text-white"
                                    : "text-text-dark"
                                }`}
                              >
                                {m.productPreview.name}
                              </p>
                              <p
                                className={`text-xs ${
                                  m.sender === "admin"
                                    ? "text-white/85"
                                    : "text-text-light"
                                }`}
                              >
                                ₹{m.productPreview.basePrice}
                              </p>
                            </div>
                          </div>
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className={
                          m.sender === "admin"
                            ? "underline text-left"
                            : "text-rose underline text-left"
                        }
                        onClick={() => openProductFromLink(m.body)}
                      >
                        View product
                      </button>
                    </div>
                  ) : m.kind === "image" ? (
                    <button
                      type="button"
                      className="block w-full p-0 bg-transparent"
                      onClick={() =>
                        setAttachmentLightbox({
                          url: m.body,
                          fileName: m.fileName,
                          isImage: true,
                        })
                      }
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={m.body}
                        alt=""
                        className="max-w-[220px] max-h-44 rounded-lg object-cover mx-auto"
                      />
                    </button>
                  ) : m.kind === "file" ? (
                    <button
                      type="button"
                      className={
                        m.sender === "admin"
                          ? "text-sm underline text-left text-white"
                          : "text-sm underline text-left text-rose"
                      }
                      onClick={() =>
                        setAttachmentLightbox({
                          url: m.body,
                          fileName: m.fileName,
                          isImage: false,
                        })
                      }
                    >
                      {m.fileName || "File attachment"}
                    </button>
                  ) : m.kind === "track_order" && m.orderNumber ? (
                    <div>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] mt-1.5 opacity-85">
                        Order {m.orderNumber} — customer taps Track Order (same
                        as menu Track with this number filled in).
                      </p>
                    </div>
                  ) : m.kind === "payment_cta" ? (
                    m.offerVoidedAt ? (
                      <div className="space-y-1">
                        {m.offerProductName && (
                          <p className="text-xs font-semibold opacity-70 line-through">
                            {m.offerProductName}
                          </p>
                        )}
                        <p className="text-[11px] opacity-85">
                          Superseded — customer should use the latest pay offer
                          for this product.
                        </p>
                      </div>
                    ) : (
                    <div>
                      {m.offerProductName && (
                        <p className="text-xs font-semibold opacity-95">
                          {m.offerProductName}
                        </p>
                      )}
                      {m.offerListPriceRupees != null &&
                        m.offerRevisedPriceRupees != null && (
                          <p className="text-[11px] opacity-90 mt-0.5">
                            <span className="line-through">
                              ₹{m.offerListPriceRupees}
                            </span>
                            <span className="mx-1">→</span>
                            <span className="font-semibold">
                              ₹{m.offerRevisedPriceRupees}
                            </span>
                          </p>
                        )}
                      <p className="text-xs opacity-90 mt-1">{m.body}</p>
                      <p className="text-[10px] mt-1 opacity-80">
                        Customer taps Pay now in their chat.
                      </p>
                    </div>
                    )
                    ) : (
                    <p className="whitespace-pre-wrap break-words">
                      {m.body}
                      {m.editedAt && m.sender === "admin" ? (
                        <span className="block text-[10px] opacity-70 mt-1">
                          Edited
                        </span>
                      ) : null}
                    </p>
                  )}
                  {m.sender === "admin" && (
                    <div className="flex justify-end mt-1 text-[10px] opacity-80">
                      {m.readAt ? (
                        <CheckCheck className="w-3.5 h-3.5" aria-label="Seen" />
                      ) : (
                        <Check className="w-3.5 h-3.5" aria-label="Sent" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              {m.kind === "product_link" && linkPid && linkedProduct && (
                <div
                  className={`max-w-[90%] rounded-lg border border-amber-200/80 bg-amber-50/50 px-2 py-2 text-xs ${
                    m.sender === "admin" ? "ml-auto" : ""
                  }`}
                >
                  <p className="font-medium text-text-dark mb-1 truncate">
                    {linkedProduct.name}
                  </p>
                  <p className="text-[10px] text-text-light mb-1.5">
                    List ₹{linkedProduct.basePrice} — set negotiated price
                  </p>
                  <div className="flex flex-wrap gap-1.5 items-center">
                    <span className="text-text-light">₹</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      className="border rounded-md px-2 py-1 w-24 text-text-dark bg-white"
                      placeholder={`e.g. ${linkedProduct.basePrice}`}
                      value={revisePrices[m._id] ?? ""}
                      disabled={busyHere}
                      onChange={(e) =>
                        setRevisePrices((prev) => ({
                          ...prev,
                          [m._id]: e.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={busyHere}
                      onClick={() =>
                        void sendOfferForProduct(linkPid, m._id)
                      }
                      className="px-2 py-1 rounded-md bg-rose text-white text-[11px] font-medium disabled:opacity-50"
                    >
                      {busyHere ? "…" : "Send price & Pay link"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="p-2 border-t border-gray-100 flex gap-2 shrink-0 bg-white items-center">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,application/*"
          onChange={(e) => onPickAdminFile(e)}
        />
        <button
          type="button"
          disabled={sending || !selectedId}
          className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center text-text-dark hover:bg-gray-50 disabled:opacity-40 shrink-0"
          aria-label="Attach image or file (max 2 MB)"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="w-5 h-5" />
        </button>
        <input
          ref={adminDraftInputRef}
          className="flex-1 min-w-0 border rounded-full px-3 py-2 text-sm"
          placeholder="Reply…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void sendAdmin();
            }
          }}
        />
        <button
          type="button"
          disabled={sending || !draft.trim()}
          className="w-10 h-10 rounded-full bg-rose text-white flex items-center justify-center disabled:opacity-40"
          aria-label="Send"
          onClick={() => void sendAdmin()}
        >
          {sending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  ) : null;

  return (
    <div className="relative min-h-[50vh]">
      <ChatAttachmentLightbox
        open={Boolean(attachmentLightbox)}
        url={attachmentLightbox?.url ?? ""}
        fileName={attachmentLightbox?.fileName}
        isImage={attachmentLightbox?.isImage ?? false}
        onClose={() => setAttachmentLightbox(null)}
      />

      {showAdminNotifNudge ? (
        <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-950 flex flex-wrap items-center gap-2 justify-between gap-y-2">
          <p className="min-w-0 flex-1 leading-snug">
            Turn on <strong>browser notifications</strong> for new visitor
            messages when this tab is in the background.
          </p>
          <div className="flex flex-wrap items-center gap-2 shrink-0 justify-end">
            <ChatNotifToggle />
            <button
              type="button"
              className="shrink-0 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-700"
            onClick={() => {
              void Notification.requestPermission().then((p) => {
                if (p === "granted") void ensureChatNotifyServiceWorker();
                window.dispatchEvent(new Event("sk-permission-change"));
              });
            }}
            >
              Allow alerts
            </button>
          </div>
        </div>
      ) : null}

      {pendingAdminAttachment ? (
        <div
          className="fixed inset-0 z-[240] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
          aria-label="Confirm attachment"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4">
            <h3 className="font-serif text-lg text-text-dark">
              Send this attachment?
            </h3>
            <p className="text-xs text-text-light">
              Max 2 MB. The customer will see it in this chat.
            </p>
            <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 flex flex-col items-center gap-2 min-h-[120px] justify-center">
              {pendingAdminAttachment.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pendingAdminAttachment.previewUrl}
                  alt=""
                  className="max-h-40 rounded-lg object-contain"
                />
              ) : (
                <FileText className="w-12 h-12 text-text-light" aria-hidden />
              )}
              <p className="text-sm font-medium text-text-dark truncate w-full text-center">
                {pendingAdminAttachment.file.name}
              </p>
              <p className="text-[11px] text-text-light">
                {(pendingAdminAttachment.file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                className="px-4 py-2 rounded-full text-sm text-text-light hover:bg-gray-100"
                onClick={() => cancelPendingAdminAttachment()}
                disabled={sending}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-4 py-2 rounded-full text-sm bg-rose text-white hover:bg-rose-dark disabled:opacity-50 inline-flex items-center gap-2"
                disabled={sending}
                onClick={() => void confirmPendingAdminAttachment()}
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Send
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {adminMessageMenu ? (
        <div
          className="fixed z-[250] rounded-xl border border-gray-200 bg-white shadow-xl py-1 min-w-[140px]"
          style={{
            left: Math.min(
              adminMessageMenu.x,
              typeof window !== "undefined" ? window.innerWidth - 160 : 0
            ),
            top: Math.min(
              adminMessageMenu.y,
              typeof window !== "undefined" ? window.innerHeight - 120 : 0
            ),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {adminMessageMenu.message.kind === "text" ? (
            <button
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
              onClick={() => {
                setEditMessage({
                  id: adminMessageMenu.message._id,
                  text: adminMessageMenu.message.body,
                });
                setAdminMessageMenu(null);
              }}
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          ) : null}
          <button
            type="button"
            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
            onClick={() => void deleteAdminMessage(adminMessageMenu.message._id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      ) : null}

      {editMessage ? (
        <div
          className="fixed inset-0 z-[260] flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal
          aria-label="Edit message"
        >
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-4 space-y-3">
            <p className="font-medium text-text-dark text-sm">Edit message</p>
            <textarea
              className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
              value={editMessage.text}
              onChange={(e) =>
                setEditMessage((prev) =>
                  prev ? { ...prev, text: e.target.value } : prev
                )
              }
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="px-3 py-1.5 text-sm text-text-light"
                onClick={() => setEditMessage(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="px-3 py-1.5 text-sm rounded-lg bg-rose text-white"
                onClick={() => void saveEditedAdminMessage()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <ChatProductDetailModal
        open={Boolean(productModalId)}
        productId={productModalId}
        threadId={selectedId}
        clientId={selectedClientId}
        onClose={() => setProductModalId(null)}
      />

      {!selectedId ? (
        <div className="max-w-xl mx-auto">
          <div className="flex flex-col bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm max-h-[70vh]">
            <div className="p-3 border-b border-gray-100 font-medium text-text-dark text-sm shrink-0 flex items-center justify-between gap-2">
              <span>Visitors ({conversations.length})</span>
              <ChatNotifToggle />
            </div>
            <div className="flex-1 overflow-y-auto divide-y min-h-0">
              {!conversationsHydrated && conversations.length === 0 ? (
                <div
                  className="p-10 flex justify-center text-text-light"
                  aria-busy
                  aria-label="Loading conversations"
                >
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : null}
              {conversations.map((c) => {
                const unread = c.unreadUserMessages ?? 0;
                const hasUnread = unread > 0;
                return (
                <button
                  key={c.threadId}
                  type="button"
                  onClick={() => openConversation(c)}
                  className={`w-full text-left px-3 py-2.5 text-sm transition-colors border-l-4 ${
                    hasUnread
                      ? "bg-rose/10 hover:bg-rose/[0.14] border-rose"
                      : "hover:bg-gray-50 border-transparent"
                  }`}
                >
                  <div className="flex justify-between gap-2 items-start">
                    <span className="font-medium text-text-dark truncate">
                      {c.subject}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasUnread && (
                        <span
                          className="min-w-[1.25rem] h-5 px-1.5 rounded-full bg-rose text-white text-[10px] font-bold flex items-center justify-center"
                          title="Unread from customer"
                        >
                          {unread > 99 ? "99+" : unread}
                        </span>
                      )}
                      {c.productEnquiryCount > 0 && (
                        <span className="text-[10px] font-semibold bg-rose/15 text-rose px-2 py-0.5 rounded-full">
                          {c.productEnquiryCount} product
                          {c.productEnquiryCount === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                  {c.lastMessagePreview ? (
                    <div className="text-[11px] text-text-light line-clamp-2 mt-1 pr-1">
                      {c.lastMessagePreview}
                    </div>
                  ) : null}
                  <div className="flex justify-between gap-2 items-center mt-1">
                    <span className="text-[11px] text-rose font-medium truncate min-w-0">
                      {visitorLabel(c)}
                    </span>
                    <span className="text-[10px] text-text-light shrink-0">
                      {new Date(c.lastMessageAt).toLocaleString("en-IN", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </span>
                  </div>
                </button>
                );
              })}
              {conversationsHydrated && conversations.length === 0 ? (
                <p className="p-4 text-sm text-text-light">No chats yet.</p>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="fixed inset-0 z-[200] flex flex-col bg-cream p-3 sm:p-4">
          <div className="flex-1 flex flex-col min-h-0 max-w-3xl mx-auto w-full">
            {chatPanel}
          </div>
        </div>
      )}
    </div>
  );
}
