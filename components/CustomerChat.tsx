"use client";

import { useRouter } from "next/navigation";
import Image from "next/image";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Send,
  Loader2,
  Check,
  CheckCheck,
  Paperclip,
  FileText,
} from "lucide-react";
import { getChatClientId } from "@/lib/chatClientId";
import { extractProductIdFromChatUrl } from "@/lib/chatProductUrl";
import ChatProductDetailModal from "@/components/ChatProductDetailModal";
import CustomizationModal from "@/components/CustomizationModal";
import { chatFetch } from "@/lib/chatFetch";
import ChatAttachmentLightbox from "@/components/ChatAttachmentLightbox";
import {
  formatChatMessageNotificationBody,
  shouldNotifyVisitorChat,
  showBrowserChatNotification,
} from "@/lib/chatPushNotification";

export type ChatProductRef = { _id: string; name: string };

type CheckoutProduct = {
  _id: string;
  name: string;
  category: string;
  description: string;
  basePrice: number;
  images: string[];
  customizable: boolean;
  options: {
    sizes: string[];
    sizeUnit?: "inch" | "cm" | "m";
    materials: string[];
  };
};

function mapApiProduct(raw: Record<string, unknown>): CheckoutProduct {
  const opts = (raw.options as Record<string, unknown>) || {};
  const sizes = Array.isArray(opts.sizes) ? (opts.sizes as string[]) : [];
  const materials = Array.isArray(opts.materials)
    ? (opts.materials as string[])
    : [];
  return {
    _id: String(raw._id),
    name: String(raw.name ?? ""),
    category: String(raw.category ?? "embroidery"),
    description: String(raw.description ?? ""),
    basePrice: Number(raw.basePrice) || 0,
    images: Array.isArray(raw.images) ? (raw.images as string[]) : [],
    customizable: Boolean(raw.customizable),
    options: {
      sizes: sizes.length ? sizes : [""],
      sizeUnit: opts.sizeUnit as "inch" | "cm" | "m" | undefined,
      materials: materials.length ? materials : ["Cotton thread"],
    },
  };
}

