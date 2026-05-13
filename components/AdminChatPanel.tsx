"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Send, Loader2, Check, CheckCheck } from "lucide-react";
import { FiArrowLeft } from "react-icons/fi";
import { extractProductIdFromChatUrl } from "@/lib/chatProductUrl";
import ChatProductDetailModal from "@/components/ChatProductDetailModal";

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
  offerProductName?: string;
  offerListPriceRupees?: number;
  offerRevisedPriceRupees?: number;
  readAt: string | null;
  createdAt: string | null;
};

function pushBrowserNotification(title: string, body: string) {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }
  try {
    new Notification(title, { body, tag: "stichkala-admin-chat" });
  } catch {
    /* ignore */
  }
}

export default function AdminChatPanel({
  products,
  active,
  onUnread,
}: {
  products: ProductMini[];
  active: boolean;
  onUnread?: (n: number) => void;
}) {
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [revisePrices, setRevisePrices] = useState<Record<string, string>>({});
  const [offerBusyKey, setOfferBusyKey] = useState<string | null>(null);
  const [productModalId, setProductModalId] = useState<string | null>(null);
  const prevUnreadCountRef = useRef(0);
  const adminMessagesScrollRef = useRef<HTMLDivElement | null>(null);
  const adminBootThreadRef = useRef<string | null>(null);
  const adminPrevLastMessageIdRef = useRef<string | null>(null);

  const loadConversations = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/admin/conversations");
      const j = await r.json();
      if (j.success && Array.isArray(j.conversations)) {
        setConversations(j.conversations);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const refreshAdminUnread = useCallback(async () => {
    try {
      const r = await fetch("/api/chat/admin/unread");
      const j = await r.json();
      if (j.success) {
        const n = Number(j.unread) || 0;
        if (
          n > prevUnreadCountRef.current &&
          prevUnreadCountRef.current > 0 &&
          !active
        ) {
          pushBrowserNotification(
            "StichKala admin",
            "New customer chat message"
          );
        }
        prevUnreadCountRef.current = n;
        onUnread?.(n);
      }
    } catch {
      /* ignore */
    }
  }, [onUnread, active]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      try {
        const r = await fetch(`/api/chat/admin/threads/${threadId}/messages`);
        const j = await r.json();
        if (j.success && Array.isArray(j.messages)) {
          const list = j.messages as MessageRow[];
          setMessages(list);
          if (threadId === selectedId) {
            await fetch(`/api/chat/threads/${threadId}/read`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ asAdmin: true }),
            });
            void loadConversations();
          }
          void refreshAdminUnread();
        }
      } catch {
        /* ignore */
      }
    },
    [refreshAdminUnread, selectedId, loadConversations]
  );

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
    const t = window.setInterval(() => void loadConversations(), 6000);
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

  const openConversation = (c: ConversationRow) => {
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
  };

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
      const r = await fetch(`/api/chat/admin/threads/${selectedId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const j = await r.json();
      if (j.success && j.message) {
        setDraft("");
        setMessages((prev) => [...prev, j.message]);
        void loadConversations();
      }
    } finally {
      setSending(false);
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
      const r = await fetch(`/api/chat/admin/threads/${selectedId}/offer`, {
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
    } finally {
      setOfferBusyKey(null);
    }
  };

  const visitorLabel = (c: ConversationRow) =>
    c.visitorPublicId?.trim() ||
    `Guest ${c.clientId.slice(0, 6)}…`;

  const chatPanel = selectedId ? (
    <div className="flex flex-col flex-1 min-h-0 bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      <div className="p-2 border-b border-gray-100 shrink-0">
        <button
          type="button"
          className="flex items-center gap-1 text-sm text-rose font-medium px-2 py-1.5 rounded-lg hover:bg-rose/10"
          onClick={() => closeChatFullScreen()}
        >
          <FiArrowLeft />
          All conversations
        </button>
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
                  className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                    m.sender === "admin"
                      ? "bg-rose text-white rounded-br-md"
                      : "bg-white border border-gray-100 text-text-dark rounded-bl-md"
                  }`}
                >
                  {m.kind === "product_link" ? (
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
                  ) : m.kind === "track_order" && m.orderNumber ? (
                    <div>
                      <p className="whitespace-pre-wrap break-words">{m.body}</p>
                      <p className="text-[10px] mt-1.5 opacity-85">
                        Order {m.orderNumber} — customer taps Track Order (same
                        as menu Track with this number filled in).
                      </p>
                    </div>
                  ) : m.kind === "payment_cta" ? (
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
                  ) : (
                    <p className="whitespace-pre-wrap break-words">{m.body}</p>
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

      <div className="p-2 border-t border-gray-100 flex gap-2 shrink-0 bg-white">
        <input
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
            <div className="p-3 border-b border-gray-100 font-medium text-text-dark text-sm shrink-0">
              Visitors ({conversations.length})
            </div>
            <div className="flex-1 overflow-y-auto divide-y min-h-0">
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
              {conversations.length === 0 && (
                <p className="p-4 text-sm text-text-light">No chats yet.</p>
              )}
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
