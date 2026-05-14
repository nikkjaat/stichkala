"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect, useCallback } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import { Download } from "lucide-react";
import ChatNotifToggle from "@/components/ChatNotifToggle";
import {
  isStandaloneDisplayMode,
  isLikelyIosForInstallHint,
} from "@/lib/pwaInstallUtils";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const [deferredInstall, setDeferredInstall] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "All Products" },
    { href: "/track", label: "Track Order" },
    { href: "/#about", label: "About" },
    { href: "/#contact", label: "Contact" },
  ];

  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    setStandalone(isStandaloneDisplayMode());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplayMode()) return;
    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferredInstall(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    const onInstalled = () => {
      setStandalone(true);
    };
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const runInstallOrExplain = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (isStandaloneDisplayMode()) return;
    if (deferredInstall) {
      try {
        await deferredInstall.prompt();
        await deferredInstall.userChoice;
      } catch {
        /* ignore */
      }
      setDeferredInstall(null);
      setIosHelpOpen(false);
      setIsOpen(false);
      return;
    }
    if (isLikelyIosForInstallHint()) {
      setIosHelpOpen(true);
      setIsOpen(false);
      return;
    }
    window.alert(
      "To install this app, open the site in Google Chrome, tap the menu (⋮), then choose Install app or Add to Home screen."
    );
  }, [deferredInstall]);

  // Close navbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setIosHelpOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape" && iosHelpOpen) setIosHelpOpen(false);
    };
    if (iosHelpOpen) {
      document.addEventListener("keydown", onEsc);
      return () => document.removeEventListener("keydown", onEsc);
    }
  }, [iosHelpOpen]);

  // Close navbar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, []);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  const installButtonClass =
    "inline-flex items-center justify-center gap-1.5 rounded-full border-2 border-rose bg-white px-3 py-1.5 text-sm font-semibold text-rose shadow-sm transition-colors hover:bg-rose hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2";

  const installIconOnlyClass =
    "inline-flex items-center justify-center rounded-full border-2 border-rose bg-white p-2 text-rose shadow-sm transition-colors hover:bg-rose hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2";

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-opacity-95 backdrop-blur-sm shadow-sm ${
        isOpen ? "bg-transparent" : "bg-white"
      } transition-colors duration-300`}
      ref={navRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20 gap-2">
          {/* Logo */}
          <Link href="/">
            <motion.div
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative h-10 w-[70px] sm:h-12 sm:w-14 shrink-0">
                <Image
                  src="/logo-512.png"
                  alt="StichKala logo"
                  fill
                  className="object-contain"
                  sizes="70px"
                  priority
                />
              </div>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl text-text-dark ml-2 sm:ml-3">
                StichKala
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation + install */}
          <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <motion.span
                  className="text-text-dark hover:text-rose transition-colors font-medium cursor-pointer text-base xl:text-lg"
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {link.label}
                </motion.span>
              </Link>
            ))}
            {!standalone && deferredInstall ? (
              <motion.button
                type="button"
                className={installButtonClass}
                onClick={() => void runInstallOrExplain()}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                aria-label="Install StichKala app"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                Install app
              </motion.button>
            ) : null}
          </div>

          {/* Mobile: install + menu */}
          <div className="flex items-center gap-1.5 lg:hidden">
            {!standalone ? (
              <motion.button
                type="button"
                className={installIconOnlyClass}
                onClick={() => void runInstallOrExplain()}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                aria-label="Download and install app"
              >
                <Download className="h-5 w-5" aria-hidden />
              </motion.button>
            ) : null}
            <motion.button
              className="text-text-dark p-2 rounded-lg hover:bg-gray-100 transition-colors"
              onClick={() => setIsOpen(!isOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              aria-label="Toggle menu"
            >
              {isOpen ? (
                <HiX className="text-2xl sm:text-3xl" />
              ) : (
                <HiMenu className="text-2xl sm:text-3xl" />
              )}
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden h-screen"
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden border-t border-gray-200 bg-white relative z-50 rounded-lg"
              >
                <div className="flex flex-col space-y-1 py-4 border-b border-gray-200 mx-4">
                  {navLinks.map((link, index) => (
                    <motion.div
                      key={link.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Link href={link.href}>
                        <span
                          className="block py-3 px-4 text-text-dark hover:text-rose hover:bg-gray-50 rounded-lg transition-all font-medium cursor-pointer text-base sm:text-lg"
                          onClick={handleLinkClick}
                        >
                          {link.label}
                        </span>
                      </Link>
                    </motion.div>
                  ))}
                </div>
                {!standalone ? (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    transition={{ delay: navLinks.length * 0.1 }}
                    className="px-4 py-3 mx-4 border-b border-gray-200"
                  >
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose px-4 py-3 text-base font-semibold text-text-dark shadow-md transition-colors hover:bg-rose-dark"
                      onClick={() => void runInstallOrExplain()}
                    >
                      <Download className="h-5 w-5 shrink-0" aria-hidden />
                      Download & install app
                    </button>
                    <p className="mt-2 text-center text-xs text-text-light">
                      Add StichKala to your home screen like a native app
                    </p>
                  </motion.div>
                ) : null}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{
                    delay: (navLinks.length + (!standalone ? 1 : 0)) * 0.1,
                  }}
                  className="px-4 py-4 mx-4 border-b border-gray-200"
                >
                  <p className="text-xs text-text-light mb-2">
                    Shop chat — popup alerts when the tab is in the background
                  </p>
                  <ChatNotifToggle className="w-full justify-between" />
                </motion.div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* iOS Safari: Add to Home Screen instructions */}
      <AnimatePresence>
        {iosHelpOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex min-h-0 items-center justify-center overflow-y-auto bg-black/50 p-4"
            role="dialog"
            aria-modal
            aria-labelledby="ios-install-title"
            onClick={(e) => {
              if (e.target === e.currentTarget) setIosHelpOpen(false);
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="my-auto max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2
                id="ios-install-title"
                className="font-serif text-xl font-semibold text-text-dark"
              >
                Add to Home Screen
              </h2>
              <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm text-text-dark leading-relaxed">
                <li>
                  Tap the <strong>Share</strong> button{" "}
                  <span className="whitespace-nowrap">(square with arrow up)</span>{" "}
                  at the bottom of Safari.
                </li>
                <li>
                  Scroll down and tap <strong>Add to Home Screen</strong>.
                </li>
                <li>
                  Tap <strong>Add</strong> in the top-right corner.
                </li>
              </ol>
              <p className="mt-4 text-xs text-text-light">
                You need Safari on iPhone or iPad. Chrome on iOS may open this in
                Safari — use Share from there if needed.
              </p>
              <button
                type="button"
                className="mt-6 w-full rounded-full bg-rose py-3 text-sm font-semibold text-white hover:bg-rose-dark"
                onClick={() => setIosHelpOpen(false)}
              >
                Got it
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </nav>
  );
}
