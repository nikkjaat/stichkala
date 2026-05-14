"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaInstagram, FaComments } from "react-icons/fa";
import { MdOutlineAdminPanelSettings } from "react-icons/md";
import { INSTAGRAM_PROFILE_URL } from "@/lib/siteContact";
import { useCustomerChat } from "@/components/CustomerChat";
import { chatFetch } from "@/lib/chatFetch";

export default function FloatingButtons() {
  const pathname = usePathname();
  const chat = useCustomerChat();
  const [isVisible, setIsVisible] = useState(false);
  const [adminAuthenticated, setAdminAuthenticated] = useState(false);
  const [adminChatUnread, setAdminChatUnread] = useState(0);

  const refreshAdminSession = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/session", { cache: "no-store" });
      const j = (await r.json()) as { authenticated?: boolean };
      setAdminAuthenticated(Boolean(j.authenticated));
    } catch {
      setAdminAuthenticated(false);
    }
  }, []);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  useEffect(() => {
    void refreshAdminSession();
  }, [pathname, refreshAdminSession]);

  useEffect(() => {
    const onFocus = () => void refreshAdminSession();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refreshAdminSession]);

  useEffect(() => {
    const pollAdminUnread =
      adminAuthenticated && !pathname?.startsWith("/secure/admin");
    if (!pollAdminUnread) {
      setAdminChatUnread(0);
      return;
    }
    let cancelled = false;
    const loadAdminUnread = async () => {
      try {
        const r = await chatFetch("/api/chat/admin/unread");
        const j = (await r.json()) as {
          success?: boolean;
          unread?: number;
        };
        if (!cancelled && j.success && typeof j.unread === "number") {
          setAdminChatUnread(j.unread);
        }
      } catch {
        if (!cancelled) setAdminChatUnread(0);
      }
    };
    void loadAdminUnread();
    const id = window.setInterval(() => void loadAdminUnread(), 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pathname, adminAuthenticated]);

  const handleInstagramClick = () => {
    window.open(INSTAGRAM_PROFILE_URL, "_blank", "noopener,noreferrer");
  };

  if (pathname?.startsWith("/secure/admin")) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {adminAuthenticated ? (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: isVisible ? 1 : 0,
            scale: isVisible ? 1 : 0,
          }}
          transition={{ duration: 0.25 }}
        >
          <Link
            href="/secure/admin/vishakha"
            className="w-12 h-12 flex items-center justify-center rounded-full bg-text-dark text-white shadow-lg hover:bg-text-dark/90 transition-colors touch-manipulation"
            title="Admin panel"
            aria-label="Open admin panel"
          >
            <MdOutlineAdminPanelSettings className="text-2xl" />
          </Link>
        </motion.div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0,
        }}
        transition={{ duration: 0.25, delay: adminAuthenticated ? 0.04 : 0 }}
      >
        {adminAuthenticated ? (
          <Link
            href="/secure/admin/vishakha?tab=chats"
            className="relative w-12 h-12 flex items-center justify-center rounded-full bg-rose text-white shadow-lg hover:bg-rose-dark transition-all touch-manipulation"
            title="Chats — visitor messages"
            aria-label="Open admin chats to see visitors"
          >
            <FaComments className="text-xl" />
            {adminChatUnread > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-white text-rose text-[10px] font-bold flex items-center justify-center border-2 border-rose shadow-sm">
                {adminChatUnread > 99 ? "99+" : adminChatUnread}
              </span>
            ) : null}
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => void chat?.openChatPanel()}
            className="relative w-12 h-12 bg-rose text-white rounded-full shadow-lg hover:bg-rose-dark transition-all flex items-center justify-center touch-manipulation"
            title="Chat with StichKala (shop chat)"
            aria-label="Chat with StichKala about orders or payments"
          >
            <FaComments className="text-xl" />
            {(chat?.unreadTotal ?? 0) > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-white text-rose text-[10px] font-bold flex items-center justify-center border-2 border-rose shadow-sm">
                {(chat?.unreadTotal ?? 0) > 9 ? "9+" : chat?.unreadTotal}
              </span>
            ) : null}
          </button>
        )}
      </motion.div>

      <motion.button
        type="button"
        onClick={handleInstagramClick}
        className="w-12 h-12 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center justify-center touch-manipulation"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{
          opacity: isVisible ? 1 : 0,
          scale: isVisible ? 1 : 0,
        }}
        transition={{
          duration: 0.25,
          delay: adminAuthenticated ? 0.08 : 0.05,
        }}
        aria-label="Open StichKala on Instagram"
      >
        <FaInstagram className="text-xl" />
      </motion.button>
    </div>
  );
}