export type ChatMessageRow = {
  _id: string;
  sender: "user" | "admin";
  kind:
    | "text"
    | "product_link"
    | "payment_cta"
    | "track_order"
    | "image"
    | "file";
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

type ThreadRow = {
  _id: string;
  visitorPublicId?: string;
  productId: string | null;
  productName?: string;
  lastMessageAt: string;
};

type CustomerChatContextValue = {
  clientId: string;
  ready: boolean;
  openGeneralChat: () => Promise<void>;
  openChatPanel: () => Promise<void>;
  offerProductChat: (product: ChatProductRef) => void;
  /** POST product link to chat and open the panel (no confirmation modal). */
  sendProductLinkInChatSilent: (product: ChatProductRef) => Promise<boolean>;
  unreadTotal: number;
};

const CustomerChatContext = createContext<CustomerChatContextValue | null>(
  null
);

export function useCustomerChat() {
  return useContext(CustomerChatContext);
}

export function CustomerChatProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  useEffect(() => {
    setClientId(getChatClientId());
  }, []);

  const [panelOpen, setPanelOpen] = useState(false);
  const [threads, setThreads] = useState<ThreadRow[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [confirmProduct, setConfirmProduct] = useState<ChatProductRef | null>(
    null
  );
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [productModalId, setProductModalId] = useState<string | null>(null);
  const [productModalHidePay, setProductModalHidePay] = useState(false);
  const [negotiatedPaySource, setNegotiatedPaySource] =
    useState<ChatMessageRow | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<CheckoutProduct | null>(
    null
  );
  const [negotiatedCheckoutOpts, setNegotiatedCheckoutOpts] = useState<{
    payToken: string;
    threadId: string;
    clientId: string;
    revisedUnitPriceRupees: number;
    listPriceRupees?: number;
  } | null>(null);
  const [attachmentLightbox, setAttachmentLightbox] = useState<{
    url: string;
    fileName?: string | null;
    isImage: boolean;
  } | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<{
    file: File;
    previewUrl: string | null;
    isImage: boolean;
  } | null>(null);
  const [notifPerm, setNotifPerm] = useState<
    NotificationPermission | "unsupported"
  >("unsupported");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const lastSeenLatestRef = useRef<string | null>(null);
  const prevUnreadRef = useRef(0);
  const visitorUnreadBaselineDoneRef = useRef(false);
  const unreadPollMetaRef = useRef<{ title: string; body: string } | null>(
    null
  );
  const messagesScrollRef = useRef<HTMLDivElement | null>(null);
  const lastThreadForScrollRef = useRef<string | null>(null);
  const customerPrevLastMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    visitorUnreadBaselineDoneRef.current = false;
    prevUnreadRef.current = 0;
    unreadPollMetaRef.current = null;
  }, [clientId]);

  useEffect(() => {
    if (!panelOpen) return;
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPerm("unsupported");
      return;
    }
    setNotifPerm(Notification.permission);
  }, [panelOpen]);

  useEffect(() => {
    return () => {
      if (pendingAttachment?.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
    };
  }, [pendingAttachment?.previewUrl]);

  const refreshUnread = useCallback(async () => {
    if (!clientId) return;
    try {
      const r = await chatFetch(
        `/api/chat/unread?clientId=${encodeURIComponent(clientId)}`
      );
      const j = (await r.json()) as {
        success?: boolean;
        unread?: number;
        notifyTitle?: string;
        notifyBody?: string;
      };
      if (!j.success) return;
      const n = Number(j.unread) || 0;
      if (typeof j.notifyTitle === "string" && typeof j.notifyBody === "string") {
        unreadPollMetaRef.current = { title: j.notifyTitle, body: j.notifyBody };
      } else {
        unreadPollMetaRef.current = null;
      }
      if (!visitorUnreadBaselineDoneRef.current) {
        visitorUnreadBaselineDoneRef.current = true;
        prevUnreadRef.current = n;
        setUnreadTotal(n);
        return;
      }
      setUnreadTotal(n);
    } catch {
      /* ignore */
    }
  }, [clientId]);

  const loadThreads = useCallback(async () => {
    if (!clientId) return [];
    try {
      const r = await chatFetch(
        `/api/chat/threads?clientId=${encodeURIComponent(clientId)}`
      );
      const j = await r.json();
      if (j.success && Array.isArray(j.threads)) {
        setThreads(j.threads);
        return j.threads as ThreadRow[];
      }
    } catch {
      /* ignore */
    }
    return [];
  }, [clientId]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!clientId || !threadId) return;
      setLoadingMessages(true);
      try {
        const r = await chatFetch(
          `/api/chat/threads/${threadId}/messages?clientId=${encodeURIComponent(clientId)}`
        );
        const j = await r.json();
        if (j.success && Array.isArray(j.messages)) {
          setMessages(j.messages);
          await chatFetch(`/api/chat/threads/${threadId}/read`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ clientId }),
          });
          void refreshUnread();
        }
      } finally {
        setLoadingMessages(false);
      }
    },
    [clientId, refreshUnread]
  );

  useEffect(() => {
    void refreshUnread();
    const t = window.setInterval(() => void refreshUnread(), 6000);
    return () => window.clearInterval(t);
  }, [refreshUnread]);

  useEffect(() => {
    if (!visitorUnreadBaselineDoneRef.current) return;
    if (
      unreadTotal > prevUnreadRef.current &&
      unreadTotal > 0 &&
      shouldNotifyVisitorChat({ panelOpen })
    ) {
      const meta = unreadPollMetaRef.current;
      showBrowserChatNotification({
        title: meta?.title ?? "StichKala",
        body: meta?.body ?? "New message from the shop.",
        tag: `sk-visitor-unread-${unreadTotal}`,
      });
    }
    prevUnreadRef.current = unreadTotal;
  }, [unreadTotal, panelOpen]);

  useEffect(() => {
    if (!panelOpen || !activeThreadId || !clientId) return;
    void loadMessages(activeThreadId);
    const iv = window.setInterval(() => {
      void loadMessages(activeThreadId);
    }, 2500);
    return () => window.clearInterval(iv);
  }, [panelOpen, activeThreadId, clientId, loadMessages]);

  useEffect(() => {
    if (!panelOpen || !clientId) return;
    void loadThreads();
    const iv = window.setInterval(() => void loadThreads(), 10000);
    return () => window.clearInterval(iv);
  }, [panelOpen, clientId, loadThreads]);

  useEffect(() => {
    if (!panelOpen || !activeThreadId || !clientId) return;
    const last = messages[messages.length - 1];
    if (!last || last.sender !== "admin") return;
    const key = `${last._id}:${last.createdAt}`;
    if (lastSeenLatestRef.current === key) return;
    lastSeenLatestRef.current = key;
    if (!shouldNotifyVisitorChat({ panelOpen })) return;
    const chatName =
      threads.find((t) => t._id === activeThreadId)?.productName ?? "Chat";
    showBrowserChatNotification({
      title: `StichKala · ${chatName}`,
      body: formatChatMessageNotificationBody(last),
      tag: `sk-visitor-msg-${last._id}`,
    });
  }, [messages, panelOpen, activeThreadId, clientId, threads]);

  /** Snap to bottom when opening / switching thread; only auto-scroll again when the visitor sends. */
  useEffect(() => {
    if (!panelOpen || !activeThreadId) {
      lastThreadForScrollRef.current = null;
      customerPrevLastMessageIdRef.current = null;
      return;
    }
    const el = messagesScrollRef.current;
    if (!el) return;

    if (lastThreadForScrollRef.current !== activeThreadId) {
      if (loadingMessages) return;
      lastThreadForScrollRef.current = activeThreadId;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
      customerPrevLastMessageIdRef.current =
        messages[messages.length - 1]?._id ?? null;
      return;
    }

    if (loadingMessages) return;

    const last = messages[messages.length - 1];
    if (!last) return;
    if (last._id === customerPrevLastMessageIdRef.current) return;

    customerPrevLastMessageIdRef.current = last._id;
    if (last.sender === "user") {
      requestAnimationFrame(() => {
        el.scrollTo({
          top: el.scrollHeight,
          behavior: "smooth",
        });
      });
    }
  }, [panelOpen, activeThreadId, messages, loadingMessages]);

  const openPanelWithThread = useCallback(
    async (threadId: string) => {
      setActiveThreadId(threadId);
      setPanelOpen(true);
      await loadMessages(threadId);
    },
    [loadMessages]
  );

  const openGeneralChat = useCallback(async () => {
    if (!clientId) return;
    const r = await chatFetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId }),
    });
    const j = await r.json();
    if (j.success && j.thread?._id) {
      await loadThreads();
      await openPanelWithThread(j.thread._id);
    }
  }, [clientId, loadThreads, openPanelWithThread]);

  const openChatPanel = useCallback(async () => {
    if (!clientId) return;
    /** POST runs server welcome for brand-new threads; GET alone only resolves the thread. */
    try {
      await chatFetch("/api/chat/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId }),
      });
    } catch {
      /* non-fatal */
    }
    const list = await loadThreads();
    if (list.length === 0) {
      await openGeneralChat();
      return;
    }
    setPanelOpen(true);
    if (!activeThreadId && list[0]) {
      setActiveThreadId(list[0]._id);
      await loadMessages(list[0]._id);
    } else if (activeThreadId) {
      await loadMessages(activeThreadId);
    }
  }, [clientId, loadThreads, openGeneralChat, activeThreadId, loadMessages]);

  const offerProductChat = useCallback((product: ChatProductRef) => {
    setConfirmProduct(product);
  }, []);

  const confirmSendProductLink = useCallback(async () => {
    if (!clientId || !confirmProduct) return;
    const r = await chatFetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clientId,
        productId: confirmProduct._id,
        productName: confirmProduct.name,
        sendProductLink: true,
      }),
    });
    const j = await r.json();
    setConfirmProduct(null);
    if (j.success && j.thread?._id) {
      await loadThreads();
      await openPanelWithThread(j.thread._id);
    }
  }, [clientId, confirmProduct, loadThreads, openPanelWithThread]);

  const sendProductLinkInChatSilent = useCallback(
    async (product: ChatProductRef) => {
      if (!clientId) return false;
      try {
        const r = await chatFetch("/api/chat/threads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId,
            productId: product._id,
            productName: product.name,
            sendProductLink: true,
          }),
        });
        const j = await r.json();
        if (!j.success || !j.thread?._id) return false;
        await loadThreads();
        setActiveThreadId(j.thread._id);
        setPanelOpen(true);
        await loadMessages(j.thread._id);
        void refreshUnread();
        return true;
      } catch {
        return false;
      }
    },
    [clientId, loadThreads, loadMessages, refreshUnread]
  );

  const sendText = useCallback(async () => {
    const text = draft.trim();
    if (!text || !activeThreadId || !clientId || sending) return;
    setSending(true);
    try {
      const r = await chatFetch(`/api/chat/threads/${activeThreadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, text }),
      });
      const j = await r.json();
      if (j.success && j.message) {
        setDraft("");
        setMessages((prev) => [...prev, j.message]);
      } else {
        console.error("Chat send failed", r.status, j);
      }
    } finally {
      setSending(false);
    }
  }, [draft, activeThreadId, clientId, sending]);

  const sendAttachmentMessage = useCallback(
    async (payload: {
      url: string;
      mimeType: string;
      fileName: string;
    }) => {
      if (!activeThreadId || !clientId || sending) return;
      setSending(true);
      try {
        const r = await chatFetch(`/api/chat/threads/${activeThreadId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ clientId, attachment: payload }),
        });
        const j = await r.json();
        if (j.success && j.message) {
          setMessages((prev) => [...prev, j.message]);
        } else {
          alert(j.error || "Could not send file");
        }
      } finally {
        setSending(false);
      }
    },
    [activeThreadId, clientId, sending]
  );

  const onPickChatFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = "";
      if (!file || !clientId) return;
      if (file.size > 2 * 1024 * 1024) {
        alert("Please choose a file under 2 MB.");
        return;
      }
      const isImage = file.type.startsWith("image/");
      const previewUrl = isImage ? URL.createObjectURL(file) : null;
      setPendingAttachment({ file, previewUrl, isImage });
    },
    [clientId]
  );

  const cancelPendingAttachment = useCallback(() => {
    setPendingAttachment((prev) => {
      if (prev?.previewUrl) URL.revokeObjectURL(prev.previewUrl);
      return null;
    });
  }, []);

  const confirmPendingAttachment = useCallback(async () => {
    if (!pendingAttachment || !activeThreadId || !clientId) return;
    setSending(true);
    try {
      const fd = new FormData();
      fd.append("file", pendingAttachment.file);
      fd.append("clientId", clientId);
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
      await sendAttachmentMessage({
        url: uj.url,
        mimeType: String(uj.mimeType ?? ""),
        fileName: String(uj.fileName ?? pendingAttachment.file.name),
      });
      if (pendingAttachment.previewUrl) {
        URL.revokeObjectURL(pendingAttachment.previewUrl);
      }
      setPendingAttachment(null);
    } catch {
      alert("Upload failed. Try again.");
    } finally {
      setSending(false);
    }
  }, [pendingAttachment, activeThreadId, clientId, sendAttachmentMessage]);

  const startNegotiatedCheckout = useCallback(
    async (m: ChatMessageRow) => {
      if (m.offerVoidedAt) {
        alert(
          "This price link was replaced by a newer offer. Scroll to the latest offer in the chat."
        );
        return;
      }
      if (!clientId || !activeThreadId) return;
      const pid = m.offerProductId;
      const rev = m.offerRevisedPriceRupees;
      const list = m.offerListPriceRupees;
      const tok = m.payToken;
      if (!pid || !tok || rev == null || !Number.isFinite(rev)) {
        alert(
          "This price link is outdated. Ask the shop for a new offer in chat."
        );
        return;
      }
      try {
        const r = await fetch(
          `/api/products/${encodeURIComponent(pid)}?threadId=${encodeURIComponent(activeThreadId)}&clientId=${encodeURIComponent(clientId)}`
        );
        const j = await r.json();
        if (!j.success || !j.product) {
          alert("Could not load product. Try again.");
          return;
        }
        setNegotiatedCheckoutOpts({
          payToken: tok,
          threadId: activeThreadId,
          clientId,
          revisedUnitPriceRupees: rev,
          listPriceRupees: list ?? undefined,
        });
        setCheckoutProduct(mapApiProduct(j.product as Record<string, unknown>));
        setPanelOpen(false);
        setProductModalId(null);
        setNegotiatedPaySource(null);
      } catch {
        alert("Network error. Try again.");
      }
    },
    [clientId, activeThreadId]
  );

  const ctx = useMemo<CustomerChatContextValue>(
    () => ({
      clientId,
      ready: Boolean(clientId),
      openGeneralChat,
      openChatPanel,
      offerProductChat,
      sendProductLinkInChatSilent,
      unreadTotal,
    }),
    [
      clientId,
      openGeneralChat,
      openChatPanel,
      offerProductChat,
      sendProductLinkInChatSilent,
      unreadTotal,
    ]
  );

  const visitorHandle = useMemo(() => {
    const t =
      threads.find((x) => x._id === activeThreadId) || threads[0];
    return t?.visitorPublicId?.trim() || null;
  }, [threads, activeThreadId]);

  const singleThreadLayout = threads.length <= 1;

  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [panelOpen]);

  const openProductFromChatUrl = (url: string, hidePay: boolean) => {
    const pid = extractProductIdFromChatUrl(url);
    if (!pid) return;
    setNegotiatedPaySource(null);
    setProductModalHidePay(hidePay);
    setProductModalId(pid);
  };

  const openPaymentProductView = (m: ChatMessageRow) => {
    if (!m.offerProductId) return;
    setNegotiatedPaySource(m.offerVoidedAt ? null : m);
    setProductModalHidePay(Boolean(m.offerVoidedAt));
    setProductModalId(m.offerProductId);
  };

  const enableNotifications = async () => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      alert("Notifications are not supported in this browser.");
      return;
    }
    const permission = await Notification.requestPermission();
    setNotifPerm(permission);
    if (permission === "granted") {
      alert(
        "Notifications enabled — you'll get alerts for new messages when this tab is in the background."
      );
    } else {
      alert(
        "Notifications were denied. You can allow them later in your browser settings for this site."
      );
    }
  };

  return (
    <CustomerChatContext.Provider value={ctx}>
      {children}

      <ChatProductDetailModal
        open={Boolean(productModalId)}
        productId={productModalId}
        threadId={activeThreadId}
        clientId={clientId || null}
        hidePayCta={productModalHidePay}
        onNegotiatedUpiPay={
          !productModalHidePay &&
          negotiatedPaySource &&
          negotiatedPaySource.offerProductId === productModalId
            ? () => {
                void startNegotiatedCheckout(negotiatedPaySource);
              }
            : undefined
        }
        onClose={() => {
          setProductModalId(null);
          setProductModalHidePay(false);
          setNegotiatedPaySource(null);
        }}
      />

      {checkoutProduct && negotiatedCheckoutOpts && (
        <CustomizationModal
          product={checkoutProduct}
          negotiatedCheckout={negotiatedCheckoutOpts}
          onClose={() => {
            setCheckoutProduct(null);
            setNegotiatedCheckoutOpts(null);
          }}
        />
      )}

      <AnimatePresence>
        {confirmProduct && (
          <motion.div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4"
            >
              <h3 className="font-serif text-lg text-text-dark">
                Send product link?
              </h3>
              <p className="text-sm text-text-light">
                We&apos;ll share the link to{" "}
                <span className="font-medium text-text-dark">
                  {confirmProduct.name}
                </span>{" "}
                with the admin first so they know which product you mean.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-sm text-text-light hover:bg-gray-100"
                  onClick={() => setConfirmProduct(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-sm bg-rose text-white hover:bg-rose-dark"
                  onClick={() => void confirmSendProductLink()}
                >
                  Send link
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pendingAttachment && (
          <motion.div
            className="fixed inset-0 z-[130] flex items-center justify-center bg-black/50 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-5 space-y-4"
            >
              <h3 className="font-serif text-lg text-text-dark">
                Send this attachment?
              </h3>
              <p className="text-xs text-text-light">
                Max 2 MB. It will appear in the chat for you and the shop.
              </p>
              <div className="rounded-xl border border-gray-100 bg-gray-50/80 p-3 flex flex-col items-center gap-2 min-h-[120px] justify-center">
                {pendingAttachment.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={pendingAttachment.previewUrl}
                    alt=""
                    className="max-h-40 rounded-lg object-contain"
                  />
                ) : (
                  <FileText className="w-12 h-12 text-text-light" aria-hidden />
                )}
                <p className="text-sm font-medium text-text-dark truncate w-full text-center">
                  {pendingAttachment.file.name}
                </p>
                <p className="text-[11px] text-text-light">
                  {(pendingAttachment.file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-sm text-text-light hover:bg-gray-100"
                  onClick={() => cancelPendingAttachment()}
                  disabled={sending}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-4 py-2 rounded-full text-sm bg-rose text-white hover:bg-rose-dark disabled:opacity-50 inline-flex items-center gap-2"
                  disabled={sending}
                  onClick={() => void confirmPendingAttachment()}
                >
                  {sending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : null}
                  Send
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ChatAttachmentLightbox
        open={Boolean(attachmentLightbox)}
        url={attachmentLightbox?.url ?? ""}
        fileName={attachmentLightbox?.fileName}
        isImage={attachmentLightbox?.isImage ?? false}
        onClose={() => setAttachmentLightbox(null)}
      />

      {clientId && (
        <>
          <AnimatePresence>
            {panelOpen && (
              <motion.div
                className={`fixed inset-0 z-[100] flex bg-cream pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] ${
                  singleThreadLayout
                    ? "flex-col"
                    : "flex-col sm:flex-row"
                }`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {!singleThreadLayout && (
                  <aside className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-gray-200 bg-white flex flex-col max-h-[42vh] sm:max-h-none shrink-0 sm:min-h-0">
                    <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] border-b border-gray-100 space-y-1 shrink-0">
                      <p className="text-sm font-semibold text-text-dark">
                        Your conversations
                      </p>
                      {visitorHandle ? (
                        <p className="text-[11px] text-rose font-mono font-medium">
                          Your ID: {visitorHandle}
                        </p>
                      ) : (
                        <p className="text-[10px] text-text-light">
                          Loading visitor id…
                        </p>
                      )}
                      <p className="text-[10px] text-text-light leading-snug">
                        Chats are stored on our server. Use this site on the same
                        device/browser to continue. Closing the tab does not
                        delete your history.
                      </p>
                    </div>
                    <div className="flex-1 overflow-y-auto divide-y min-h-0">
                      {threads.map((t) => (
                        <button
                          key={t._id}
                          type="button"
                          onClick={() => void openPanelWithThread(t._id)}
                          className={`w-full text-left px-3 py-2.5 text-sm hover:bg-gray-50 ${
                            activeThreadId === t._id ? "bg-rose/10" : ""
                          }`}
                        >
                          <div className="font-medium text-text-dark truncate">
                            {t.productName || "General chat"}
                          </div>
                          <div className="text-[10px] text-text-light">
                            {new Date(t.lastMessageAt).toLocaleString("en-IN")}
                          </div>
                        </button>
                      ))}
                      {threads.length === 0 && (
                        <p className="p-3 text-xs text-text-light">
                          No threads yet — send a message to start.
                        </p>
                      )}
                    </div>
                  </aside>
                )}

                <section className="flex-1 flex flex-col min-h-0 min-w-0 bg-white sm:m-3 sm:rounded-2xl sm:shadow-xl sm:border border-gray-100 overflow-hidden">
                  <div className="flex items-center gap-2.5 px-3 pt-[max(1.125rem,env(safe-area-inset-top))] pb-4 border-b border-gray-100 bg-gradient-soft shrink-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-dark truncate">
                        StichKala
                      </p>
                      <p className="text-[11px] text-text-light truncate">
                        {singleThreadLayout ? (
                          <>
                            {visitorHandle ? (
                              <span className="text-rose font-mono font-medium">
                                Your ID: {visitorHandle}
                              </span>
                            ) : (
                              "Loading visitor id…"
                            )}
                            {" · "}
                            Orders &amp; payments
                          </>
                        ) : (
                          "Orders &amp; payments"
                        )}
                      </p>
                    </div>
                    {notifPerm === "unsupported" ? null : notifPerm ===
                      "granted" ? (
                      <span className="text-[10px] text-text-light shrink-0 px-2 max-w-[7rem] leading-tight text-right">
                        Notifications on
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="text-[10px] text-rose font-medium px-2 py-1 rounded-full border border-rose/40 hover:bg-rose/10 shrink-0"
                        onClick={() => void enableNotifications()}
                      >
                        Enable notifications
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Close"
                      className="p-1.5 rounded-full hover:bg-white/60 shrink-0"
                      onClick={() => setPanelOpen(false)}
                    >
                      <X className="w-5 h-5 text-text-dark" />
                    </button>
                  </div>

                  <div
                    ref={messagesScrollRef}
                    className="flex-1 overflow-y-auto px-4 py-3 space-y-2 bg-gray-50/80 min-h-0"
                  >
                    {loadingMessages && messages.length === 0 ? (
                      <div className="flex justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-rose" />
                      </div>
                    ) : (
                      messages.map((m) => (
                        <div
                          key={m._id}
                          className={`flex ${m.sender === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                              m.sender === "user"
                                ? "bg-rose text-white rounded-br-md"
                                : "bg-white text-text-dark border border-gray-100 rounded-bl-md"
                            }`}
                          >
                            {m.kind === "product_link" ? (
                              <div className="space-y-2">
                                {m.productPreview ? (
                                  <button
                                    type="button"
                                    className={`w-full text-left rounded-xl overflow-hidden border transition-colors ${
                                      m.sender === "user"
                                        ? "border-white/40 bg-white/10 hover:bg-white/15"
                                        : "border-gray-200 bg-gray-50 hover:bg-gray-100"
                                    }`}
                                    onClick={() =>
                                      openProductFromChatUrl(m.body, true)
                                    }
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
                                            m.sender === "user"
                                              ? "bg-white/20"
                                              : "bg-gray-200"
                                          }`}
                                        />
                                      )}
                                      <div className="min-w-0">
                                        <p
                                          className={`font-medium text-sm truncate ${
                                            m.sender === "user"
                                              ? "text-white"
                                              : "text-text-dark"
                                          }`}
                                        >
                                          {m.productPreview.name}
                                        </p>
                                        <p
                                          className={`text-xs ${
                                            m.sender === "user"
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
                                    m.sender === "user"
                                      ? "block text-left underline text-white"
                                      : "block text-left text-rose underline"
                                  }
                                  onClick={() =>
                                    openProductFromChatUrl(m.body, true)
                                  }
                                >
                                  View product
                                </button>
                                <a
                                  href={m.body}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={
                                    m.sender === "user"
                                      ? "block text-[11px] opacity-90 underline"
                                      : "block text-[11px] text-text-light underline"
                                  }
                                >
                                  Open on site
                                </a>
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
                                  m.sender === "user"
                                    ? "text-sm underline text-white text-left"
                                    : "text-sm underline text-rose text-left"
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
                              <div className="space-y-2">
                                <p
                                  className={
                                    m.sender === "user"
                                      ? "text-xs opacity-90 whitespace-pre-wrap break-words"
                                      : "text-xs text-text-light whitespace-pre-wrap break-words"
                                  }
                                >
                                  {m.body}
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPanelOpen(false);
                                    router.push(
                                      `/track?order=${encodeURIComponent(m.orderNumber!)}`
                                    );
                                  }}
                                  className={
                                    m.sender === "user"
                                      ? "w-full text-center py-2 rounded-xl bg-white text-rose font-medium text-sm hover:bg-white/90"
                                      : "w-full text-center py-2 rounded-xl bg-rose text-white font-medium text-sm hover:opacity-95"
                                  }
                                >
                                  Track Order
                                </button>
                              </div>
                            ) : m.kind === "payment_cta" && m.payToken ? (
                              m.offerVoidedAt ? (
                                <div className="space-y-1">
                                  {m.offerProductName && (
                                    <p
                                      className={
                                        m.sender === "user"
                                          ? "text-xs font-semibold text-white/80 line-through"
                                          : "text-xs font-semibold text-text-light line-through"
                                      }
                                    >
                                      {m.offerProductName}
                                    </p>
                                  )}
                                  <p
                                    className={
                                      m.sender === "user"
                                        ? "text-xs text-white/90"
                                        : "text-xs text-text-light"
                                    }
                                  >
                                    This price link was replaced by a newer
                                    offer. Use the latest offer below to pay.
                                  </p>
                                </div>
                              ) : (
                              <div className="space-y-2">
                                {m.offerProductName && (
                                  <p
                                    className={
                                      m.sender === "user"
                                        ? "text-xs font-semibold text-white"
                                        : "text-xs font-semibold text-text-dark"
                                    }
                                  >
                                    {m.offerProductName}
                                  </p>
                                )}
                                {m.offerListPriceRupees != null &&
                                  m.offerRevisedPriceRupees != null && (
                                    <p
                                      className={
                                        m.sender === "user"
                                          ? "text-xs text-white/90"
                                          : "text-xs text-text-light"
                                      }
                                    >
                                      <span className="line-through opacity-80">
                                        ₹{m.offerListPriceRupees}
                                      </span>
                                      <span className="mx-1">→</span>
                                      <span className="font-semibold">
                                        ₹{m.offerRevisedPriceRupees}
                                      </span>
                                    </p>
                                  )}
                                <p
                                  className={
                                    m.sender === "user"
                                      ? "text-xs opacity-90"
                                      : "text-xs text-text-light"
                                  }
                                >
                                  {m.body}
                                </p>
                                {m.offerProductId &&
                                m.offerRevisedPriceRupees != null ? (
                                  <div className="flex flex-col gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => openPaymentProductView(m)}
                                      className={
                                        m.sender === "user"
                                          ? "w-full text-center py-2 rounded-xl border border-white/50 text-white text-sm font-medium hover:bg-white/10"
                                          : "w-full text-center py-2 rounded-xl border border-rose/40 text-rose text-sm font-medium hover:bg-rose/10"
                                      }
                                    >
                                      View product
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => void startNegotiatedCheckout(m)}
                                      className="w-full text-center py-2 rounded-xl bg-rose text-white font-medium text-sm hover:opacity-95"
                                    >
                                      Pay — customise &amp; UPI
                                    </button>
                                  </div>
                                ) : (
                                  <p className="text-[11px] opacity-80">
                                    Ask the shop to resend a price link (this one
                                    is missing product details).
                                  </p>
                                )}
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
                            {m.sender === "user" && (
                              <div className="flex justify-end mt-1 gap-0.5 text-[10px] opacity-80">
                                {m.readAt ? (
                                  <CheckCheck
                                    className="w-3.5 h-3.5"
                                    aria-label="Seen"
                                  />
                                ) : (
                                  <Check
                                    className="w-3.5 h-3.5"
                                    aria-label="Sent"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="px-4 pt-3 pb-[max(0.875rem,env(safe-area-inset-bottom))] border-t border-gray-100 flex items-center gap-2 bg-white shrink-0">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.pdf,.doc,.docx,.txt,.zip,.csv,application/*"
                      onChange={(e) => onPickChatFile(e)}
                    />
                    <button
                      type="button"
                      disabled={sending || !activeThreadId}
                      className="w-11 h-11 rounded-full border border-gray-200 flex items-center justify-center text-text-dark hover:bg-gray-50 disabled:opacity-40 shrink-0 touch-manipulation"
                      aria-label="Attach image or file (max 2 MB)"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip className="w-5 h-5" />
                    </button>
                    <input
                      className="flex-1 min-w-0 min-h-[44px] rounded-full border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-rose focus:ring-1 focus:ring-rose/30"
                      placeholder="Type a message…"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void sendText();
                        }
                      }}
                    />
                    <button
                      type="button"
                      disabled={sending || !draft.trim()}
                      className="w-11 h-11 rounded-full bg-rose text-white flex items-center justify-center disabled:opacity-40 shrink-0 touch-manipulation shadow-sm"
                      aria-label="Send"
                      onClick={() => void sendText()}
                    >
                      {sending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </section>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </CustomerChatContext.Provider>
  );
}
