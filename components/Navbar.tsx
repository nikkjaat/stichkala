"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { HiMenu, HiX } from "react-icons/hi";
import ChatNotifToggle from "@/components/ChatNotifToggle";

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/products", label: "All Products" },
    { href: "/track", label: "Track Order" },
    { href: "/#about", label: "About" },
    { href: "/#contact", label: "Contact" },
  ];

  // Close navbar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    // Close navbar when pressing Escape key
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      // Prevent body scroll when mobile menu is open
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

  // Close navbar when route changes
  useEffect(() => {
    setIsOpen(false);
  }, []);

  const handleLinkClick = () => {
    setIsOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 bg-opacity-95 backdrop-blur-sm shadow-sm ${
        isOpen ? "bg-transparent" : "bg-white"
      } transition-colors duration-300`}
      ref={navRef}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16 sm:h-20">
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
                  alt="StichKalaa logo"
                  fill
                  className="object-contain"
                  sizes="70px"
                  priority
                />
              </div>
              <span className="font-serif text-xl sm:text-2xl md:text-3xl text-text-dark ml-2 sm:ml-3">
                StichKalaa
              </span>
            </motion.div>
          </Link>

          {/* Desktop Navigation */}
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
          </div>

          {/* Mobile Menu Button */}
          <motion.button
            className="lg:hidden text-text-dark p-2 rounded-lg hover:bg-gray-100 transition-colors"
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

        {/* Mobile Navigation */}
        <AnimatePresence>
          {isOpen && (
            <>
              {/* Backdrop overlay */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="fixed inset-0 bg-black bg-opacity-20 z-40 lg:hidden h-screen"
                onClick={() => setIsOpen(false)}
              />

              {/* Mobile menu */}
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="lg:hidden border-t border-gray-200 bg-white relative z-50  rounded-lg"
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
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  transition={{ delay: navLinks.length * 0.1 }}
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
    </nav>
  );
}
