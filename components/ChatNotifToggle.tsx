"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getChatNotificationsEnabled,
  setChatNotificationsEnabled,
} from "@/lib/chatPushNotification";

type Props = {
  /** Dark text on light admin surfaces */
  variant?: "light" | "dark";
  className?: string;
};

export default function ChatNotifToggle({
  variant = "light",
  className = "",
}: Props) {
  const [on, setOn] = useState(true);

  const sync = useCallback(() => {
    setOn(getChatNotificationsEnabled());
  }, []);

  useEffect(() => {
    sync();
    window.addEventListener("sk-chat-notif-pref", sync);
    return () => window.removeEventListener("sk-chat-notif-pref", sync);
  }, [sync]);

  const labelClass =
    variant === "dark"
      ? "text-[10px] text-gray-300"
      : "text-[10px] text-text-light";
  const onOffClass =
    variant === "dark"
      ? "text-[10px] font-medium text-white"
      : "text-[10px] font-medium text-text-dark";

  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 ${className}`}
      title="Turn chat popup alerts on or off (browser permission still required)"
    >
      <span className={labelClass}>Alerts</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={on ? "Chat alerts on" : "Chat alerts off"}
        onClick={() => {
          const next = !on;
          setOn(next);
          setChatNotificationsEnabled(next);
        }}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-rose focus-visible:ring-offset-2 ${
          on ? "bg-rose" : "bg-gray-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            on ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
      <span className={`w-7 text-right ${onOffClass}`}>{on ? "On" : "Off"}</span>
    </div>
  );
}
